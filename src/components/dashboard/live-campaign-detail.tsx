import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignLinkActions } from "@/components/dashboard/campaign-link-actions";
import { formatFiat } from "@/lib/money";
import { getOrganizerContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function LiveCampaignDetail({ id }: { id: string }) {
  const { organization } = await getOrganizerContext();
  if (!organization) notFound();
  const supabase = await createClient();
  const { data: campaign, error } = await supabase.from("campaigns").select("id,title,slug,description,type,status,ticket_count,target_local_price_minor,goal_local_amount_minor,raffle_tickets(status)").eq("id", id).eq("organization_id", organization.id).maybeSingle();
  if (error || !campaign) notFound();
  const paid = (campaign.raffle_tickets ?? []).filter((ticket) => ticket.status === "PAID").length;
  const ticketCount = campaign.ticket_count;
  const progress = ticketCount ? paid / ticketCount * 100 : 0;
  const publicHref = `/${organization.slug}/${campaign.slug}`;
  return <div><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex items-center gap-3"><Badge variant={campaign.status === "ACTIVE" ? "success" : "outline"}>{campaign.status === "ACTIVE" ? "Activa" : campaign.status}</Badge><span className="text-sm text-muted-foreground">{campaign.type === "RAFFLE" ? "Rifa comunitaria" : "Colecta"}</span></div><h1 className="mt-3 text-3xl font-bold tracking-tight">{campaign.title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{campaign.description}</p></div><CampaignLinkActions href={publicHref} /></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Recaudado", formatFiat(paid * Number(campaign.target_local_price_minor))], ["Números vendidos", `${paid} / ${ticketCount}`], ["Progreso", `${progress.toFixed(1).replace(".", ",")}%`], ["Visibilidad", "Solo tu panel"]].map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>)}</div><Card className="mt-8"><CardContent className="p-6"><h2 className="font-bold">Enlace público</h2><p className="mt-2 break-all font-mono text-sm text-muted-foreground">{publicHref}</p><p className="mt-3 text-sm text-muted-foreground">Este enlace puede compartirse para recibir aportes. Su administración y sus datos privados solo aparecen en la cuenta que creó la campaña.</p></CardContent></Card></div>;
}
