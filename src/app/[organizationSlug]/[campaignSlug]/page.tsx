import type { Metadata } from "next";
import { PublicCampaign } from "@/components/raffle/public-campaign";
import { notFound } from "next/navigation";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Campaign } from "@/lib/types";
export const metadata: Metadata = { title: "Rifa viaje Sub-15", description: "Aporta al viaje del equipo Sub-15." };
export default async function CampaignPage({ params }: { params: Promise<{ organizationSlug: string; campaignSlug: string }> }) {
  const values = await params;
  if (!IS_SUPABASE_CONFIGURED) return <PublicCampaign {...values} />;
  const supabase = await createClient();
  const { data, error } = await supabase.from("campaigns").select("id,type,title,slug,description,status,local_currency,target_local_price_minor,goal_local_amount_minor,ticket_count,ends_at,created_at,organization_id,organizations!inner(name,slug),raffle_tickets(id,number,status)").eq("slug", values.campaignSlug).eq("status", "ACTIVE").eq("organizations.slug", values.organizationSlug).maybeSingle();
  if (error || !data) notFound();
  const organization = data.organizations as unknown as { name: string; slug: string };
  const campaign: Campaign = { id: data.id, organizationId: data.organization_id, organizationName: organization.name, organizationSlug: organization.slug, type: data.type as Campaign["type"], title: data.title, slug: data.slug, description: data.description, status: data.status as Campaign["status"], currency: data.local_currency as Campaign["currency"], priceMinor: Number(data.target_local_price_minor), goalMinor: Number(data.goal_local_amount_minor), ticketCount: data.ticket_count, endsAt: data.ends_at ?? undefined, createdAt: data.created_at, tickets: (data.raffle_tickets ?? []).map((ticket) => ({ id: ticket.id, number: ticket.number, status: ticket.status as Campaign["tickets"][number]["status"] })).sort((a, b) => a.number - b.number) };
  return <PublicCampaign {...values} initialCampaign={campaign} />;
}
