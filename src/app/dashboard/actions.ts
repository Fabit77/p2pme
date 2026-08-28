"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerContext, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const campaignSchema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(1000),
  type: z.enum(["RAFFLE", "COLLECTION"]),
  ticketCount: z.number().int().min(0).max(1000),
  priceMinor: z.number().int().min(0),
  goalMinor: z.number().int().min(0),
  endsAt: z.string().datetime().optional(),
});

export async function createOrganizationAction(name: string) {
  await requireUser();
  const cleanName = z.string().trim().min(2).max(120).parse(name);
  const supabase = await createClient();
  const suffix = crypto.randomUUID().slice(0, 6);
  const { data, error } = await supabase.rpc("create_organization_with_owner", { p_name: cleanName, p_slug: `${slugify(cleanName)}-${suffix}` });
  if (error) throw new Error("No pudimos crear la organización.");
  revalidatePath("/dashboard", "layout");
  return data as string;
}

export async function createCampaignAction(input: unknown) {
  const parsed = campaignSchema.parse(input);
  const { organization } = await getOrganizerContext();
  if (!organization) throw new Error("Primero crea tu organización.");
  const supabase = await createClient();
  const slug = `${slugify(parsed.title)}-${crypto.randomUUID().slice(0, 6)}`;
  const ticketCount = parsed.type === "RAFFLE" ? parsed.ticketCount : 0;
  const { data: campaign, error } = await supabase.from("campaigns").insert({
    organization_id: organization.id,
    type: parsed.type,
    title: parsed.title,
    slug,
    description: parsed.description,
    status: "ACTIVE",
    local_currency: "ARS",
    target_local_price_minor: parsed.priceMinor,
    goal_local_amount_minor: parsed.goalMinor,
    ticket_count: ticketCount,
    ends_at: parsed.endsAt ?? null,
  }).select("id").single();
  if (error || !campaign) throw new Error("No pudimos crear la campaña.");
  if (ticketCount > 0) {
    const tickets = Array.from({ length: ticketCount }, (_, index) => ({ campaign_id: campaign.id, number: index + 1 }));
    const { error: ticketsError } = await supabase.from("raffle_tickets").insert(tickets);
    if (ticketsError) {
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      throw new Error("No pudimos generar los números de la rifa.");
    }
  }
  revalidatePath("/dashboard");
  return { id: campaign.id };
}
