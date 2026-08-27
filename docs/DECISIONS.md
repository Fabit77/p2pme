# Decisions

## Fiat-first checkout

Decision: use the widget's `fiatChargeAmount` API for ARS. Why: organizers price in local currency and the widget derives USDC from P2P.me's on-chain configuration. Tradeoff: checkout cannot proceed if price reads are unavailable, which is safer than guessing.

## Embedded wallet boundary

Decision: depend only on the official `CheckoutSigner` interface until the team provisions a provider. Preferred implementation is Privy embedded wallet with sponsorship if P2P.me confirms compatibility. Alternative: injected viem wallet for developer testing. Tradeoff: live checkout is blocked until account credentials exist.

## Demo persistence

Decision: use clearly labelled browser-local demo data while Supabase credentials are absent. Why: judges can exercise the product immediately without mistaking simulated payments for real ones. Real concurrency/payment integrity remains implemented in PostgreSQL RPCs.
