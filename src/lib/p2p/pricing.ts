import type { PaymentQuote } from "@/lib/p2p/types";

export function quoteFromOnchainRate(localAmountMinor: bigint, fiatPerUsdcMicro: bigint, feeLocalMinor = 0n): PaymentQuote {
  if (localAmountMinor <= 0n || fiatPerUsdcMicro <= 0n) throw new Error("La cotización no es válida.");
  const totalFiatMicro = (localAmountMinor + feeLocalMinor) * 10_000n;
  const usdcAmountMicro = (totalFiatMicro * 1_000_000n + fiatPerUsdcMicro - 1n) / fiatPerUsdcMicro;
  return { currency: "ARS", localAmountMinor, usdcAmountMicro, feeLocalMinor, rateFiatPerUsdcMicro: fiatPerUsdcMicro, quotedAt: new Date().toISOString(), metadata: { source: "p2p.me-onchain-price-config" } };
}
