# Fondo P2P treasury integrator

This directory contains the Fondo-specific contribution prepared against
[p2pdotme/payment-integrators](https://github.com/p2pdotme/payment-integrators)
at commit `89de2210aabf47815a082c00a24b8ba7a3a96664`.

## Settlement model

- Immutable treasury: `0xA3B2BD9d16030d31b82B3E5a084f1A736ed9F769`
- Base Sepolia Diamond: `0xeb0BB8E3c014D915D9B2df03aBB130a1Fb44beb9`
- Base Sepolia USDC: `0x4095fE4f1E636f11A95820BA2bB87F335Bd1040d`
- Registration mode: `usdcThroughIntegrator = true`
- The deployer wallet only pays deployment gas and becomes the limit-policy owner.
  It is not the settlement destination.

## Verified configuration

The isolated test suite passes 13 Fondo-specific and repository conformance
checks with:

- maximum per-order ceiling: 1,000 USDC
- maximum configurable daily order-count ceiling: 100
- suggested initial maximum per order: 1,000 USDC
- suggested initial daily order count: 100

## Upstream placement

Copy the contract and test into the same paths in the official repository:

- `contracts/integrators/fondo/FondoTreasuryIntegrator.sol`
- `test/fondo-treasury-integrator.test.ts`

Then run:

```bash
npm test -- --grep FondoTreasuryIntegrator
```

Deployment must be signed locally by the deployer wallet. Never commit or share
a private key or seed phrase. After deployment and Basescan verification, send
P2P.me the deployed integrator address and the value returned by `proxyImpl()`
so they can register and whitelist it.
