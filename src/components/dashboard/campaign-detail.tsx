"use client";

import Link from "next/link";
import { Download, ExternalLink, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFiat, formatUsdc } from "@/lib/money";
import { useFondoStore } from "@/lib/store";
import type { Payment } from "@/lib/types";

function paymentNumbers(payment: Payment) { return payment.ticketNumbers ?? (payment.ticketNumber ? [payment.ticketNumber] : []); }

export function CampaignDetail({ id }: { id: string }) {
  const { campaigns, payments, ready } = useFondoStore();
  const campaign = campaigns.find((item) => item.id === id);
  if (!ready) return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
  if (!campaign) return <div><h1 className="text-2xl font-bold">Campaña no encontrada</h1><Button asChild className="mt-4"><Link href="/dashboard">Volver</Link></Button></div>;

  const sold = campaign.tickets.filter((ticket) => ticket.status === "PAID").length;
  const progress = campaign.ticketCount ? sold / campaign.ticketCount * 100 : 0;
  const campaignPayments = payments.filter((payment) => payment.campaignId === id);
  const exportCsv = () => {
    const rows = [
      ["payment_id", "date", "participant_name", "campaign", "raffle_numbers", "local_currency", "local_amount", "usdc_amount", "p2p_order_id", "tx_hash", "status"],
      ...campaignPayments.map((payment) => [payment.id, payment.completedAt ?? payment.createdAt, payment.participantName, campaign.title, paymentNumbers(payment).join(" | "), payment.localCurrency, (payment.localAmountMinor / 100).toFixed(2), payment.usdcAmountMicro ? Number(payment.usdcAmountMicro / 1_000_000).toFixed(6) : "", payment.providerOrderId ?? "", payment.txHash ?? "", payment.status]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `${campaign.slug}-pagos.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex items-center gap-3"><Badge variant="success">Activa</Badge><span className="text-sm text-muted-foreground">Rifa comunitaria</span></div><h1 className="mt-3 text-3xl font-bold tracking-tight">{campaign.title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{campaign.description}</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`/${campaign.organizationSlug}/${campaign.slug}`} target="_blank"><ExternalLink className="size-4" />Página pública</Link></Button><Button variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${campaign.organizationSlug}/${campaign.slug}`)}><Link2 className="size-4" />Copiar enlace</Button><Button onClick={exportCsv}><Download className="size-4" />Exportar CSV</Button></div></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Recaudado", formatFiat(sold * campaign.priceMinor)], ["Pagos", sold.toLocaleString("es-AR")], ["Números vendidos", `${sold} / ${campaign.ticketCount}`], ["Progreso", `${progress.toFixed(1).replace(".", ",")}%`]].map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>)}</div>
    <Card className="mt-8"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-bold">Pagos recientes</h2><p className="text-sm text-muted-foreground">Historial conciliado de la campaña</p></div><Badge variant="outline">{campaignPayments.length} visibles</Badge></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground"><tr>{["Fecha", "Participante", "Números", "Monto", "USDC", "Estado", "Orden P2P.me"].map((head) => <th key={head} className="px-5 py-3 font-semibold">{head}</th>)}</tr></thead><tbody>{campaignPayments.map((payment) => <tr key={payment.id} className="border-t"><td className="px-5 py-4 text-muted-foreground">{new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(payment.createdAt))}</td><td className="px-5 py-4 font-medium">{payment.participantName}</td><td className="max-w-52 px-5 py-4">{paymentNumbers(payment).map((number) => `#${number.toString().padStart(3, "0")}`).join(", ")}</td><td className="px-5 py-4 font-medium">{formatFiat(payment.localAmountMinor)}</td><td className="px-5 py-4 text-muted-foreground">{payment.usdcAmountMicro ? formatUsdc(payment.usdcAmountMicro) : "—"}</td><td className="px-5 py-4"><Badge variant="success">Completado</Badge></td><td className="max-w-40 truncate px-5 py-4 font-mono text-xs text-muted-foreground">{payment.providerOrderId ?? "—"}</td></tr>)}</tbody></table></div></Card>
  </div>;
}
