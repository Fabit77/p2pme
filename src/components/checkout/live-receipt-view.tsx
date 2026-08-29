"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Printer } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFiat, formatUsdc } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";

interface ReceiptRow {
  organization_name: string; organization_slug: string; campaign_title: string; campaign_slug: string;
  participant_name: string; local_currency: string; local_amount_minor: number; usdc_amount_micro: number | null;
  completed_at: string; provider_order_id: string; tx_hash: string | null; ticket_numbers: number[];
}

export function LiveReceiptView({ id, token }: { id: string; token: string }) {
  const [receipt, setReceipt] = useState<ReceiptRow | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { void (async () => {
    const { data } = await createClient().rpc("get_payment_receipt", { p_payment_id: id, p_receipt_token: token });
    setReceipt((data as ReceiptRow[] | null)?.[0] ?? null); setReady(true);
  })(); }, [id, token]);
  if (!ready) return <main className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></main>;
  if (!receipt) return <main className="grid min-h-screen place-items-center"><div className="text-center"><h1 className="text-2xl font-bold">Comprobante no encontrado</h1><Button asChild className="mt-5"><Link href="/">Volver</Link></Button></div></main>;
  const details = [["Organización", receipt.organization_name], ["Campaña", receipt.campaign_title], ["Participante", receipt.participant_name], ["Monto", formatFiat(receipt.local_amount_minor)], ["Settlement", receipt.usdc_amount_micro ? formatUsdc(receipt.usdc_amount_micro) : "Pendiente"], ["Fecha", new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" }).format(new Date(receipt.completed_at))], ["Referencia", receipt.provider_order_id]];
  return <div className="min-h-screen bg-muted/30"><header className="no-print border-b bg-card"><div className="mx-auto flex h-16 max-w-2xl items-center px-4"><Logo /></div></header><main className="mx-auto max-w-2xl px-4 py-10"><div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-success text-white"><Check className="size-7" /></span><h1 className="mt-4 text-3xl font-bold">¡Listo!</h1><p className="mt-2 text-lg text-muted-foreground">Tu aporte fue recibido</p></div><Card className="mt-8 overflow-hidden"><div className="border-b bg-secondary p-6 text-center"><p className="text-sm text-muted-foreground">{receipt.ticket_numbers.length === 1 ? "Número asignado" : `${receipt.ticket_numbers.length} números asignados`}</p><div className="mt-3 flex flex-wrap justify-center gap-2">{receipt.ticket_numbers.map((number) => <span key={number} className="rounded-xl bg-card px-3 py-2 text-xl font-bold">#{number.toString().padStart(3, "0")}</span>)}</div></div><CardContent className="p-6"><div className="space-y-4">{details.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-6 border-b pb-3 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><span className="max-w-[65%] text-right text-sm font-semibold">{value}</span></div>)}</div><div className="mt-5 flex items-center justify-center"><Badge variant="success">Pago confirmado</Badge></div>{receipt.tx_hash && <Button asChild variant="outline" className="mt-4 w-full"><a href={`https://sepolia.basescan.org/tx/${receipt.tx_hash}`} target="_blank" rel="noreferrer">Ver transacción <ExternalLink className="size-4" /></a></Button>}</CardContent></Card><div className="no-print mt-6 grid gap-3 sm:grid-cols-2"><Button asChild><Link href={`/${receipt.organization_slug}/${receipt.campaign_slug}`}>Volver a la campaña</Link></Button><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Imprimir</Button></div></main></div>;
}
