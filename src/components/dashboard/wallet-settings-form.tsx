"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateSettlementWalletAction } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WalletSettingsForm({ defaultValue }: { defaultValue?: string | null }) {
  const [address, setAddress] = useState(defaultValue ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try { await updateSettlementWalletAction(address); setMessage("Wallet guardada."); }
      catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos guardarla."); }
    });
  };
  return <form onSubmit={submit} className="grid gap-3"><label className="grid gap-2 text-sm font-medium">Wallet para tus retiros<Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x…" pattern="^0x[0-9a-fA-F]{40}$" required /></label>{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}<Button className="w-fit" disabled={pending}>{pending ? "Guardando…" : "Guardar wallet"}</Button></form>;
}
