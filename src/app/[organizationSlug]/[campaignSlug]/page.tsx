import type { Metadata } from "next";
import { PublicCampaign } from "@/components/raffle/public-campaign";
export const metadata: Metadata = { title: "Rifa viaje Sub-15", description: "Aporta al viaje del equipo Sub-15." };
export default async function CampaignPage({ params }: { params: Promise<{ organizationSlug: string; campaignSlug: string }> }) { const values = await params; return <PublicCampaign {...values} />; }
