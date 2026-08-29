import { DashboardView } from "@/components/dashboard/dashboard-view";
import { LiveDashboardView, type LiveCampaignSummary } from "@/components/dashboard/live-dashboard-view";
import { OrganizationOnboarding } from "@/components/dashboard/organization-onboarding";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { getOrganizerContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calculateAvailableUsdc, type WithdrawalStatus } from "@/lib/withdrawals";

export default async function DashboardPage() {
  if (!IS_SUPABASE_CONFIGURED) return <DashboardView />;
  const { organization, canCreateCampaign, canManageOrganization } = await getOrganizerContext();
  if (!organization) return <OrganizationOnboarding />;
  const supabase = await createClient();
  const [{ data: rows, error }, { data: paymentRows, count: paymentCount }, { data: withdrawalRows }] = await Promise.all([
    supabase.from("campaigns").select("id,title,type,status,visibility,cover_image_url,ticket_count,target_local_price_minor,raffle_tickets(status)").eq("organization_id", organization.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("payments").select("id,usdc_amount_micro", { count: "exact" }).eq("organization_id", organization.id).eq("status", "COMPLETED"),
    supabase.from("withdrawal_requests").select("amount_usdc_micro,status").eq("organization_id", organization.id),
  ]);
  if (error) throw new Error("No pudimos cargar tus campañas.");
  const campaigns: LiveCampaignSummary[] = (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as LiveCampaignSummary["type"],
    status: row.status as LiveCampaignSummary["status"],
    visibility: row.visibility as LiveCampaignSummary["visibility"],
    coverImageUrl: row.cover_image_url,
    ticketCount: row.ticket_count,
    priceMinor: Number(row.target_local_price_minor),
    paidTickets: (row.raffle_tickets ?? []).filter((ticket) => ticket.status === "PAID").length,
  }));
  const received = (paymentRows ?? []).reduce((sum, row) => sum + BigInt(row.usdc_amount_micro ?? 0), 0n);
  const withdrawals = (withdrawalRows ?? []).map((row) => ({ amount: BigInt(row.amount_usdc_micro), status: row.status as WithdrawalStatus }));
  return <LiveDashboardView organizationName={organization.name} campaigns={campaigns} paymentCount={paymentCount ?? 0} availableUsdcMicro={calculateAvailableUsdc(received, withdrawals)} canCreateCampaign={canCreateCampaign} canViewBalance={canManageOrganization} />;
}
