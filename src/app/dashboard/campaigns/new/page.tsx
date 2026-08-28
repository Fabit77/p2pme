import { CampaignWizard } from "@/components/campaigns/campaign-wizard";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { getOrganizerContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function NewCampaignPage() {
  if (!IS_SUPABASE_CONFIGURED) return <CampaignWizard />;
  const { organization } = await getOrganizerContext();
  if (!organization) redirect("/dashboard");
  return <CampaignWizard live organizationName={organization.name} />;
}
