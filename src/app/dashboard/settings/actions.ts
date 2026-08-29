"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function updateSettlementWalletAction(address: string) {
  const wallet = z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/, "Dirección de wallet inválida.").parse(address);
  const { organization } = await getOrganizerContext();
  if (!organization) throw new Error("No encontramos tu organización.");
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ settlement_wallet_address: wallet.toLowerCase() }).eq("id", organization.id);
  if (error) throw new Error("No pudimos guardar la wallet.");
  revalidatePath("/dashboard", "layout");
}

export async function updateOrganizationNameAction(name: string) {
  const cleanName = z.string().trim().min(2, "Escribe un nombre.").max(120).parse(name);
  const { organization, canManageOrganization } = await getOrganizerContext();
  if (!organization || !canManageOrganization) throw new Error("No tienes permisos para editar la organización.");
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ name: cleanName }).eq("id", organization.id);
  if (error) throw new Error("No pudimos guardar el nombre.");
  revalidatePath("/dashboard", "layout");
}
