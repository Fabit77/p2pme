# P2P.me live test

1. Create a Supabase project and apply `supabase/migrations`.
2. Use the validated Base Sepolia RPC, Diamond, USDC and subgraph values from `.env.example`.
3. Use the deployed and whitelisted Fondo integrator from `.env.example`; do not deploy another copy.
4. Apply `supabase/migrations/202608290001_secure_payment_sessions.sql` and configure `SUPABASE_SERVICE_ROLE_KEY` server-side in Vercel.
5. Provision an embedded wallet and test gas sponsorship policy. Until then, an injected Base Sepolia wallet can be used for developer testing.
6. Set `NEXT_PUBLIC_P2P_MODE=live` and all values from `.env.example` in the deployment environment.
7. Create/publish a campaign and reserve an available number.
8. Start checkout in ARS and verify that the displayed rate/fee comes from the widget.
9. Confirm a real P2P.me order ID is persisted before navigating away.
10. Complete the local payment and wait for on-chain `COMPLETED`.
11. Verify the Base Sepolia receipt, USDC settlement, idempotent database payment, paid ticket, dashboard count and printable receipt.

Never run this checklist on mainnet automatically.
