import { DashboardView } from "@/components/dashboard/dashboard-view";
import { LiveDashboardView, type LiveCampaignSummary } from "@/components/dashboard/live-dashboard-view";
import { OrganizationOnboarding } from "@/components/dashboard/organization-onboarding";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { getOrganizerContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { calculateAvailableUsdc, type WithdrawalStatus } from "@/lib/withdrawals";

export default async function DashboardPage() {
  if (!IS_SUPABASE_CONFIGURED) return <DashboardView />;
  const { user, displayName, organization, canCreateCampaign, canManageOrganization } = await getOrganizerContext();
  if (!organization) return <OrganizationOnboarding />;
  const supabase = await createClient();
  const campaignSelect = "id,title,type,status,visibility,cover_image_url,ticket_count,target_local_price_minor,raffle_tickets(status)";
  const { data: sharedMemberships, error: membershipError } = await supabase
    .from("campaign_members")
    .select("campaign_id,role")
    .eq("user_id", user.id);
  if (membershipError) throw new Error("No pudimos cargar tus campañas compartidas.");
  const sharedIds = (sharedMemberships ?? []).map((membership) => membership.campaign_id);
  const sharedRoleById = new Map((sharedMemberships ?? []).map((membership) => [membership.campaign_id, membership.role as "editor" | "viewer"]));
  const [ownedResult, sharedResult, paymentResult, withdrawalResult] = await Promise.all([
    canManageOrganization
      ? supabase.from("campaigns").select(campaignSelect).eq("organization_id", organization.id).is("deleted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    sharedIds.length
      ? supabase.from("campaigns").select(campaignSelect).in("id", sharedIds).is("deleted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    canManageOrganization
      ? supabase.from("payments").select("id,usdc_amount_micro", { count: "exact" }).eq("organization_id", organization.id).eq("status", "COMPLETED")
      : sharedIds.length
        ? supabase.from("payments").select("id,usdc_amount_micro", { count: "exact" }).in("campaign_id", sharedIds).eq("status", "COMPLETED")
        : Promise.resolve({ data: [], count: 0, error: null }),
    canManageOrganization
      ? supabase.from("withdrawal_requests").select("amount_usdc_micro,status").eq("organization_id", organization.id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (ownedResult.error || sharedResult.error || paymentResult.error || withdrawalResult.error) throw new Error("No pudimos cargar tu panel.");
  const rowById = new Map<string, (NonNullable<typeof ownedResult.data>)[number]>();
  for (const row of [...(ownedResult.data ?? []), ...(sharedResult.data ?? [])]) rowById.set(row.id, row);
  const campaigns: LiveCampaignSummary[] = Array.from(rowById.values()).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as LiveCampaignSummary["type"],
    status: row.status as LiveCampaignSummary["status"],
    visibility: row.visibility as LiveCampaignSummary["visibility"],
    coverImageUrl: row.cover_image_url,
    accessRole: sharedRoleById.get(row.id) ?? null,
    ticketCount: row.ticket_count,
    priceMinor: Number(row.target_local_price_minor),
    paidTickets: (row.raffle_tickets ?? []).filter((ticket) => ticket.status === "PAID").length,
  }));
  const received = (paymentResult.data ?? []).reduce((sum, row) => sum + BigInt(row.usdc_amount_micro ?? 0), 0n);
  const withdrawals = (withdrawalResult.data ?? []).map((row) => ({ amount: BigInt(row.amount_usdc_micro), status: row.status as WithdrawalStatus }));
  return <LiveDashboardView accountName={displayName} campaigns={campaigns} paymentCount={paymentResult.count ?? 0} availableUsdcMicro={calculateAvailableUsdc(received, withdrawals)} canCreateCampaign={canCreateCampaign} canViewBalance={canManageOrganization} />;
}
