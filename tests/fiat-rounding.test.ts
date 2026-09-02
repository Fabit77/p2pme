import { describe, expect, it } from "vitest";
import { matchesReservedFiat, roundCheckoutUsdcDown } from "@/lib/p2p/fiat-rounding";

const config = { buyPrice: 1_503_000_000n, threshold: 10_000_000n, fixedFee: 0n };

describe("ARS checkout rounding", () => {
  it.each([100n, 1000n, 3000n, 5000n, 15000n])("keeps %s ARS under the original limit", (pesos) => {
    const fiatLimit = pesos * 1_000_000n;
    const quotedUsdc = (2n * fiatLimit * 1_000_000n + config.buyPrice) / (2n * config.buyPrice);
    const amount = roundCheckoutUsdcDown({ ...config, fiatLimit, quotedUsdc });
    expect(amount).toBe(quotedUsdc - 1n);
    expect(matchesReservedFiat(amount * config.buyPrice / 1_000_000n, fiatLimit)).toBe(true);
  });

  it("preserves exact and already-downward quotes", () => {
    expect(roundCheckoutUsdcDown({ ...config, quotedUsdc: 2_000_000n, fiatLimit: 3_006_000_000n })).toBe(2_000_000n);
    expect(roundCheckoutUsdcDown({ ...config, quotedUsdc: 1_996_007n, fiatLimit: 3_000_000_000n })).toBe(1_996_007n);
  });

  it("includes the fixed BUY fee when the principal is at or below the threshold", () => {
    expect(roundCheckoutUsdcDown({ buyPrice: 1_000_000n, threshold: 10_000_000n, fixedFee: 500_000n, quotedUsdc: 10_000_000n, fiatLimit: 10_500_000n })).toBe(10_000_000n);
  });

  it("does not apply the fee above the threshold", () => {
    expect(roundCheckoutUsdcDown({ buyPrice: 1_000_000n, threshold: 10_000_000n, fixedFee: 500_000n, quotedUsdc: 11_000_000n, fiatLimit: 11_000_000n })).toBe(11_000_000n);
  });

  it("fails closed if rounding crosses into a fee-bearing band", () => {
    expect(() => roundCheckoutUsdcDown({ buyPrice: 1_000_000n, threshold: 10_000_000n, fixedFee: 500_000n, quotedUsdc: 10_000_001n, fiatLimit: 10_000_000n })).toThrow("cotización cambió");
  });

  it("rejects price changes instead of removing the spending limit", () => {
    expect(() => roundCheckoutUsdcDown({ ...config, quotedUsdc: 2_000_000n, fiatLimit: 3_000_000_000n })).toThrow("cotización cambió");
    expect(() => roundCheckoutUsdcDown({ ...config, quotedUsdc: 1n, fiatLimit: 3_000_000_000n })).toThrow("cotización cambió");
  });

  it("rejects invalid prices and amounts", () => {
    expect(() => roundCheckoutUsdcDown({ ...config, buyPrice: 0n, quotedUsdc: 1n, fiatLimit: 10_000n })).toThrow("no es válida");
    expect(() => roundCheckoutUsdcDown({ ...config, quotedUsdc: 0n, fiatLimit: 10_000n })).toThrow("no es válida");
  });
});

describe("settlement cent matching", () => {
  it("accepts only downward dust strictly smaller than half a cent", () => {
    expect(matchesReservedFiat(3_000_000_000n, 3_000_000_000n)).toBe(true);
    expect(matchesReservedFiat(2_999_998_521n, 3_000_000_000n)).toBe(true);
    expect(matchesReservedFiat(2_999_995_001n, 3_000_000_000n)).toBe(true);
    expect(matchesReservedFiat(2_999_995_000n, 3_000_000_000n)).toBe(false);
    expect(matchesReservedFiat(3_000_000_001n, 3_000_000_000n)).toBe(false);
    expect(matchesReservedFiat(0n, 0n)).toBe(false);
    expect(matchesReservedFiat(1n, 1n)).toBe(false);
  });
});
