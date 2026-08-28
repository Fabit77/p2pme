import Link from "next/link";
import { ArrowUpRight, Banknote, Megaphone, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFiat } from "@/lib/money";

export type LiveCampaignSummary = {
  id: string;
  title: string;
  type: "RAFFLE" | "COLLECTION";
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  ticketCount: number;
  priceMinor: number;
  paidTickets: number;
};

export function LiveDashboardView({ organizationName, campaigns, paymentCount }: { organizationName: string; campaigns: LiveCampaignSummary[]; paymentCount: number }) {
  const active = campaigns.filter((campaign) => campaign.status === "ACTIVE");
  const total = campaigns.reduce((sum, campaign) => sum + campaign.paidTickets * campaign.priceMinor, 0);
  const metrics = [{ label: "Recaudación", value: formatFiat(total), icon: Banknote }, { label: "Pagos", value: paymentCount.toLocaleString("es-AR"), icon: ArrowUpRight }, { label: "Campañas activas", value: active.length.toString(), icon: Megaphone }, { label: "Acceso", value: "Privado", icon: Users }];
  return <div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">Resumen privado</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Buenas tardes, {organizationName}</h1><p className="mt-2 text-muted-foreground">Solo los miembros autorizados de tu organización pueden ver este panel.</p></div><Button asChild><Link href="/dashboard/campaigns/new"><Plus className="size-4" />Nueva campaña</Link></Button></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></span></CardContent></Card>)}</div><div className="mt-10 flex items-center justify-between"><h2 className="text-xl font-bold">Tus campañas</h2><span className="text-sm text-muted-foreground">{campaigns.length} en total</span></div>{campaigns.length === 0 ? <Card className="mt-4 border-dashed"><CardContent className="p-10 text-center"><p className="font-semibold">Todavía no tienes campañas</p><p className="mt-1 text-sm text-muted-foreground">Crea tu primera rifa o colecta para obtener un enlace público.</p><Button asChild className="mt-5"><Link href="/dashboard/campaigns/new">Crear campaña</Link></Button></CardContent></Card> : <div className="mt-4 grid gap-5 lg:grid-cols-2">{campaigns.map((campaign) => { const pct = campaign.ticketCount ? campaign.paidTickets / campaign.ticketCount * 100 : 0; return <Card key={campaign.id} className="transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="flex-row items-start justify-between"><div><Badge variant={campaign.status === "ACTIVE" ? "success" : "outline"}>{campaign.status === "ACTIVE" ? "Activa" : campaign.status}</Badge><CardTitle className="mt-3 text-xl">{campaign.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{campaign.type === "RAFFLE" ? "Rifa comunitaria" : "Colecta"}</p></div><Button asChild variant="ghost" size="icon"><Link href={`/dashboard/campaigns/${campaign.id}`} aria-label={`Administrar ${campaign.title}`}><ArrowUpRight className="size-5" /></Link></Button></CardHeader><CardContent><div className="grid grid-cols-2 gap-4 py-3"><div><p className="text-xs text-muted-foreground">Recaudado</p><p className="mt-1 font-semibold">{formatFiat(campaign.paidTickets * campaign.priceMinor)}</p></div><div><p className="text-xs text-muted-foreground">Números</p><p className="mt-1 font-semibold">{campaign.paidTickets} / {campaign.ticketCount}</p></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div></CardContent></Card>; })}</div>}</div>;
}
