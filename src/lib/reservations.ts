import type { Ticket } from "@/lib/types";

export function canReserve(ticket: Ticket, now = Date.now()) {
  return ticket.status === "AVAILABLE" || (ticket.status === "RESERVED" && Boolean(ticket.reservedUntil) && Date.parse(ticket.reservedUntil!) <= now);
}

export function generateTickets(count: number, campaignId = "campaign"): Ticket[] {
  if (!Number.isInteger(count) || count < 1 || count > 10_000) throw new Error("Cantidad de números inválida");
  return Array.from({ length: count }, (_, index) => ({ id: `${campaignId}_${index + 1}`, number: index + 1, status: "AVAILABLE" }));
}

export function reserveTicket(ticket: Ticket, reservationId: string, expiresAt: string, now = Date.now()): Ticket {
  if (!canReserve(ticket, now)) throw new Error("TICKET_UNAVAILABLE");
  return { ...ticket, status: "RESERVED", reservationId, reservedUntil: expiresAt };
}
