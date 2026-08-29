"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const roleSchema = z.enum(["editor", "viewer"]);

async function requireCampaignEditor(campaignId: string) {
  const id = idSchema.parse(campaignId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_edit_campaign", { p_campaign_id: id });
  if (error || !data) throw new Error("No tienes permisos para administrar esta campaña.");
  return { id, supabase };
}

export async function updateCampaignAction(input: unknown) {
  const parsed = z.object({
    campaignId: idSchema,
    title: z.string().trim().min(2, "Escribe un nombre.").max(100),
    description: z.string().trim().min(2, "Escribe una descripción.").max(1000),
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
  }).parse(input);
  const { supabase } = await requireCampaignEditor(parsed.campaignId);
  const { error } = await supabase.from("campaigns").update({
    title: parsed.title,
    description: parsed.description,
    visibility: parsed.visibility,
    updated_at: new Date().toISOString(),
  }).eq("id", parsed.campaignId);
  if (error) throw new Error("No pudimos guardar la campaña.");
  revalidatePath("/dashboard", "layout");
}

export async function updateCampaignImageAction(campaignId: string, publicUrl: string) {
  const { id, supabase } = await requireCampaignEditor(campaignId);
  const url = z.string().url().max(2000).parse(publicUrl);
  const configuredHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.com").host;
  if (new URL(url).host !== configuredHost || !url.includes("/storage/v1/object/public/campaign-images/")) throw new Error("La imagen no pertenece a Fondo.");
  const { error } = await supabase.from("campaigns").update({ cover_image_url: url, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("La imagen subió, pero no pudimos asociarla a la campaña.");
  revalidatePath("/dashboard", "layout");
}

export async function inviteCampaignMemberAction(input: unknown) {
  const parsed = z.object({ campaignId: idSchema, email: z.string().trim().toLowerCase().email().max(254), role: roleSchema }).parse(input);
  const { supabase } = await requireCampaignEditor(parsed.campaignId);
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id,email").ilike("email", parsed.email).maybeSingle();
  if (profile) {
    const { error } = await supabase.from("campaign_members").upsert({ campaign_id: parsed.campaignId, user_id: profile.id, role: parsed.role }, { onConflict: "campaign_id,user_id" });
    if (error) throw new Error("No pudimos agregar a esa persona.");
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Tu sesión expiró.");
    const { error } = await supabase.from("campaign_invitations").upsert({ campaign_id: parsed.campaignId, email: parsed.email, role: parsed.role, invited_by: user.id }, { onConflict: "campaign_id,email" });
    if (error) throw new Error("No pudimos registrar la invitación.");
  }
  revalidatePath(`/dashboard/campaigns/${parsed.campaignId}`);
}

export async function updateCampaignMemberRoleAction(campaignId: string, memberId: string, role: string) {
  const { id, supabase } = await requireCampaignEditor(campaignId);
  const parsedMemberId = idSchema.parse(memberId);
  const { error } = await supabase.from("campaign_members").update({ role: roleSchema.parse(role) }).eq("id", parsedMemberId).eq("campaign_id", id);
  if (error) throw new Error("No pudimos cambiar el permiso.");
  revalidatePath(`/dashboard/campaigns/${id}`);
}

export async function removeCampaignMemberAction(campaignId: string, memberId: string) {
  const { id, supabase } = await requireCampaignEditor(campaignId);
  const { error } = await supabase.from("campaign_members").delete().eq("id", idSchema.parse(memberId)).eq("campaign_id", id);
  if (error) throw new Error("No pudimos quitar el acceso.");
  revalidatePath(`/dashboard/campaigns/${id}`);
}

export async function removeCampaignInvitationAction(campaignId: string, invitationId: string) {
  const { id, supabase } = await requireCampaignEditor(campaignId);
  const { error } = await supabase.from("campaign_invitations").delete().eq("id", idSchema.parse(invitationId)).eq("campaign_id", id);
  if (error) throw new Error("No pudimos cancelar la invitación.");
  revalidatePath(`/dashboard/campaigns/${id}`);
}

export async function archiveCampaignAction(campaignId: string, confirmation: string) {
  if (confirmation.trim().toUpperCase() !== "ELIMINAR") throw new Error("Escribe ELIMINAR para confirmar.");
  const { id, supabase } = await requireCampaignEditor(campaignId);
  const { error } = await supabase.from("campaigns").update({ status: "CLOSED", deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("No pudimos eliminar la campaña.");
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
