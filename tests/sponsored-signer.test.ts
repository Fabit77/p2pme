import { afterEach, describe, expect, it, vi } from "vitest";
import { formatPesoCheckoutError, getSponsoredTransactionRequest } from "@/lib/p2p/sponsored-signer";

const integrator = "0x1111111111111111111111111111111111111111";
const diamond = "0x2222222222222222222222222222222222222222";
afterEach(() => vi.unstubAllEnvs());

describe("ARS sponsored signer", () => {
  it("pins zero value and Base Sepolia for integrator operations", () => {
    vi.stubEnv("NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS", integrator);
    expect(getSponsoredTransactionRequest({ to: integrator, data: "0x1234", gasLimit: 1000 })).toEqual({
      to: integrator, data: "0x1234", gasLimit: 1000, value: 0n, chainId: 84532,
    });
  });
  it("allows the Diamond to handle the order lifecycle", () => {
    vi.stubEnv("NEXT_PUBLIC_P2P_DIAMOND_ADDRESS", diamond);
    expect(getSponsoredTransactionRequest({ to: diamond, data: "0x1234" }).to).toBe(diamond);
  });
  it("rejects an unrelated destination", () => {
    vi.stubEnv("NEXT_PUBLIC_P2P_INTEGRATOR_ADDRESS", integrator);
    vi.stubEnv("NEXT_PUBLIC_P2P_DIAMOND_ADDRESS", "");
    expect(() => getSponsoredTransactionRequest({ to: diamond, data: "0x" })).toThrow("no está autorizado");
  });
  it("does not ask the payer to fund a wallet if sponsorship fails", () => {
    expect(formatPesoCheckoutError(new Error("insufficient funds for gas"))).toContain("No necesitas comprar cripto");
  });
  it("identifies disabled guest accounts and unauthorized origins", () => {
    expect(formatPesoCheckoutError(new Error("guest accounts disabled"))).toContain("Guest accounts");
    expect(formatPesoCheckoutError(new Error("invalid_origin"))).toContain("dominios permitidos");
  });
});
