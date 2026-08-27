# Architecture

```text
Participant / Organizer
          |
          v
 Next.js App Router
    |           |
    v           v
 Supabase     P2P.me widgets + SDK
 PostgreSQL       |
 Auth + RLS       v
 Atomic RPC   Local payment rail
                    |
                    v
              USDC on Base Sepolia
                    |
                    v
             Community treasury
```

Server Components own route shells and metadata. Client components provide the number grid and recoverable checkout interaction. Supabase is the source of truth in configured environments; RLS isolates organizer data while public policies expose only published campaign/ticket availability. Security-definer RPCs make reservation and completion atomic.

Payment code is isolated behind a `PaymentRail` contract. The live adapter uses the official P2P.me widget; the mock adapter exists only for development/tests and is disclosed in the UI. Money is stored as integer minor units (fiat) or micro-USDC.
