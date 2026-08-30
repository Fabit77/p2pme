"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark, WalletCards } from "lucide-react";
import { cancelWithdrawalAction, requestWithdrawalAction } from "@/app/dashboard/wallet/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WithdrawalForm({ defaultAddress, disabled }: { defaultAddress?: string | null; disabled?: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState(defaultAddress ?? "");
  const [method, setMethod] = useState<"USDC" | "BANK">("USDC");
  const [accountHolder, setAccountHolder] = useState("");
  const [holderId, setHolderId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState("Cuenta corriente");
  const [accountNumber, setAccountNumber] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        await requestWithdrawalAction(method === "USDC"
          ? { method, amount, destinationAddress: address }
          : { method, amount, accountHolder, holderId, bankName, accountType, accountNumber, currency });
        setAmount("");
        setMessage("Solicitud creada. El monto quedó reservado hasta que Fondo la revise.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No pudimos crear la solicitud.");
      }
    });
  };
  return <form onSubmit={submit} className="grid gap-4">
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
      <button type="button" onClick={() => setMethod("USDC")} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${method === "USDC" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}><WalletCards className="size-4" />USDC</button>
      <button type="button" onClick={() => setMethod("BANK")} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${method === "BANK" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}><Landmark className="size-4" />Depósito bancario</button>
    </div>
    <label className="grid gap-2 text-sm font-medium">Monto a retirar en USDC<Input inputMode="decimal" placeholder="Ej. 25,50" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={disabled || pending} required /></label>
    {method === "USDC" ? <label className="grid gap-2 text-sm font-medium">Wallet de destino<Input spellCheck={false} placeholder="0x…" value={address} onChange={(event) => setAddress(event.target.value)} disabled={disabled || pending} required pattern="^0x[0-9a-fA-F]{40}$" /></label> : <div className="grid gap-4">
      <p className="rounded-xl bg-secondary p-3 text-xs leading-5 text-secondary-foreground">Fondo revisará los datos y confirmará el tipo de cambio antes de realizar el depósito bancario.</p>
      <label className="grid gap-2 text-sm font-medium">Titular de la cuenta<Input value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} disabled={disabled || pending} required minLength={2} maxLength={120} /></label>
      <label className="grid gap-2 text-sm font-medium">Documento o RUT del titular<Input value={holderId} onChange={(event) => setHolderId(event.target.value)} disabled={disabled || pending} required minLength={2} maxLength={80} /></label>
      <label className="grid gap-2 text-sm font-medium">Banco<Input value={bankName} onChange={(event) => setBankName(event.target.value)} disabled={disabled || pending} required minLength={2} maxLength={120} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Tipo de cuenta<select value={accountType} onChange={(event) => setAccountType(event.target.value)} disabled={disabled || pending} className="h-10 rounded-xl border bg-background px-3 text-sm"><option>Cuenta corriente</option><option>Cuenta vista</option><option>Cuenta de ahorro</option><option>Cuenta digital</option></select></label><label className="grid gap-2 text-sm font-medium">Moneda<select value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={disabled || pending} className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="CLP">CLP</option><option value="ARS">ARS</option><option value="BRL">BRL</option><option value="COP">COP</option><option value="MXN">MXN</option><option value="USD">USD</option></select></label></div>
      <label className="grid gap-2 text-sm font-medium">Número de cuenta<Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} disabled={disabled || pending} required minLength={3} maxLength={100} /></label>
    </div>}
    {message ? <p role="status" className="rounded-xl bg-muted p-3 text-sm">{message}</p> : null}<Button disabled={disabled || pending}>{pending ? "Creando solicitud…" : `Solicitar retiro ${method === "USDC" ? "en USDC" : "bancario"}`}</Button>{disabled ? <p className="text-xs text-muted-foreground">Necesitas saldo disponible para solicitar un retiro.</p> : null}
  </form>;
}

export function CancelWithdrawalButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(async () => { await cancelWithdrawalAction(requestId); router.refresh(); })}>{pending ? "Cancelando…" : "Cancelar"}</Button>;
}
