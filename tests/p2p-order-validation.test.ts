import { describe, expect, it } from "vitest";
import { stringToHex, type Address } from "viem";
import { assertCompletedOrder, type CompletedOrderEvidence } from "@/lib/p2p/order-validation";

const payer = "0x1111111111111111111111111111111111111111" as Address;
const integrator = "0x2222222222222222222222222222222222222222" as Address;
const client = "0x3333333333333333333333333333333333333333" as Address;

function evidence(overrides: Partial<CompletedOrderEvidence> = {}): CompletedOrderEvidence {
  return {
    orderId: "42",
    expectedFiatAmount: 15_000_000000n,
    expectedPayer: payer,
    expectedIntegrator: integrator,
    expectedClient: client,
    transactionFrom: payer,
    transactionTo: integrator,
    receiptOrderId: "42",
    order: { id: 42n, status: 3, amount: 15_000000n, currency: stringToHex("ARS", { size: 32 }), recipientAddr: client },
    actualFiatAmount: 15_000_000000n,
    ...overrides,
  };
}

describe("assertCompletedOrder", () => {
  it("accepts matching completed on-chain evidence", () => {
    expect(assertCompletedOrder(evidence())).toEqual({ usdcAmountMicro: 15_000000n });
  });

  it("rejects incomplete orders", () => {
    expect(() => assertCompletedOrder(evidence({ order: { ...evidence().order, status: 2 } }))).toThrow("todavía no está completada");
  });

  it("rejects another integrator", () => {
    expect(() => assertCompletedOrder(evidence({ transactionTo: client }))).toThrow("integrador de Fondo");
  });

  it("rejects another payer", () => {
    expect(() => assertCompletedOrder(evidence({ transactionFrom: client }))).toThrow("wallet pagadora");
  });

  it("rejects another client recipient", () => {
    expect(() => assertCompletedOrder(evidence({ order: { ...evidence().order, recipientAddr: payer } }))).toThrow("destinatario on-chain");
  });

  it("rejects a mismatched fiat amount", () => {
    expect(() => assertCompletedOrder(evidence({ actualFiatAmount: 14_999_000000n }))).toThrow("monto on-chain");
  });
});
