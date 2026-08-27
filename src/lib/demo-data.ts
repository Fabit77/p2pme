import type { FondoState, Payment, Ticket } from "@/lib/types";

const now = new Date("2026-08-27T12:00:00.000Z").toISOString();

function ticket(number: number): Ticket {
  return {
    id: `ticket_demo_${number}`,
    number,
    status: number <= 327 ? "PAID" : "AVAILABLE",
    ...(number <= 327 ? { paymentId: `pay_seed_${number}` } : {}),
  };
}

const seedPayments: Payment[] = Array.from({ length: 12 }, (_, index) => ({
  id: `pay_seed_${327 - index}`,
  campaignId: "campaign_demo",
  participantName: ["Camila Rojas", "Mateo Silva", "Sofía Castro", "Tomás Díaz"][index % 4],
  participantEmail: "demo@fondo.lat",
  ticketNumber: 327 - index,
  localCurrency: "ARS",
  localAmountMinor: 300_000,
  usdcAmountMicro: 2_180_000,
  provider: "mock",
  providerOrderId: `seed-${327 - index}`,
  status: "COMPLETED",
  createdAt: new Date(Date.parse(now) - index * 3_600_000).toISOString(),
  completedAt: new Date(Date.parse(now) - index * 3_600_000).toISOString(),
}));

export const DEMO_STATE: FondoState = {
  campaigns: [{
    id: "campaign_demo",
    organizationId: "org_demo",
    organizationName: "Club Deportivo Los Andes",
    organizationSlug: "club-los-andes",
    type: "RAFFLE",
    title: "Rifa viaje Sub-15",
    slug: "rifa-viaje-sub-15",
    description: "Estamos reuniendo fondos para que nuestro equipo pueda viajar al campeonato regional.",
    status: "ACTIVE",
    currency: "ARS",
    priceMinor: 300_000,
    goalMinor: 150_000_000,
    ticketCount: 500,
    endsAt: "2026-10-18T23:59:59.000Z",
    createdAt: now,
    tickets: Array.from({ length: 500 }, (_, index) => ticket(index + 1)),
  }],
  payments: seedPayments,
};
