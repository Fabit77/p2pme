import { describe, expect, it } from "vitest";
import { fiatToP2PUnits, formatUsdc, parseFiatAmount } from "@/lib/money";
describe("money utilities", () => {
  it("parses ARS into integer minor units", () => expect(parseFiatAmount("$3.000,50")).toBe(300050n));
  it("converts minor units into the widget's 6 decimals", () => expect(fiatToP2PUnits(300000n)).toBe(3_000_000_000n));
  it("formats USDC without floating point", () => expect(formatUsdc(2_180_000n)).toBe("2.18 USDC"));
});
