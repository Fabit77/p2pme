# Blockers

## Live P2P.me payment — BLOCKED externally

- Fondo needs a Base Sepolia integrator and client contract address registered with P2P.me.
- P2P.me must confirm current Diamond, USDC, subgraph and ARS routing/circle configuration.
- The team must provision an embedded-wallet account/app ID and decide whether gas sponsorship is enabled.

Code readiness: exact widget v1.8.1 adapter, fiat-denominated checkout, state mapping, recovery identifiers, idempotent database completion and environment validation are implemented. Mock mode is visibly labelled and never produces a fake transaction hash.

## Supabase — NEEDS PROJECT CREDENTIALS

The schema, RLS and clients are ready. A hosted Supabase project has not been configured because no project credentials were supplied. The web demo is deployed to Vercel in mock mode.
