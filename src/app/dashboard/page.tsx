import { DashboardView } from "@/components/dashboard/dashboard-view";
import { LiveDashboardView, type LiveCampaignSummary } from "@/components/dashboard/live-dashboard-view";
import { OrganizationOnboarding } from "@/components/dashboard/organization-onboarding";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { getOrganizerContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  if (!IS_SUPABASE_CONFIGURED) return <DashboardView />;
  const { organization } = await getOrganizerContext();
  if (!organization) return <OrganizationOnboarding />;
  const supabase = await createClient();
  const [{ data: rows, error }, { count: paymentCount }] = await Promise.all([
    supabase.from("campaigns").select("id,title,type,status,ticket_count,target_local_price_minor,raffle_tickets(status)").eq("organization_id", organization.id).order("created_at", { ascending: false }),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
  ]);
  if (error) throw new Error("No pudimos cargar tus campañas.");
  const campaigns: LiveCampaignSummary[] = (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as LiveCampaignSummary["type"],
    status: row.status as LiveCampaignSummary["status"],
    ticketCount: row.ticket_count,
    priceMinor: Number(row.target_local_price_minor),
    paidTickets: (row.raffle_tickets ?? []).filter((ticket) => ticket.status === "PAID").length,
  }));
  return <LiveDashboardView organizationName={organization.name} campaigns={campaigns} paymentCount={paymentCount ?? 0} />;
}
