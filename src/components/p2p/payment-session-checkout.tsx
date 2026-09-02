"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckoutSigner } from "@p2pdotme/widgets";
import { LiveP2PCheckout } from "@/components/p2p/live-p2p-checkout";
import { createClient } from "@/lib/supabase/client";

export interface PaymentSessionCheckoutProps {
  paymentSessionId: string;
  participantSessionId: string;
  receiptToken: string;
  fiatAmountMinor: bigint;
  productName: string;
}

export function PaymentSessionCheckout({ signer, paymentSessionId, participantSessionId, receiptToken, fiatAmountMinor, productName }: PaymentSessionCheckoutProps & { signer: CheckoutSigner }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  const persistOrder = async (orderId: string, txHash: string, payerWalletAddress: string) => {
    const { error } = await createClient().rpc("record_p2p_order", {
      p_session_id: paymentSessionId,
      p_participant_session_id: participantSessionId,
      p_order_id: orderId,
      p_tx_hash: txHash,
      p_payer_wallet_address: payerWalletAddress,
    });
    if (error) throw new Error("La orden se creó, pero no pudimos asociarla a la reserva. No vuelvas a pagar; contacta a Fondo.");
  };
  const verify = async () => {
    if (verifying) return;
    setVerifying(true);
    setMessage("Verificando el pago…");
    try {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const response = await fetch("/api/p2p/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentSessionId, participantSessionId }),
        });
        const result = await response.json() as { paymentId?: string; error?: string };
        if (response.ok && result.paymentId) {
          router.push(`/receipt/${result.paymentId}?token=${receiptToken}`);
          return;
        }
        if (response.status !== 409 || attempt === 19) throw new Error(result.error || "No pudimos verificar el pago.");
        setMessage("Esperando la confirmación final de P2P.me…");
        await new Promise((resolve) => setTimeout(resolve, 3_000));
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No pudimos verificar el pago.");
    } finally { setVerifying(false); }
  };
  return <div>
    <LiveP2PCheckout signer={signer} fiatAmountMinor={fiatAmountMinor} productName={productName}
      persistOrder={persistOrder} onOrderPlaced={() => setMessage("Orden creada. Sigue las instrucciones de P2P.me para pagar en pesos.")}
      onComplete={() => void verify()} onError={(error) => setMessage(error.message)} />
    {(message || verifying) && <p role="status" className="mt-3 rounded-xl bg-muted p-3 text-sm">{message}</p>}
  </div>;
}
