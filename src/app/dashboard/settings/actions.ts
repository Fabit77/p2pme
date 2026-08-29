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
