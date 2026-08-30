"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), requestId: z.string().uuid() }),
  z.object({ action: z.literal("reject"), requestId: z.string().uuid(), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("paid"), requestId: z.string().uuid(), txHash: z.string().trim().optional(), payoutReference: z.string().trim().max(200).optional() }),
]);

export async function reviewWithdrawalAction(formData: FormData) {
  const user = await requireUser();
  if (!isPlatformAdminEmail(user.email)) throw new Error("No tienes permiso para administrar retiros.");
  const parsed = actionSchema.parse({
    action: formData.get("action"),
    requestId: formData.get("requestId"),
    reason: formData.get("reason"),
    txHash: formData.get("txHash"),
    payoutReference: formData.get("payoutReference"),
  });
  const admin = createAdminClient();
  const { data: current, error: readError } = await admin.from("withdrawal_requests").select("id,organization_id,status,amount_usdc_micro,method").eq("id", parsed.requestId).single();
  if (readError || !current) throw new Error("No encontramos la solicitud.");
  const expectedStatus = parsed.action === "paid" ? "APPROVED" : "PENDING";
  if (current.status !== expectedStatus) throw new Error("La solicitud cambió de estado. Actualiza la página.");
  const now = new Date().toISOString();
  if (parsed.action === "paid" && current.method === "USDC" && !/^0x[0-9a-fA-F]{64}$/.test(parsed.txHash ?? "")) throw new Error("Ingresa el hash del envío USDC.");
  if (parsed.action === "paid" && current.method === "BANK" && (parsed.payoutReference?.length ?? 0) < 3) throw new Error("Ingresa la referencia del depósito bancario.");
  const update = parsed.action === "approve"
    ? { status: "APPROVED", reviewed_by: user.id, reviewed_at: now, updated_at: now }
    : parsed.action === "reject"
      ? { status: "REJECTED", rejection_reason: parsed.reason, reviewed_by: user.id, reviewed_at: now, updated_at: now }
      : { status: "PAID", payout_tx_hash: current.method === "USDC" ? parsed.txHash?.toLowerCase() : null, payout_reference: current.method === "BANK" ? parsed.payoutReference : null, paid_at: now, updated_at: now };
  const { data: updated, error } = await admin.from("withdrawal_requests").update(update).eq("id", parsed.requestId).eq("status", expectedStatus).select("id").maybeSingle();
  if (error || !updated) throw new Error("No pudimos actualizar la solicitud.");
  await admin.from("audit_events").insert({
    organization_id: current.organization_id,
    actor_type: "fondo_admin",
    actor_id: user.id,
    event_type: `WITHDRAWAL_${parsed.action.toUpperCase()}`,
    metadata: { withdrawal_request_id: parsed.requestId, amount_usdc_micro: current.amount_usdc_micro },
  });
  revalidatePath("/admin/withdrawals");
  revalidatePath("/dashboard/wallet");
}
