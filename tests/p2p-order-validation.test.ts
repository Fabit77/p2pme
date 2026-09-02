import { describe, expect, it } from "vitest";
import { stringToHex, type Address } from "viem";
import { assertCompletedOrder, type CompletedOrderEvidence } from "@/lib/p2p/order-validation";

const payer = "0x1111111111111111111111111111111111111111" as Address;
const integrator = "0x2222222222222222222222222222222222222222" as Address;
const treasury = "0x3333333333333333333333333333333333333333" as Address;

function evidence(overrides: Partial<CompletedOrderEvidence> = {}): CompletedOrderEvidence {
  return {
    orderId: "42",
    expectedFiatAmount: 15_000_000000n,
    expectedPayer: payer,
    expectedIntegrator: integrator,
    expectedTreasury: treasury,
    actualTreasury: treasury,
    transactionFrom: payer,
    transactionTo: integrator,
    receiptOrderId: "42",
    order: { id: 42n, status: 3, amount: 15_000000n, currency: stringToHex("ARS", { size: 32 }), recipientAddr: integrator },
    actualFiatAmount: 15_000_000000n,
    ...overrides,
  };
}

describe("assertCompletedOrder", () => {
  const sponsored = () => evidence({
    transactionFrom: treasury, transactionTo: treasury,
    placement: { emitter: integrator, orderId: "42", user: payer, amount: 15_000000n, currency: stringToHex("ARS", { size: 32 }) },
    integratorSession: { user: payer, fulfilled: true, cancelled: false, amount: 15_000000n, currency: stringToHex("ARS", { size: 32 }) },
  });

  it("verifies sponsored transactions using authenticated integrator evidence, not the relayer", () => {
    expect(assertCompletedOrder(sponsored())).toEqual({ usdcAmountMicro: 15_000000n });
  });

  it("rejects a spoofed integrator event", () => {
    const input = sponsored();
    input.placement!.emitter = treasury;
    expect(() => assertCompletedOrder(input)).toThrow("no proviene");
  });

  it("rejects a sponsored order owned by another payer", () => {
    const input = sponsored();
    input.placement!.user = treasury;
    expect(() => assertCompletedOrder(input)).toThrow("no coincide con la sesión");
  });

  it("does not credit a completed Diamond order if treasury settlement failed", () => {
    const input = sponsored();
    input.integratorSession!.fulfilled = false;
    expect(() => assertCompletedOrder(input)).toThrow("liquidación a la tesorería");
  });

  it("requires integrator session evidence for sponsored transactions", () => {
    const input = sponsored();
    delete input.integratorSession;
    expect(() => assertCompletedOrder(input)).toThrow("liquidación a la tesorería");
  });

  it("accepts matching completed on-chain evidence", () => {
    expect(assertCompletedOrder(evidence())).toEqual({ usdcAmountMicro: 15_000000n });
  });

  it("rejects incomplete orders", () => {
    expect(() => assertCompletedOrder(evidence({ order: { ...evidence().order, status: 2 } }))).toThrow("todavía no está completada");
  });

  it("rejects another integrator", () => {
    expect(() => assertCompletedOrder(evidence({ transactionTo: treasury }))).toThrow("integrador de Fondo");
  });

  it("rejects another payer", () => {
    expect(() => assertCompletedOrder(evidence({ transactionFrom: treasury }))).toThrow("wallet pagadora");
  });

  it("rejects another on-chain recipient", () => {
    expect(() => assertCompletedOrder(evidence({ order: { ...evidence().order, recipientAddr: payer } }))).toThrow("destinatario on-chain");
  });

  it("rejects an integrator wired to another treasury", () => {
    expect(() => assertCompletedOrder(evidence({ actualTreasury: payer }))).toThrow("tesorería inmutable");
  });

  it("rejects a mismatched fiat amount", () => {
    expect(() => assertCompletedOrder(evidence({ actualFiatAmount: 14_999_000000n }))).toThrow("monto on-chain");
  });

  it("accepts sub-cent downward conversion dust after all settlement checks", () => {
    expect(assertCompletedOrder(evidence({ actualFiatAmount: 15_000_000000n - 1_383n }))).toEqual({ usdcAmountMicro: 15_000000n });
  });

  it.each([1n, -5_000n, -10_000n])("rejects overpayment or a meaningful shortfall (%s)", (difference) => {
    expect(() => assertCompletedOrder(evidence({ actualFiatAmount: 15_000_000000n + difference }))).toThrow("monto on-chain");
  });
});
