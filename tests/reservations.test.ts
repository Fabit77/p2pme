import { describe, expect, it } from "vitest";
import { canReserve, generateTickets, reserveTicket } from "@/lib/reservations";
describe("raffle reservations", () => {
  it("generates unique sequential tickets", () => { const tickets = generateTickets(500, "demo"); expect(tickets).toHaveLength(500); expect(new Set(tickets.map((t) => t.id)).size).toBe(500); expect(tickets[499].number).toBe(500); });
  it("prevents a double reservation", () => { const first = reserveTicket(generateTickets(1)[0], "r1", new Date(Date.now() + 60_000).toISOString()); expect(() => reserveTicket(first, "r2", new Date(Date.now() + 120_000).toISOString())).toThrow("TICKET_UNAVAILABLE"); });
  it("makes an expired reservation available", () => { const ticket = { ...generateTickets(1)[0], status: "RESERVED" as const, reservedUntil: new Date(Date.now() - 1_000).toISOString() }; expect(canReserve(ticket)).toBe(true); });
});
