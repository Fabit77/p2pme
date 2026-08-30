import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignLinkActions } from "@/components/dashboard/campaign-link-actions";
import { CampaignAdminPanel } from "@/components/dashboard/campaign-admin-panel";
import { RaffleDrawPanel, type RaffleDrawResult } from "@/components/dashboard/raffle-draw-panel";
import { formatFiat } from "@/lib/money";
import { getOrganizerContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function LiveCampaignDetail({ id }: { id: string }) {
  await getOrganizerContext();
  const supabase = await createClient();
  const { data: canView } = await supabase.rpc("can_view_campaign", { p_campaign_id: id });
  if (!canView) notFound();
  const { data: campaign, error } = await supabase.from("campaigns").select("id,title,slug,description,type,status,visibility,cover_image_url,ticket_count,target_local_price_minor,goal_local_amount_minor,raffle_tickets(status),organizations!inner(slug)").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error || !campaign) notFound();
  const [{ data: canEdit }, { data: drawRow }] = await Promise.all([
    supabase.rpc("can_edit_campaign", { p_campaign_id: id }),
    supabase.from("raffle_draws").select("id,presentation,created_at").eq("campaign_id", id).maybeSingle(),
  ]);
  const [{ data: memberRows }, { data: invitationRows }] = canEdit
    ? await Promise.all([
        supabase.from("campaign_members").select("id,user_id,role").eq("campaign_id", id).order("created_at"),
        supabase.from("campaign_invitations").select("id,email,role").eq("campaign_id", id).order("created_at"),
      ])
    : [{ data: [] as Array<{ id: string; user_id: string; role: string }> }, { data: [] as Array<{ id: string; email: string; role: string }> }];
  const admin = createAdminClient();
  const memberIds = (memberRows ?? []).map((member) => member.user_id);
  const { data: profiles } = memberIds.length ? await admin.from("profiles").select("id,email").in("id", memberIds) : { data: [] as Array<{ id: string; email: string }> };
  const emailById = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));
  let draw: RaffleDrawResult | null = null;
  if (drawRow) {
    const { data: winnerRows } = await supabase.from("raffle_draw_winners").select("id,position,prize_label,raffle_ticket_id,participant_id").eq("draw_id", drawRow.id).order("position");
    const ticketIds = (winnerRows ?? []).map((winner) => winner.raffle_ticket_id);
    const participantIds = (winnerRows ?? []).map((winner) => winner.participant_id);
    const [{ data: tickets }, { data: participants }] = await Promise.all([
      ticketIds.length ? supabase.from("raffle_tickets").select("id,number").in("id", ticketIds) : Promise.resolve({ data: [] as Array<{ id: string; number: number }> }),
      participantIds.length ? supabase.from("participants").select("id,name").in("id", participantIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    ]);
    const ticketNumberById = new Map((tickets ?? []).map((ticket) => [ticket.id, ticket.number]));
    const participantNameById = new Map((participants ?? []).map((participant) => [participant.id, participant.name]));
    draw = { id: drawRow.id, presentation: drawRow.presentation as "WHEEL" | "LIST", createdAt: drawRow.created_at, winners: (winnerRows ?? []).map((winner) => ({ id: winner.id, position: winner.position, prizeLabel: winner.prize_label, ticketNumber: ticketNumberById.get(winner.raffle_ticket_id) ?? 0, participantName: participantNameById.get(winner.participant_id) ?? "Participante" })) };
  }
  const paid = (campaign.raffle_tickets ?? []).filter((ticket) => ticket.status === "PAID").length;
  const ticketCount = campaign.ticket_count;
  const progress = ticketCount ? paid / ticketCount * 100 : 0;
  const campaignOrganization = campaign.organizations as unknown as { slug: string };
  const publicHref = `/${campaignOrganization.slug}/${campaign.slug}`;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host")?.split(",")[0] ?? headerList.get("host") ?? "p2pme.vercel.app";
  const protocol = headerList.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  const fullUrl = `${protocol}://${host}${publicHref}`;
  const members = (memberRows ?? []).map((member) => ({ id: member.id, email: emailById.get(member.user_id) ?? "Usuario", role: member.role as "editor" | "viewer" }));
  const invitations = (invitationRows ?? []).map((invitation) => ({ id: invitation.id, email: invitation.email, role: invitation.role as "editor" | "viewer" }));
  return <div><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4">{campaign.cover_image_url ? <Image src={campaign.cover_image_url} alt="" width={88} height={88} className="size-20 shrink-0 rounded-2xl object-cover sm:size-24" /> : null}<div><div className="flex flex-wrap items-center gap-3"><Badge variant={campaign.status === "ACTIVE" ? "success" : "outline"}>{campaign.status === "ACTIVE" ? "Activa" : campaign.status}</Badge><span className="text-sm text-muted-foreground">{campaign.type === "RAFFLE" ? "Rifa comunitaria" : "Colecta"}</span></div><h1 className="mt-3 text-3xl font-bold tracking-tight">{campaign.title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{campaign.description}</p></div></div><CampaignLinkActions href={publicHref} fullUrl={fullUrl} isPublic={campaign.visibility === "PUBLIC"} /></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Recaudado", formatFiat(paid * Number(campaign.target_local_price_minor))], ["Números vendidos", `${paid} / ${ticketCount}`], ["Progreso", `${progress.toFixed(1).replace(".", ",")}%`], ["Visibilidad", campaign.visibility === "PUBLIC" ? "Pública" : "Privada"]].map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></Card>)}</div>{campaign.type === "RAFFLE" ? <RaffleDrawPanel campaignId={campaign.id} status={campaign.status as "DRAFT" | "ACTIVE" | "CLOSED"} soldCount={paid} canEdit={Boolean(canEdit)} draw={draw} /> : null}<Card className="mt-8"><CardContent className="p-6"><h2 className="font-bold">Enlace {campaign.visibility === "PUBLIC" ? "público" : "privado"}</h2><p className="mt-2 break-all font-mono text-sm text-muted-foreground">{fullUrl}</p><p className="mt-3 text-sm text-muted-foreground">{campaign.visibility === "PUBLIC" ? "Este enlace puede compartirse para recibir aportes." : "Solo las personas autorizadas que hayan iniciado sesión pueden abrir este enlace."} La administración y los datos privados permanecen dentro del panel.</p></CardContent></Card>{canEdit ? <CampaignAdminPanel campaign={{ id: campaign.id, title: campaign.title, description: campaign.description, visibility: campaign.visibility as "PUBLIC" | "PRIVATE", coverImageUrl: campaign.cover_image_url }} members={members} invitations={invitations} /> : <Card className="mt-8"><CardContent className="p-6"><p className="font-semibold">Acceso de lector</p><p className="mt-1 text-sm text-muted-foreground">Puedes revisar la actividad de esta campaña, pero no modificarla.</p></CardContent></Card>}</div>;
}
