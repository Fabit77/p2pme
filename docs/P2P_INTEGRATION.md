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

The frontend completion callback is a UX signal, never sole proof of payment. `provider_order_id` is unique and the database function returns the existing payment for repeated events.

Settlement is USDC on Base Sepolia to the client/treasury behavior implemented by the registered integrator contract.
