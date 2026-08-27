# P2P.me integration blockers

## Integrator registration

Need: a Fondo-compatible integrator contract deployed on Base Sepolia and registered on the P2P Diamond.

Why: the widget orchestrates checkout but does not deploy or register host business logic.

Configure: `NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS` and `NEXT_PUBLIC_P2P_CLIENT_ADDRESS`.

Send P2P.me: the deployed integrator address and intended USDC-through-integrator behavior. Ask the team to call its current `B2BGatewayFacet.registerIntegrator` process and confirm the proxy implementation.

## Base Sepolia environment

Need from P2P.me: current Diamond, supported USDC, subgraph URL, ARS circle/routing availability, and RPC recommendation. Configure the matching `NEXT_PUBLIC_P2P_*` values.

## Wallet/sponsorship

Need: an embedded-wallet application ID and sponsorship/paymaster policy compatible with the registered integrator. The app exposes the official `CheckoutSigner` boundary but does not commit a secret or select a vendor account on behalf of the team.
