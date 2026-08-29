# P2P.me integration

Fondo isolates payment infrastructure in `src/lib/p2p` and `src/components/p2p`.

1. A participant reserves a ticket atomically in Postgres.
2. Fondo creates a payment session with the intended ARS amount.
3. `Checkout` requests a live ARS quote and route from P2P.me.
4. `LiveP2PCheckout` calls the registered integrator contract on Base Sepolia.
5. The widget tracks `PLACED → ACCEPTED → PAID → COMPLETED`.
6. `onOrderPlaced` persists the order ID and transaction hash for recovery.
7. A trusted server verification reads the official state/on-chain receipt.
8. `complete_verified_payment` atomically and idempotently records the payment, marks the ticket paid, completes the reservation, and writes an audit event.

The public checkout creates its payment session through `create_checkout_payment_session`, which proves that every reservation belongs to the same unguessable participant session before accepting participant data. `record_p2p_order` persists the order, transaction hash and payer wallet without granting the browser permission to complete a payment.

`POST /api/p2p/verify` is the only completion path. It uses a server-only Supabase service-role key and verifies the Diamond status, receipt event, integrator, payer, client recipient, ARS amount and USDC amount before invoking `complete_verified_payment`. A UUID receipt token exposes only the completed payment receipt, never organizer data.

The frontend completion callback is a UX signal, never sole proof of payment. `provider_order_id` is unique and the database function returns the existing payment for repeated events.

Settlement is USDC on Base Sepolia to the client/treasury behavior implemented by the registered integrator contract.
