import { describe, expect, it } from "vitest";
import { calculateAvailableUsdc, parseUsdcToMicro, withdrawalInputSchema } from "@/lib/withdrawals";

describe("withdrawal ledger utilities", () => {
  it("parses USDC without floating-point rounding", () => {
    expect(parseUsdcToMicro("25,500001")).toBe(25_500_001n);
  });

  it("reserves pending and approved withdrawals and deducts paid withdrawals", () => {
    expect(calculateAvailableUsdc(100_000_000n, [
      { amount: 10_000_000n, status: "PENDING" },
      { amount: 20_000_000n, status: "APPROVED" },
      { amount: 30_000_000n, status: "PAID" },
      { amount: 15_000_000n, status: "REJECTED" },
    ])).toBe(40_000_000n);
  });

  it("validates an EVM destination address and six decimal amount", () => {
    expect(withdrawalInputSchema.safeParse({ amount: "1.123456", destinationAddress: "0x1111111111111111111111111111111111111111" }).success).toBe(true);
    expect(withdrawalInputSchema.safeParse({ amount: "1.1234567", destinationAddress: "0x123" }).success).toBe(false);
  });
});
