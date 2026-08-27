import { CampaignDetail } from "@/components/dashboard/campaign-detail";
export default async function CampaignDashboardPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CampaignDetail id={id} />; }
