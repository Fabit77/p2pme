# P2P.me integration status

## Base Sepolia ready

- Diamond: `0xeb0BB8E3c014D915D9B2df03aBB130a1Fb44beb9`
- USDC: `0x4095fE4f1E636f11A95820BA2bB87F335Bd1040d`
- Fondo integrator: `0x82Ec641720dA381C88aB351f9bDA4edfa06e9aeA`
- Immutable treasury: `0xA3B2BD9d16030d31b82B3E5a084f1A736ed9F769`
- Registration: whitelisted by P2P.me with test merchants available
- Settlement mode: `usdcThroughIntegrator = true`

The deployed contract has been checked on-chain against the expected Diamond,
USDC, treasury, proxy implementation, owner, order limit and daily limit.

## Remaining test

Run one complete ARS test order with an injected Base Sepolia wallet. Confirm
that the order reaches `COMPLETED`, test USDC lands in the immutable treasury,
the payment is credited once in Supabase, and the reserved raffle numbers become
sold. The wallet signs locally; no private key is stored by Fondo.

## Later hardening

The public Base Sepolia RPC is suitable for the hackathon test but rate-limited.
Before production-scale traffic, use a dedicated RPC and provision an embedded
wallet/paymaster flow so participants do not need an injected wallet.
