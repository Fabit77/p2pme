import { decodeEventLog, parseAbi, type Address, type Hex, type Log } from "viem";

export const FONDO_EVIDENCE_ABI = parseAbi([
  "event OrderPlaced(uint256 indexed orderId, address indexed user, uint256 amount, bytes32 indexed currency)",
  "function sessions(uint256) view returns (address user, bool fulfilled, bool cancelled, uint32 placementDay, uint256 usdcAmount, bytes32 currency)",
]);

export interface IntegratorPlacement {
  emitter: Address; orderId: string; user: Address; amount: bigint; currency: Hex;
}

export function findIntegratorPlacement(logs: Pick<Log, "address" | "data" | "topics">[], integrator: Address, payer: Address, orderId?: string): IntegratorPlacement {
  const matches: IntegratorPlacement[] = [];
  for (const log of logs) {
    if (log.address.toLowerCase() !== integrator.toLowerCase()) continue;
    try {
      const event = decodeEventLog({ abi: FONDO_EVIDENCE_ABI, eventName: "OrderPlaced", data: log.data, topics: log.topics });
      if (event.args.user.toLowerCase() !== payer.toLowerCase()) continue;
      if (orderId && event.args.orderId.toString() !== orderId) continue;
      matches.push({ emitter: log.address, orderId: event.args.orderId.toString(), user: event.args.user, amount: event.args.amount, currency: event.args.currency });
    } catch { /* Other integrator events are not placement evidence. */ }
  }
  if (matches.length !== 1) throw new Error("No se encontró una única orden de Fondo para esta sesión en la transacción.");
  return matches[0];
}
