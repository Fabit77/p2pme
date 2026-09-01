import { expect } from "chai";
import { ethers } from "hardhat";

describe("FondoTreasuryIntegrator", function () {
  const USDC = (value: number) => ethers.parseUnits(value.toString(), 6);
  const ARS = ethers.encodeBytes32String("ARS");
  const MAX_TX_AMOUNT = USDC(1_000);
  const DAILY_TX_COUNT_LIMIT = 10;

  async function deployFixture() {
    const [owner, user, treasury, outsider] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    const MockDiamond = await ethers.getContractFactory("MockDiamond");
    const diamond = await MockDiamond.deploy(await usdc.getAddress());

    const FondoIntegrator = await ethers.getContractFactory("FondoTreasuryIntegrator");
    const integrator = await FondoIntegrator.deploy(
      await diamond.getAddress(),
      await usdc.getAddress(),
      treasury.address,
      MAX_TX_AMOUNT,
      DAILY_TX_COUNT_LIMIT
    );

    await diamond.registerIntegrator(
      await integrator.getAddress(),
      await integrator.proxyImpl()
    );
    await diamond.setUsdcThroughIntegrator(true);
    await usdc.mint(await diamond.getAddress(), USDC(100_000));

    return { owner, user, treasury, outsider, usdc, diamond, integrator };
  }

  async function placeOrder(integrator: any, user: any, amount = USDC(25)) {
    return integrator.connect(user).userPlaceOrder(amount, ARS, 1, "", 0, 0);
  }

  it("pins the treasury and canonical proxy implementation at deployment", async function () {
    const { treasury, integrator } = await deployFixture();
    expect(await integrator.treasury()).to.equal(treasury.address);
    expect(await integrator.proxyImpl()).not.to.equal(ethers.ZeroAddress);
  });

  it("forwards every completed order to the immutable Fondo treasury", async function () {
    const { user, treasury, usdc, diamond, integrator } = await deployFixture();
    const amount = USDC(25);

    await expect(placeOrder(integrator, user, amount))
      .to.emit(integrator, "OrderPlaced")
      .withArgs(1, user.address, amount, ARS);

    await expect(diamond.simulateOrderComplete(1))
      .to.emit(integrator, "OrderCompleted")
      .withArgs(1, user.address, amount, treasury.address);

    expect(await usdc.balanceOf(treasury.address)).to.equal(amount);
    expect(await usdc.balanceOf(await integrator.getAddress())).to.equal(0);
  });

  it("uses a dynamic amount for each checkout", async function () {
    const { user, diamond, integrator } = await deployFixture();
    await placeOrder(integrator, user, USDC(3.5));
    const order = await diamond.orders(1);
    expect(order.amount).to.equal(USDC(3.5));
    expect(order.recipientAddr).to.equal(await integrator.getAddress());
  });

  it("rejects zero and over-limit orders", async function () {
    const { user, integrator } = await deployFixture();
    await expect(placeOrder(integrator, user, 0n)).to.be.revertedWithCustomError(
      integrator,
      "InvalidAmount"
    );
    await expect(placeOrder(integrator, user, USDC(1_001))).to.be.reverted;
  });

  it("rejects a Diamond that tampers with the validated amount", async function () {
    const { user, diamond, integrator } = await deployFixture();
    await diamond.setTamperValidationAmount(true);
    await expect(placeOrder(integrator, user)).to.be.reverted;
  });

  it("rejects skipped and duplicate validation callbacks", async function () {
    const { user, diamond, integrator } = await deployFixture();

    await diamond.setSkipValidation(true);
    await expect(placeOrder(integrator, user)).to.be.revertedWithCustomError(
      integrator,
      "MissingValidation"
    );

    await diamond.setSkipValidation(false);
    await diamond.setDoubleValidate(true);
    await expect(placeOrder(integrator, user)).to.be.reverted;
  });

  it("releases the daily slot when an order is cancelled", async function () {
    const { user, diamond, integrator } = await deployFixture();
    await placeOrder(integrator, user);
    expect(await integrator.userDailyCount(user.address, Math.floor(Date.now() / 86_400_000))).to.equal(1);

    await expect(diamond.simulateOrderCancelled(1))
      .to.emit(integrator, "OrderCancelled")
      .withArgs(1, user.address);
    expect(await integrator.getRemainingDailyCount(user.address)).to.equal(
      DAILY_TX_COUNT_LIMIT
    );

    await expect(diamond.simulateOrderCancelled(1)).to.be.revertedWith("Already cancelled");
  });

  it("enforces the daily transaction-count limit", async function () {
    const { user, diamond, integrator } = await deployFixture();
    await integrator.setDailyTxCountLimit(2);
    await placeOrder(integrator, user);
    await placeOrder(integrator, user);
    await expect(placeOrder(integrator, user)).to.be.reverted;
    expect(await integrator.getRemainingDailyCount(user.address)).to.equal(0);
    expect((await diamond.orders(1)).user).to.equal(user.address);
  });

  it("allows only the owner to update non-zero limits", async function () {
    const { owner, outsider, integrator } = await deployFixture();
    await expect(integrator.connect(outsider).setMaxTxAmount(USDC(2_000)))
      .to.be.revertedWithCustomError(integrator, "OnlyOwner");
    await expect(integrator.setMaxTxAmount(0)).to.be.revertedWithCustomError(
      integrator,
      "InvalidLimit"
    );
    await expect(integrator.setMaxTxAmount(USDC(2_000)))
      .to.be.revertedWithCustomError(integrator, "LimitExceedsCeiling");
    await expect(integrator.setMaxTxAmount(USDC(500)))
      .to.emit(integrator, "MaxTxAmountUpdated")
      .withArgs(USDC(500));
    expect(await integrator.owner()).to.equal(owner.address);
  });

  it("recovers stranded USDC only to the immutable treasury", async function () {
    const { user, treasury, outsider, usdc, integrator } = await deployFixture();
    const amount = USDC(7);
    await usdc.mint(await integrator.getAddress(), amount);

    await expect(integrator.connect(outsider).recoverStrandedUsdc())
      .to.be.revertedWithCustomError(integrator, "OnlyOwner");
    await expect(integrator.recoverStrandedUsdc())
      .to.emit(integrator, "StrandedUsdcRecovered")
      .withArgs(amount, treasury.address);
    expect(await usdc.balanceOf(treasury.address)).to.equal(amount);
    expect(await usdc.balanceOf(user.address)).to.equal(0);
  });
});
