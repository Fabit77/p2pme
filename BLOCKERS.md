# Blockers

## Live P2P.me payment — BLOCKED externally

- Fondo needs a Base Sepolia integrator and client contract address registered with P2P.me.
- P2P.me must confirm current Diamond, USDC, subgraph and ARS routing/circle configuration.
- The team must provision an embedded-wallet account/app ID and decide whether gas sponsorship is enabled.

Code readiness: exact widget v1.8.1 adapter, fiat-denominated checkout, state mapping, recovery identifiers, idempotent database completion and environment validation are implemented. Mock mode is visibly labelled and never produces a fake transaction hash.

## Supabase/Vercel — NEEDS PROJECT CREDENTIALS

The schema, RLS and clients are ready. A Supabase project and Vercel project have not been created because no account credentials or connections were supplied.
