import { describe, expect, it } from "vitest";
import { OrderStatus } from "@p2pdotme/widgets";
import { MockPaymentRail } from "@/lib/p2p/mock-rail";
import { quoteFromOnchainRate } from "@/lib/p2p/pricing";
import { mapP2PStatus } from "@/lib/p2p/status-map";
describe("P2P.me rail", () => {
  it("maps official terminal status", () => expect(mapP2PStatus(OrderStatus.COMPLETED)).toBe("COMPLETED"));
  it("quotes from an externally supplied on-chain rate", () => { const quote = quoteFromOnchainRate(300_000n, 1_375_000_000n); expect(quote.usdcAmountMicro).toBe(2_181_819n); expect(quote.metadata.source).toBe("p2p.me-onchain-price-config"); });
  it("completes the mock rail idempotently by order id", async () => { const rail = new MockPaymentRail(); const quote = await rail.getQuote({ currency: "ARS", localAmountMinor: 300_000n }); const order = await rail.createPayment({ paymentSessionId: "session-1", quote }); const first = await rail.verifyPayment(order.orderId); const second = await rail.verifyPayment(order.orderId); expect(first.orderId).toBe(second.orderId); expect(second.status).toBe("COMPLETED"); });
});
