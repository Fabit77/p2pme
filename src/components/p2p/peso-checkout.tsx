"use client";

import { useMemo, useState } from "react";
import { PrivyProvider, useGuestAccounts, usePrivy, useWallets, useSendTransaction, useCreateWallet } from "@privy-io/react-auth";
import type { CheckoutSigner } from "@p2pdotme/widgets";
import { baseSepolia } from "viem/chains";
import { Button } from "@/components/ui/button";
import { PaymentSessionCheckout, type PaymentSessionCheckoutProps } from "./payment-session-checkout";
import { getSponsoredTransactionRequest, formatPesoCheckoutError } from "@/lib/p2p/sponsored-signer";

function GuestPesoCheckout(props: PaymentSessionCheckoutProps) {
  const { ready, authenticated } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { createGuestAccount } = useGuestAccounts();
  const { createWallet } = useCreateWallet();
  const { sendTransaction } = useSendTransaction();
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const wallet = wallets.find((item) => item.walletClientType === "privy");

  const signer = useMemo<CheckoutSigner | null>(() => wallet ? {
    address: wallet.address as `0x${string}`,
    sendTransaction: async (tx) => {
      try {
        return await sendTransaction(getSponsoredTransactionRequest(tx), {
          address: wallet.address,
          sponsor: true,
          uiOptions: { showWalletUIs: false },
        });
      } catch (cause) { throw new Error(formatPesoCheckoutError(cause)); }
    },
  } : null, [wallet, sendTransaction]);

  const start = async () => {
    if (!ready || !walletsReady || starting) return;
    setStarting(true); setError("");
    try {
      if (!authenticated) await createGuestAccount();
      else if (!wallet) await createWallet();
      setStarted(true);
    } catch (cause) { setError(formatPesoCheckoutError(cause)); }
    finally { setStarting(false); }
  };

  if (started && signer) return <PaymentSessionCheckout {...props} signer={signer} />;

  return <div className="space-y-4">
    <p className="text-sm leading-6 text-muted-foreground">Paga en pesos desde tu banco o billetera de pagos. No necesitas MetaMask, criptomonedas ni saldo para comisiones de red.</p>
    <Button className="w-full" onClick={start} disabled={!ready || !walletsReady || starting}>
      {!ready || !walletsReady || starting ? "Preparando pago…" : started ? "Reintentar preparación" : "Continuar con pesos argentinos"}
    </Button>
    {started && !signer && <p role="status" className="text-sm text-muted-foreground">Preparando tu sesión segura. Si tarda, pulsa reintentar.</p>}
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <p className="text-xs leading-5 text-muted-foreground">Se crea una sesión de pago de invitado en este dispositivo. Fondo cubre el gas mediante Privy; tu cuenta de Fondo no cambia.</p>
  </div>;
}

export default function PesoCheckout(props: PaymentSessionCheckoutProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <p role="alert" className="rounded-xl bg-muted p-4 text-sm">El pago en pesos todavía no está habilitado. Falta configurar el servicio de sesión segura.</p>;
  return <PrivyProvider appId={appId} config={{
    defaultChain: baseSepolia,
    supportedChains: [baseSepolia],
    loginMethods: ["email"],
    embeddedWallets: { ethereum: { createOnLogin: "all-users" }, showWalletUIs: false },
    appearance: { theme: "light", accentColor: "#26724d", walletChainType: "ethereum-only" },
  }}><GuestPesoCheckout {...props} /></PrivyProvider>;
}
