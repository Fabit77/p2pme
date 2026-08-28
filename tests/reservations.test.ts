import { describe, expect, it } from "vitest";
import { canReserve, generateTickets, reserveTicket, reserveTickets } from "@/lib/reservations";
describe("raffle reservations", () => {
  it("generates unique sequential tickets", () => { const tickets = generateTickets(500, "demo"); expect(tickets).toHaveLength(500); expect(new Set(tickets.map((t) => t.id)).size).toBe(500); expect(tickets[499].number).toBe(500); });
  it("prevents a double reservation", () => { const first = reserveTicket(generateTickets(1)[0], "r1", new Date(Date.now() + 60_000).toISOString()); expect(() => reserveTicket(first, "r2", new Date(Date.now() + 120_000).toISOString())).toThrow("TICKET_UNAVAILABLE"); });
  it("makes an expired reservation available", () => { const ticket = { ...generateTickets(1)[0], status: "RESERVED" as const, reservedUntil: new Date(Date.now() - 1_000).toISOString() }; expect(canReserve(ticket)).toBe(true); });
  it("reserves multiple numbers as one validated group", () => { const result = reserveTickets(generateTickets(5), [2, 4], ["r2", "r4"], new Date(Date.now() + 60_000).toISOString()); expect(result.filter((ticket) => ticket.status === "RESERVED").map((ticket) => ticket.number)).toEqual([2, 4]); });
  it("rejects the whole group when one number is unavailable", () => { const tickets = generateTickets(3); tickets[1] = reserveTicket(tickets[1], "existing", new Date(Date.now() + 60_000).toISOString()); expect(() => reserveTickets(tickets, [1, 2], ["r1", "r2"], new Date(Date.now() + 60_000).toISOString())).toThrow("ONE_OR_MORE_TICKETS_UNAVAILABLE"); expect(tickets[0].status).toBe("AVAILABLE"); });
});
