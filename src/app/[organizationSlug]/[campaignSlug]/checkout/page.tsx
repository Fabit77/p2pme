import { Suspense } from "react";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { notFound } from "next/navigation";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Campaign } from "@/lib/types";

export default async function CheckoutPage({ params }: { params: Promise<{ organizationSlug: string; campaignSlug: string }> }) {
  const values = await params;
  if (!IS_SUPABASE_CONFIGURED) return <Suspense><CheckoutFlow {...values} /></Suspense>;
  const supabase = await createClient();
  const { data, error } = await supabase.from("campaigns").select("id,type,title,slug,description,status,local_currency,target_local_price_minor,goal_local_amount_minor,ticket_count,ends_at,created_at,organization_id,organizations!inner(name,slug)").eq("slug", values.campaignSlug).eq("status", "ACTIVE").eq("organizations.slug", values.organizationSlug).maybeSingle();
  if (error || !data) notFound();
  const organization = data.organizations as unknown as { name: string; slug: string };
  const campaign: Campaign = { id: data.id, organizationId: data.organization_id, organizationName: organization.name, organizationSlug: organization.slug, type: data.type as Campaign["type"], title: data.title, slug: data.slug, description: data.description, status: data.status as Campaign["status"], currency: data.local_currency as Campaign["currency"], priceMinor: Number(data.target_local_price_minor), goalMinor: Number(data.goal_local_amount_minor), ticketCount: data.ticket_count, endsAt: data.ends_at ?? undefined, createdAt: data.created_at, tickets: [] };
  return <Suspense><CheckoutFlow {...values} initialCampaign={campaign} /></Suspense>;
}
