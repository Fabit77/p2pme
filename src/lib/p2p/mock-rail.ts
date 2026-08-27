import type { CreatePaymentInput, GetQuoteInput, PaymentRail, PaymentRailOrder, PaymentRailStatus, VerifiedPayment } from "@/lib/p2p/types";

export class MockPaymentRail implements PaymentRail {
  private orders = new Map<string, PaymentRailStatus>();
  async getQuote(input: GetQuoteInput) { return { currency: input.currency, localAmountMinor: input.localAmountMinor, usdcAmountMicro: 0n, feeLocalMinor: 0n, rateFiatPerUsdcMicro: 0n, quotedAt: new Date().toISOString(), metadata: { mock: true, disclosure: "No representa una cotización real" } }; }
  async createPayment(input: CreatePaymentInput): Promise<PaymentRailOrder> { const orderId = `mock_${input.paymentSessionId}`; this.orders.set(orderId, "WAITING_FOR_PAYMENT"); return { orderId, status: "WAITING_FOR_PAYMENT" }; }
  async getPaymentStatus(orderId: string) { return this.orders.get(orderId) ?? "FAILED"; }
  async verifyPayment(orderId: string): Promise<VerifiedPayment> { const status = this.orders.get(orderId); if (!status) throw new Error("Orden mock desconocida"); this.orders.set(orderId, "COMPLETED"); return { orderId, status: "COMPLETED", verifiedAt: new Date().toISOString() }; }
}
