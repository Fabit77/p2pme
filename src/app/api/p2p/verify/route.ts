import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCompletedP2POrder } from "@/lib/p2p/verify-completed-order";

const requestSchema = z.object({
  paymentSessionId: z.uuid(),
  participantSessionId: z.uuid(),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data: session, error: sessionError } = await supabase
      .from("payment_sessions")
      .select("id,participant_session_id,intended_local_amount_minor,p2p_order_id,tx_hash,payer_wallet_address,status")
      .eq("id", input.paymentSessionId)
      .eq("participant_session_id", input.participantSessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return Response.json({ error: "Sesión de pago no encontrada." }, { status: 404 });
    if (session.status === "COMPLETED") {
      const { data: existing } = await supabase.from("payments").select("id").eq("payment_session_id", session.id).single();
      return Response.json({ paymentId: existing?.id });
    }
    if (!session.p2p_order_id || !session.tx_hash || !session.payer_wallet_address) {
      return Response.json({ error: "La orden P2P.me todavía no fue registrada." }, { status: 409 });
    }

    const verified = await verifyCompletedP2POrder({
      orderId: session.p2p_order_id,
      txHash: session.tx_hash as `0x${string}`,
      payerWalletAddress: session.payer_wallet_address as `0x${string}`,
      intendedLocalAmountMinor: BigInt(session.intended_local_amount_minor),
    });
    const { data: paymentId, error: completionError } = await supabase.rpc("complete_verified_payment", {
      p_session_id: session.id,
      p_provider_order_id: session.p2p_order_id,
      p_tx_hash: session.tx_hash,
      p_usdc_amount_micro: verified.usdcAmountMicro.toString(),
    });
    if (completionError) throw completionError;
    return Response.json({ paymentId });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No pudimos verificar el pago.";
    const status = cause instanceof z.ZodError
      ? 400
      : message.includes("configurada")
        ? 503
        : message.includes("todavía no está completada on-chain")
          ? 409
          : 422;
    return Response.json({ error: message }, { status });
  }
}
