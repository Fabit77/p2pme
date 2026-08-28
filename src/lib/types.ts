import type { FiatCurrency } from "@/lib/money";

export type TicketStatus = "AVAILABLE" | "RESERVED" | "PAID";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type PaymentStatus = "CREATED" | "WAITING_FOR_PAYMENT" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "FAILED";

export interface Ticket {
  id: string;
  number: number;
  status: TicketStatus;
  reservationId?: string;
  reservedUntil?: string;
  paymentId?: string;
}

export interface Campaign {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  type: "RAFFLE" | "COLLECTION";
  title: string;
  slug: string;
  description: string;
  status: CampaignStatus;
  currency: FiatCurrency;
  priceMinor: number;
  goalMinor: number;
  ticketCount: number;
  endsAt?: string;
  createdAt: string;
  tickets: Ticket[];
}

export interface Payment {
  id: string;
  campaignId: string;
  participantName: string;
  participantEmail: string;
  ticketNumber?: number;
  ticketNumbers?: number[];
  localCurrency: FiatCurrency;
  localAmountMinor: number;
  usdcAmountMicro?: number;
  provider: "p2p.me" | "mock";
  providerOrderId?: string;
  txHash?: string;
  status: PaymentStatus;
  createdAt: string;
  completedAt?: string;
}

export interface FondoState { campaigns: Campaign[]; payments: Payment[] }
