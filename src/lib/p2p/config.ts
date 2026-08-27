import { z } from "zod";

const address = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const liveSchema = z.object({
  NEXT_PUBLIC_P2P_RPC_URL: z.string().url(),
  NEXT_PUBLIC_P2P_SUBGRAPH_URL: z.string().url(),
  NEXT_PUBLIC_P2P_DIAMOND_ADDRESS: address,
  NEXT_PUBLIC_P2P_USDC_ADDRESS: address,
  NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS: address,
  NEXT_PUBLIC_P2P_CLIENT_ADDRESS: address,
});

export function getP2PLiveConfig() {
  return liveSchema.parse({
    NEXT_PUBLIC_P2P_RPC_URL: process.env.NEXT_PUBLIC_P2P_RPC_URL,
    NEXT_PUBLIC_P2P_SUBGRAPH_URL: process.env.NEXT_PUBLIC_P2P_SUBGRAPH_URL,
    NEXT_PUBLIC_P2P_DIAMOND_ADDRESS: process.env.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS,
    NEXT_PUBLIC_P2P_USDC_ADDRESS: process.env.NEXT_PUBLIC_P2P_USDC_ADDRESS,
    NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS: process.env.NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS,
    NEXT_PUBLIC_P2P_CLIENT_ADDRESS: process.env.NEXT_PUBLIC_P2P_CLIENT_ADDRESS,
  });
}
