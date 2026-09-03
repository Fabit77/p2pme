"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Landmark, Wallet } from "lucide-react";
import type { PaymentSessionCheckoutProps } from "./payment-session-checkout";

const PesoCheckout = dynamic(() => import("./peso-checkout"), {
  ssr: false, loading: () => <p role="status" className="py-6 text-center text-sm">Cargando pago en pesos…</p>,
});

export function PaymentMethodCheckout(props: PaymentSessionCheckoutProps) {
  const [method, setMethod] = useState<"ars" | null>(null);
  return <div>
    <div className="mb-4 rounded-xl bg-warning/15 p-3 text-xs leading-5 text-warning-foreground">Entorno de prueba en Base Sepolia. No transfieras pesos reales.</div>
    {method === "ars" ? <>
      <h2 className="mb-3 text-lg font-semibold">Pagar en pesos argentinos · Prueba</h2>
      <PesoCheckout {...props} />
    </> : <>
      <h2 className="text-lg font-semibold">¿Cómo quieres pagar?</h2>
      <div className="mt-4 grid gap-3">
        <button type="button" onClick={() => setMethod("ars")} className="rounded-2xl border-2 border-primary bg-secondary/40 p-4 text-left transition hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Landmark className="mb-3 size-6 text-primary" />
          <span className="block font-semibold">Pesos argentinos</span>
          <span className="mt-1 block text-sm text-muted-foreground">Transferencia bancaria · Alias o CBU</span>
          <span className="mt-3 block text-xs font-medium text-primary">Sin conectar una wallet</span>
        </button>
        <div aria-disabled="true" className="rounded-2xl border bg-muted/40 p-4 text-muted-foreground">
          <Wallet className="mb-3 size-6" />
          <span className="block font-semibold">USDC · Próximamente</span>
          <span className="mt-1 block text-sm">Pago directo desde una wallet. Todavía no habilitado.</span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Los datos bancarios los entrega P2P.me al asignar un comerciante. Solo se muestra QR si el método elegido lo admite.</p>
    </>}
  </div>;
}
