"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckoutSigner } from "@p2pdotme/widgets";
import { createWalletClient, custom, type EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";
import { Button } from "@/components/ui/button";
import { LiveP2PCheckout } from "@/components/p2p/live-p2p-checkout";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window { ethereum?: EIP1193Provider }
}

export function InjectedWalletCheckout({ paymentSessionId, participantSessionId, receiptToken, fiatAmountMinor, productName }: { paymentSessionId: string; participantSessionId: string; receiptToken: string; fiatAmountMinor: bigint; productName: string }) {
  const router = useRouter();
  const [signer, setSigner] = useState<CheckoutSigner | null>(null);
  const [message, setMessage] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const connect = async () => {
    setConnecting(true); setMessage("");
    try {
      if (!window.ethereum) throw new Error("No encontramos una wallet compatible en este navegador.");
      const wallet = createWalletClient({ chain: baseSepolia, transport: custom(window.ethereum) });
      try { await wallet.switchChain({ id: baseSepolia.id }); }
      catch { await wallet.addChain({ chain: baseSepolia }); await wallet.switchChain({ id: baseSepolia.id }); }
      const [address] = await wallet.requestAddresses();
      if (!address) throw new Error("No se autorizó una wallet.");
      setSigner({
        address,
        sendTransaction: async (tx) => ({
          hash: await wallet.sendTransaction({ account: address, to: tx.to, data: tx.data, gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined }),
        }),
      });
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No pudimos conectar la wallet.");
    } finally { setConnecting(false); }
  };

  const persistOrder = async (orderId: string, txHash: string, payerWalletAddress: string) => {
    const { error } = await createClient().rpc("record_p2p_order", {
      p_session_id: paymentSessionId,
      p_participant_session_id: participantSessionId,
      p_order_id: orderId,
      p_tx_hash: txHash,
      p_payer_wallet_address: payerWalletAddress,
    });
    if (error) throw new Error("La orden se creó, pero no pudimos asociarla a la reserva.");
  };

  const verify = async () => {
    setVerifying(true); setMessage("Verificando la transacción en Base Sepolia…");
    try {
      const response = await fetch("/api/p2p/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentSessionId, participantSessionId }) });
      const result = await response.json() as { paymentId?: string; error?: string };
      if (!response.ok || !result.paymentId) throw new Error(result.error || "No pudimos verificar el pago.");
      router.push(`/receipt/${result.paymentId}?token=${receiptToken}`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No pudimos verificar el pago.");
      setVerifying(false);
    }
  };

  if (!signer) return <div className="rounded-xl border bg-card p-5 text-center"><p className="text-sm leading-6 text-muted-foreground">Conecta una wallet de prueba en Base Sepolia para iniciar el pago. La wallet embebida reemplazará este paso cuando configuremos el proveedor.</p><Button className="mt-4 w-full" onClick={connect} disabled={connecting}>{connecting ? "Conectando…" : "Conectar wallet"}</Button>{message && <p role="alert" className="mt-3 text-sm text-destructive">{message}</p>}</div>;

  return <div><LiveP2PCheckout signer={signer} fiatAmountMinor={fiatAmountMinor} productName={productName} persistOrder={persistOrder} onOrderPlaced={() => setMessage("Orden creada. Sigue las instrucciones de P2P.me.")} onComplete={() => void verify()} onError={(error) => setMessage(error.message)} />{(message || verifying) && <p role="status" className="mt-3 rounded-xl bg-muted p-3 text-sm">{message}</p>}</div>;
}
