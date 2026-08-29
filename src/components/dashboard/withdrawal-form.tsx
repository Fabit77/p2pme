"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelWithdrawalAction, requestWithdrawalAction } from "@/app/dashboard/wallet/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WithdrawalForm({ defaultAddress, disabled }: { defaultAddress?: string | null; disabled?: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        await requestWithdrawalAction({ amount, destinationAddress: address });
        setAmount("");
        setMessage("Solicitud creada. El monto quedó reservado hasta que Fondo la revise.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No pudimos crear la solicitud.");
      }
    });
  };
  return <form onSubmit={submit} className="grid gap-4"><label className="grid gap-2 text-sm font-medium">Monto en USDC<Input inputMode="decimal" placeholder="Ej. 25,50" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={disabled || pending} required /></label><label className="grid gap-2 text-sm font-medium">Wallet de destino<Input spellCheck={false} placeholder="0x…" value={address} onChange={(event) => setAddress(event.target.value)} disabled={disabled || pending} required pattern="^0x[0-9a-fA-F]{40}$" /></label>{message ? <p role="status" className="rounded-xl bg-muted p-3 text-sm">{message}</p> : null}<Button disabled={disabled || pending}>{pending ? "Creando solicitud…" : "Solicitar retiro"}</Button>{disabled ? <p className="text-xs text-muted-foreground">Necesitas saldo disponible para solicitar un retiro.</p> : null}</form>;
}

export function CancelWithdrawalButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(async () => { await cancelWithdrawalAction(requestId); router.refresh(); })}>{pending ? "Cancelando…" : "Cancelar"}</Button>;
}
