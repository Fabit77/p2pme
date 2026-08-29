import "server-only";
import { redirect } from "next/navigation";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (!IS_SUPABASE_CONFIGURED) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getOrganizerContext() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("role, organizations!inner(id,name,slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar tu organización.");
  const organization = membership?.organizations as unknown as { id: string; name: string; slug: string } | null;
  if (organization) return { user, organization, role: membership?.role ?? null, scope: "organization" as const, canCreateCampaign: true, canManageOrganization: true };

  const { data: campaignMembership, error: campaignError } = await supabase
    .from("campaign_members")
    .select("role,campaigns!inner(organization_id,organizations!inner(id,name,slug))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (campaignError) throw new Error("No pudimos cargar tus campañas compartidas.");
  const campaign = campaignMembership?.campaigns as unknown as { organizations: { id: string; name: string; slug: string } } | null;
  return {
    user,
    organization: campaign?.organizations ?? null,
    role: campaignMembership?.role ?? null,
    scope: campaign ? "campaign" as const : null,
    canCreateCampaign: false,
    canManageOrganization: false,
  };
}
