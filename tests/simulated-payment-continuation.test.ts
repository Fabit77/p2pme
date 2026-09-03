import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SimulatedPaymentContinuation } from "@/components/p2p/simulated-payment-continuation";

describe("simulated payment continuation", () => {
  it("starts as an explicit opt-in and does not imply that a payment was confirmed", () => {
    const html = renderToStaticMarkup(createElement(SimulatedPaymentContinuation, {
      orderId: "718",
      fiatAmountMinor: 300_000n,
      productName: "Rifa de prueba",
    }));
    expect(html).toContain("Ver continuación simulada");
    expect(html).not.toContain("Pago simulado confirmado");
    expect(html).not.toContain("FONDO.DEMO.P2P");
  });
});
