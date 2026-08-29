import { hexToString, type Address, type Hex } from "viem";

export interface CompletedOrderEvidence {
  orderId: string;
  expectedFiatAmount: bigint;
  expectedPayer: Address;
  expectedIntegrator: Address;
  expectedClient: Address;
  transactionFrom: Address;
  transactionTo: Address | null;
  receiptOrderId: string | null;
  order: { id: bigint; status: number; amount: bigint; currency: Hex; recipientAddr: Address };
  actualFiatAmount: bigint;
}

export function assertCompletedOrder(input: CompletedOrderEvidence) {
  if (input.order.status !== 3) throw new Error("La orden todavía no está completada on-chain.");
  if (input.order.id.toString() !== input.orderId || input.receiptOrderId !== input.orderId) throw new Error("La orden no coincide con la transacción registrada.");
  if (input.transactionTo?.toLowerCase() !== input.expectedIntegrator.toLowerCase()) throw new Error("La transacción no fue enviada al integrador de Fondo.");
  if (input.transactionFrom.toLowerCase() !== input.expectedPayer.toLowerCase()) throw new Error("La wallet pagadora no coincide con la sesión.");
  if (input.order.recipientAddr.toLowerCase() !== input.expectedClient.toLowerCase()) throw new Error("El destinatario on-chain no corresponde a Fondo.");
  if (hexToString(input.order.currency).replace(/\0/g, "") !== "ARS") throw new Error("La moneda on-chain no corresponde a ARS.");
  if (input.actualFiatAmount !== input.expectedFiatAmount) throw new Error("El monto on-chain no coincide con la reserva.");
  if (input.order.amount <= 0n) throw new Error("La orden completada no contiene un monto USDC válido.");
  return { usdcAmountMicro: input.order.amount };
}
