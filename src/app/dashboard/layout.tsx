import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { getOrganizerContext } from "@/lib/auth/session";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!IS_SUPABASE_CONFIGURED) return <DashboardShell>{children}</DashboardShell>;
  const { user, displayName, canCreateCampaign, canManageOrganization } = await getOrganizerContext();
  return <DashboardShell live platformAdmin={isPlatformAdminEmail(user.email)} accountName={displayName} email={user.email ?? "Cuenta privada"} canCreateCampaign={canCreateCampaign} canManageOrganization={canManageOrganization}>{children}</DashboardShell>;
}
