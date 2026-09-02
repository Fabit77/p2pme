import { hexToString, type Address, type Hex } from "viem";
import type { IntegratorPlacement } from "./placement-evidence";

export interface CompletedOrderEvidence {
  orderId: string;
  expectedFiatAmount: bigint;
  expectedPayer: Address;
  expectedIntegrator: Address;
  expectedTreasury: Address;
  actualTreasury: Address;
  transactionFrom: Address;
  transactionTo: Address | null;
  receiptOrderId: string | null;
  placement?: IntegratorPlacement;
  integratorSession?: { user: Address; fulfilled: boolean; cancelled: boolean; amount: bigint; currency: Hex };
  order: { id: bigint; status: number; amount: bigint; currency: Hex; recipientAddr: Address };
  actualFiatAmount: bigint;
}

export function assertCompletedOrder(input: CompletedOrderEvidence) {
  if (input.order.status !== 3) throw new Error("La orden todavía no está completada on-chain.");
  if (input.order.id.toString() !== input.orderId || input.receiptOrderId !== input.orderId) throw new Error("La orden no coincide con la transacción registrada.");
  if (input.placement) {
    const placed = input.placement;
    if (placed.emitter.toLowerCase() !== input.expectedIntegrator.toLowerCase()) throw new Error("El evento no proviene del integrador de Fondo.");
    if (placed.orderId !== input.orderId || placed.user.toLowerCase() !== input.expectedPayer.toLowerCase()) throw new Error("El evento de pago no coincide con la sesión.");
    if (placed.amount !== input.order.amount || placed.currency !== input.order.currency) throw new Error("El evento no coincide con el monto y moneda de la orden.");
    const session = input.integratorSession;
    if (!session?.fulfilled || session.cancelled) throw new Error("El integrador todavía no confirmó la liquidación a la tesorería.");
    if (session.user.toLowerCase() !== input.expectedPayer.toLowerCase() || session.amount !== placed.amount || session.currency !== placed.currency) throw new Error("La sesión del integrador no coincide con el pago.");
  } else {
    if (input.transactionTo?.toLowerCase() !== input.expectedIntegrator.toLowerCase()) throw new Error("La transacción no fue enviada al integrador de Fondo.");
    if (input.transactionFrom.toLowerCase() !== input.expectedPayer.toLowerCase()) throw new Error("La wallet pagadora no coincide con la sesión.");
  }
  if (input.order.recipientAddr.toLowerCase() !== input.expectedIntegrator.toLowerCase()) throw new Error("El destinatario on-chain no corresponde al integrador de Fondo.");
  if (input.actualTreasury.toLowerCase() !== input.expectedTreasury.toLowerCase()) throw new Error("La tesorería inmutable del integrador no corresponde a Fondo.");
  if (hexToString(input.order.currency).replace(/\0/g, "") !== "ARS") throw new Error("La moneda on-chain no corresponde a ARS.");
  if (input.actualFiatAmount !== input.expectedFiatAmount) throw new Error("El monto on-chain no coincide con la reserva.");
  if (input.order.amount <= 0n) throw new Error("La orden completada no contiene un monto USDC válido.");
  return { usdcAmountMicro: input.order.amount };
}
