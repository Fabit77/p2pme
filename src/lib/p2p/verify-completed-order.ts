import "server-only";
import { DIAMOND_ABI } from "@p2pdotme/widgets";
import { createPublicClient, http, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { getP2PLiveConfig } from "@/lib/p2p/config";
import { INTEGRATOR_TREASURY_ABI } from "@/lib/p2p/integrator-abi";
import { assertCompletedOrder } from "@/lib/p2p/order-validation";
import { FONDO_EVIDENCE_ABI, findIntegratorPlacement } from "@/lib/p2p/placement-evidence";

export interface VerifyCompletedOrderInput {
  orderId: string;
  txHash: Hex;
  payerWalletAddress: Address;
  intendedLocalAmountMinor: bigint;
}

export async function verifyCompletedP2POrder(input: VerifyCompletedOrderInput) {
  const config = getP2PLiveConfig();
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(config.NEXT_PUBLIC_P2P_RPC_URL) });
  const orderId = BigInt(input.orderId);
  const [order, details, receipt, transaction, treasury, session] = await Promise.all([
    publicClient.readContract({ address: config.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS as Address, abi: DIAMOND_ABI, functionName: "getOrdersById", args: [orderId] }),
    publicClient.readContract({ address: config.NEXT_PUBLIC_P2P_DIAMOND_ADDRESS as Address, abi: DIAMOND_ABI, functionName: "getAdditionalOrderDetails", args: [orderId] }),
    publicClient.getTransactionReceipt({ hash: input.txHash }),
    publicClient.getTransaction({ hash: input.txHash }),
    publicClient.readContract({ address: config.NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS as Address, abi: INTEGRATOR_TREASURY_ABI, functionName: "treasury" }),
    publicClient.readContract({ address: config.NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS as Address, abi: FONDO_EVIDENCE_ABI, functionName: "sessions", args: [orderId] }),
  ]);
  if (receipt.status !== "success") throw new Error("La transacción del integrador no fue exitosa.");
  const placement = findIntegratorPlacement(receipt.logs, config.NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS as Address, input.payerWalletAddress, input.orderId);
  return assertCompletedOrder({
    orderId: input.orderId,
    expectedFiatAmount: input.intendedLocalAmountMinor * 10_000n,
    expectedPayer: input.payerWalletAddress,
    expectedIntegrator: config.NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS as Address,
    expectedTreasury: config.NEXT_PUBLIC_P2P_TREASURY_ADDRESS as Address,
    actualTreasury: treasury,
    transactionFrom: transaction.from,
    transactionTo: transaction.to,
    receiptOrderId: placement.orderId,
    placement,
    integratorSession: { user: session[0], fulfilled: session[1], cancelled: session[2], amount: session[4], currency: session[5] },
    order: {
      id: order.id,
      status: Number(order.status),
      amount: order.amount,
      currency: order.currency,
      recipientAddr: order.recipientAddr,
    },
    actualFiatAmount: details.actualFiatAmount,
  });
}
