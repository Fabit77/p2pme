# P2P.me integration research

Research date: 2026-08-27.

## Official sources inspected

- `p2pdotme/p2pdotme-sdk` README and installed TypeScript declarations.
- `p2pdotme/widgets` README and installed TypeScript declarations.
- npm packages `@p2pdotme/sdk@1.2.21` and `@p2pdotme/widgets@1.8.1`.
- The official widgets integrator example for Base Sepolia.

## Verified API

`@p2pdotme/widgets/checkout` exports `Checkout`. The v1.8.1 widget accepts a `CheckoutSigner`, `currencies`, `placeOrder`, `diamondAddress`, `rpcUrl`, `subgraphUrl`, `usdcAddress`, and exactly one of `usdcAmount` or `fiatChargeAmount`. `fiatChargeAmount` is denominated with six decimals and is converted using P2P.me's on-chain price config. The callback receives the routed `circleId`, resolved USDC amount, and gross fiat amount.

The official SDK lists ARS as supported. The widget performs circle routing, price/fee display, payment-detail exchange, countdown, status polling, cancellation and completion UX. The host must submit its own integrator transaction and return `{ orderId, txHash }`.

## Contract requirements

The example uses `userPlaceOrder(client, productId, quantity, currency, circleId, pubKey, preferredPaymentChannelConfigId, fiatAmountLimit)`. An integrator must be deployed and registered by a P2P.me super-admin through `B2BGatewayFacet.registerIntegrator`. Exact deployment addresses must come from P2P.me; none are guessed in this repository.

## Decision

Use the official checkout widget in live mode, `fiatChargeAmount` for the ARS-first product, SDK relay identity helpers, and Base Sepolia. The app records `onOrderPlaced` for recovery, but only the server-side/on-chain verification path may call the transactional completion function.
