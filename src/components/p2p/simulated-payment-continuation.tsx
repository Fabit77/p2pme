"use client";

import { useState } from "react";
import { Check, Landmark, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatArs(amountMinor: bigint) {
  const whole = amountMinor / 100n;
  const cents = amountMinor % 100n;
  const formatted = new Intl.NumberFormat("es-AR").format(whole);
  return cents === 0n ? `$ ${formatted}` : `$ ${formatted},${cents.toString().padStart(2, "0")}`;
}

export function SimulatedPaymentContinuation({ orderId, fiatAmountMinor, productName }: {
  orderId: string;
  fiatAmountMinor: bigint;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!open) {
    return <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => setOpen(true)}>
      Ver continuación simulada
    </Button>;
  }

  return <section aria-labelledby="simulated-payment-title" className="mt-3 rounded-2xl border border-primary/20 bg-secondary/35 p-4 sm:p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground">Simulación</span>
        <h3 id="simulated-payment-title" className="mt-3 text-lg font-semibold">Así continúa el pago</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Demostración de la orden #{orderId}. No mueve dinero, tokens ni modifica el saldo de la campaña.</p>
      </div>
      <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar simulación" className="rounded-lg p-2 text-muted-foreground hover:bg-background">
        <X className="size-4" />
      </button>
    </div>

    {!completed ? <>
      <div className="mt-5 rounded-xl border bg-background p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary"><Landmark className="size-5" /></span>
          <div>
            <p className="font-semibold">Comercio de prueba asignado</p>
            <p className="text-sm text-muted-foreground">Datos ficticios para mostrar la experiencia</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Alias</dt><dd className="mt-1 font-mono font-semibold">FONDO.DEMO.P2P</dd></div>
          <div><dt className="text-muted-foreground">Importe</dt><dd className="mt-1 font-semibold">{formatArs(fiatAmountMinor)} ARS</dd></div>
          <div><dt className="text-muted-foreground">Titular</dt><dd className="mt-1 font-semibold">Comercio de prueba</dd></div>
          <div><dt className="text-muted-foreground">Concepto</dt><dd className="mt-1 font-semibold">{productName}</dd></div>
        </dl>
      </div>
      <p className="mt-4 text-sm leading-6">En una operación real, la persona transfiere desde su banco y luego informa que realizó el pago.</p>
      <Button type="button" className="mt-4 w-full" onClick={() => setCompleted(true)}>Simular transferencia realizada</Button>
    </> : <div role="status" className="mt-5 rounded-xl border border-primary/20 bg-background p-5 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-6" /></span>
      <h4 className="mt-4 text-lg font-semibold">Pago simulado confirmado</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">El comercio confirma la recepción, P2P.me libera el token de prueba y Fondo verifica la liquidación antes de acreditar la campaña.</p>
      <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="size-4" />La reserva quedaría confirmada</div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Vista demostrativa: esta acción no confirmó la orden #{orderId} ni cambió ningún saldo.</p>
      <Button type="button" variant="outline" className="mt-4" onClick={() => setCompleted(false)}>Reiniciar simulación</Button>
    </div>}
  </section>;
}
