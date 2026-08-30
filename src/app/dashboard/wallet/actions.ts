"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrganizerContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseUsdcToMicro, withdrawalInputSchema } from "@/lib/withdrawals";

export async function requestWithdrawalAction(input: unknown) {
  const parsed = withdrawalInputSchema.parse(input);
  const amountMicro = parseUsdcToMicro(parsed.amount);
  if (amountMicro <= 0n) throw new Error("El monto debe ser mayor a cero.");
  const { organization } = await getOrganizerContext();
  if (!organization) throw new Error("No encontramos tu organización.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_withdrawal_request", {
    p_organization_id: organization.id,
    p_amount_usdc_micro: amountMicro.toString(),
    p_method: parsed.method,
    p_destination_address: parsed.method === "USDC" ? parsed.destinationAddress : null,
    p_bank_details: parsed.method === "BANK" ? {
      accountHolder: parsed.accountHolder,
      holderId: parsed.holderId,
      bankName: parsed.bankName,
      accountType: parsed.accountType,
      accountNumber: parsed.accountNumber,
      currency: parsed.currency,
    } : null,
  });
  if (error?.message.includes("INSUFFICIENT_AVAILABLE_BALANCE")) throw new Error("El monto supera tu saldo disponible.");
  if (error) throw new Error("No pudimos crear la solicitud de retiro.");
  revalidatePath("/dashboard", "layout");
}

export async function cancelWithdrawalAction(requestId: string) {
  const id = z.string().uuid().parse(requestId);
  await getOrganizerContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_withdrawal_request", { p_request_id: id });
  if (error) throw new Error("No pudimos cancelar la solicitud.");
  revalidatePath("/dashboard", "layout");
}
