export type PaymentRailStatus = "CREATED" | "WAITING_FOR_PAYMENT" | "PAYMENT_REPORTED" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "FAILED";

export interface PaymentQuote {
  currency: string;
  localAmountMinor: bigint;
  usdcAmountMicro: bigint;
  feeLocalMinor: bigint;
  rateFiatPerUsdcMicro: bigint;
  quotedAt: string;
  metadata: Record<string, unknown>;
}

export interface GetQuoteInput { currency: "ARS"; localAmountMinor: bigint }
export interface CreatePaymentInput { paymentSessionId: string; quote: PaymentQuote }
export interface PaymentRailOrder { orderId: string; status: PaymentRailStatus; txHash?: string }
export interface VerifiedPayment extends PaymentRailOrder { verifiedAt: string }

export interface PaymentRail {
  getQuote(input: GetQuoteInput): Promise<PaymentQuote>;
  createPayment(input: CreatePaymentInput): Promise<PaymentRailOrder>;
  getPaymentStatus(orderId: string): Promise<PaymentRailStatus>;
  verifyPayment(orderId: string): Promise<VerifiedPayment>;
}
