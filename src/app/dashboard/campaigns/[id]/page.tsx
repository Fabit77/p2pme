import { CampaignDetail } from "@/components/dashboard/campaign-detail";
import { LiveCampaignDetail } from "@/components/dashboard/live-campaign-detail";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";

export default async function CampaignDashboardPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return IS_SUPABASE_CONFIGURED ? <LiveCampaignDetail id={id} /> : <CampaignDetail id={id} />; }
