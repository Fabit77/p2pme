import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/dynamic", () => ({ default: () => () => null }));
import { PaymentMethodCheckout } from "@/components/p2p/payment-method-checkout";

describe("payment method selector", () => {
  it("offers ARS without MetaMask and does not advertise USDC as enabled", () => {
    const html = renderToStaticMarkup(createElement(PaymentMethodCheckout, {
      paymentSessionId: "session", participantSessionId: "participant", receiptToken: "receipt",
      fiatAmountMinor: 300000n, productName: "Campaña",
    }));
    expect(html).toContain("Pesos argentinos");
    expect(html).toContain("Sin conectar wallet");
    expect(html).toContain("USDC · Próximamente");
    expect(html).toContain("No transfieras pesos reales");
    expect(html).not.toContain("Conectar wallet");
  });
});
