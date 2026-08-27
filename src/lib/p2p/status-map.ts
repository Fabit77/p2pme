import { OrderStatus } from "@p2pdotme/widgets";
import type { PaymentRailStatus } from "@/lib/p2p/types";

export const P2P_STATUS_MAP: Record<OrderStatus, PaymentRailStatus> = {
  [OrderStatus.PLACED]: "CREATED",
  [OrderStatus.ACCEPTED]: "WAITING_FOR_PAYMENT",
  [OrderStatus.PAID]: "PAYMENT_REPORTED",
  [OrderStatus.COMPLETED]: "COMPLETED",
  [OrderStatus.CANCELLED]: "CANCELLED",
};

export function mapP2PStatus(status: OrderStatus): PaymentRailStatus { return P2P_STATUS_MAP[status]; }
