# Fondo

**Cobros simples para comunidades.**

Fondo replaces personal bank accounts, WhatsApp receipts and manual spreadsheets with a shareable collection flow: campaign → selection → local payment → verification → automatic reconciliation → report.

## Demo

The repository includes an immediately usable, clearly labelled local demo. It never represents simulated payments as real transactions. Live checkout is activated only after P2P.me and wallet prerequisites are configured.

Production demo: https://p2pme.vercel.app

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, enter the dashboard, or go directly to `/club-los-andes/rifa-viaje-sub-15`.

## Architecture

- Next.js 16 App Router + React 19 + strict TypeScript
- Tailwind CSS 4 and owned shadcn-style primitives
- Supabase Auth + PostgreSQL + RLS
- `@p2pdotme/sdk@1.2.21`, `@p2pdotme/widgets@1.8.1`, and viem
- Base Sepolia only for development
- Integer minor units for fiat and six-decimal integers for USDC

See [Architecture](docs/ARCHITECTURE.md) and [P2P.me integration](docs/P2P_INTEGRATION.md).

## Product flow

An organizer authenticates, creates a campaign and shares its public URL. A guest participant selects an available raffle number, receives a ten-minute reservation, enters minimal contact details and checks out. A verified payment atomically marks the payment, reservation and number complete. The organizer sees updated KPIs and can export CSV.

The Supabase migration enforces a unique ticket number, one active reservation per ticket, row locks for concurrent reservation, unique provider order IDs and idempotent transactional completion.

## P2P.me integration

Live mode uses the official `Checkout` widget with ARS and `fiatChargeAmount`. The widget reads P2P.me's on-chain pricing, routes to an eligible circle, displays fees/instructions and tracks the official order lifecycle. Fondo supplies the registered integrator transaction, persists order/transaction identifiers and requires server/on-chain verification before database completion.

Current external requirements are documented in [BLOCKERS.md](BLOCKERS.md). API research is recorded in [P2P research](docs/P2P_INTEGRATION_RESEARCH.md).

## Environment variables

Copy `.env.example`. Supabase needs its public URL/anon key server-side service-role key. Live P2P.me needs the current Base Sepolia RPC, subgraph, Diamond, USDC, registered integrator and client addresses plus an embedded-wallet provider account. No secrets belong in `NEXT_PUBLIC_*` variables.

## Database

Create a Supabase project and apply `supabase/migrations/202608270001_initial_schema.sql` through the CLI or SQL editor. Enable an Auth email provider and set the site/redirect URLs to the local and Vercel URLs. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

Import `https://github.com/Fabit77/p2pme` into Vercel, use Node.js 22, add the environment variables, and deploy from `main`. Preview deployments should stay on Base Sepolia and use separate Supabase credentials if possible.

## Compliance

Fondo is designed for traceability and reconciliation. It does not avoid KYC/AML controls, hide source of funds or bypass banking limits. Organizers remain responsible for permissions applicable to regulated local activities.

## Hackathon material

- [Demo script](docs/DEMO_SCRIPT.md)
- [Deck outline](docs/DECK_OUTLINE.md)
- [Submission draft](docs/HACKATHON_SUBMISSION.md)
- [Live test checklist](docs/P2P_LIVE_TEST.md)
