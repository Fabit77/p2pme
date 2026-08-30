"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, LockKeyhole } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InjectedWalletCheckout } from "@/components/p2p/injected-wallet-checkout";
import { IS_P2P_LIVE } from "@/lib/config";
import { formatFiat } from "@/lib/money";
import { useFondoStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Campaign } from "@/lib/types";

export function CheckoutFlow({ organizationSlug, campaignSlug, initialCampaign, demoMode = false }: { organizationSlug: string; campaignSlug: string; initialCampaign?: Campaign; demoMode?: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const { campaigns, completeDemoPayment, ready } = useFondoStore();
  const campaign = initialCampaign ?? campaigns.find((item) => item.organizationSlug === organizationSlug && item.slug === campaignSlug);
  const numbers = useMemo(() => [...new Set((search.get("numbers") ?? search.get("number") ?? "").split(",").map(Number).filter((number) => Number.isInteger(number) && number > 0))].sort((a, b) => a - b), [search]);
  const reservationIds = useMemo(() => (search.get("reservations") ?? search.get("reservation") ?? "").split(",").filter(Boolean), [search]);
  const participantSessionId = search.get("participantSession") ?? "";
  const expires = search.get("expires") ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [stage, setStage] = useState<"details" | "payment">("details");
  const [processing, setProcessing] = useState(false);
  const [seconds, setSeconds] = useState(600);
  const [error, setError] = useState("");
  const [paymentSessionId, setPaymentSessionId] = useState("");
  const [receiptToken, setReceiptToken] = useState("");

  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.floor((Date.parse(expires) - Date.now()) / 1000)));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [expires]);

  const countdown = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  if (!initialCampaign && !ready) return null;
  if (!campaign || !numbers.length || reservationIds.length !== numbers.length || (initialCampaign && !demoMode && !participantSessionId)) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">Esta reserva no es válida</h1><Button className="mt-5" onClick={() => router.push(`/${organizationSlug}/${campaignSlug}`)}>Elegir números</Button></div></div>;

  const total = campaign.priceMinor * numbers.length;
  const submitDetails = async (event: FormEvent) => {
    event.preventDefault();
    if (!accepted) return setError("Debes aceptar los términos de la campaña.");
    if (seconds <= 0) return setError("La reserva expiró. Elige los números nuevamente.");
    setError(""); setProcessing(true);
    try {
      if (initialCampaign && !demoMode && IS_P2P_LIVE && !paymentSessionId) {
        const { data, error: sessionError } = await createClient().rpc("create_checkout_payment_session", {
          p_campaign_id: campaign.id,
          p_reservation_ids: reservationIds,
          p_participant_session_id: participantSessionId,
          p_name: name,
          p_email: email,
        });
        const session = (data as Array<{ payment_session_id: string; receipt_token: string }> | null)?.[0];
        if (sessionError || !session) throw new Error("No pudimos preparar la sesión de pago.");
        setPaymentSessionId(session.payment_session_id); setReceiptToken(session.receipt_token);
      }
      setStage("payment");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos preparar el pago."); }
    finally { setProcessing(false); }
  };
  const finishDemo = async () => {
    if (initialCampaign && !demoMode) { setError("La reserva quedó registrada. Falta conectar el proveedor P2P.me para confirmar el pago real."); return; }
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    try {
      const payment = completeDemoPayment({ campaignId: campaign.id, numbers, name, email, reservationIds });
      router.push(`/receipt/${payment.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos completar el pago.");
      setProcessing(false);
    }
  };

  return <div className="min-h-screen">
    <header className="border-b bg-card"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4"><Logo /><span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><LockKeyhole className="size-3.5" />Checkout seguro</span></div></header>
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/${organizationSlug}/${campaignSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Volver a la campaña</Link>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_.72fr]">
        <section>
          {stage === "details" ? <form onSubmit={submitDetails}><h1 className="text-3xl font-bold">Completa tus datos</h1><p className="mt-2 text-muted-foreground">Usaremos esta información para asociar y confirmar tus {numbers.length} números.</p><div className="mt-6 grid gap-5"><label className="grid gap-2 text-sm font-medium">Nombre y apellido<Input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. María González" /></label><label className="grid gap-2 text-sm font-medium">Email<Input required type="email" maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="maria@email.com" /></label><label className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 accent-primary" /><span>Acepto los términos de esta campaña y confirmo que los datos ingresados son correctos.</span></label>{error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" disabled={processing}>{processing ? "Preparando…" : "Continuar al pago"}</Button></div></form> : <div><h1 className="text-3xl font-bold">Realiza tu pago</h1><p className="mt-2 text-muted-foreground">Todos los números se confirmarán juntos cuando el pago sea verificado.</p>{IS_P2P_LIVE && paymentSessionId && receiptToken ? <Card className="mt-6"><CardContent className="p-6"><InjectedWalletCheckout paymentSessionId={paymentSessionId} participantSessionId={participantSessionId} receiptToken={receiptToken} fiatAmountMinor={BigInt(total)} productName={campaign.title} /></CardContent></Card> : <Card className="mt-6 overflow-hidden"><div className="bg-warning/15 px-5 py-3 text-sm font-semibold text-warning-foreground">Simulación de pago · No mueve dinero real</div><CardContent className="p-6"><div className="mx-auto grid size-44 place-items-center rounded-2xl border-2 border-dashed bg-muted text-center"><div><div className="mx-auto grid size-11 place-items-center rounded-xl bg-card"><CheckCircle2 className="size-6 text-primary" /></div><p className="mt-3 text-sm font-semibold">P2P.me Sandbox</p><p className="text-xs text-muted-foreground">Base Sepolia</p></div></div><p className="mt-5 text-center text-sm leading-6 text-muted-foreground">En modo live, el widget oficial mostrará las instrucciones de pago local y verificará el estado on-chain.</p><Button className="mt-5 w-full" size="lg" onClick={finishDemo} disabled={processing}>{processing ? "Verificando…" : "Simular pago confirmado"}</Button></CardContent></Card>}{error && <p className="mt-4 text-sm text-destructive">{error}</p>}</div>}
        </section>
        <aside><Card className="sticky top-24"><CardHeader><CardTitle>Resumen</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Estás reservando {numbers.length} {numbers.length === 1 ? "número" : "números"}</p><div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-secondary p-3">{numbers.map((number) => <span key={number} className="rounded-lg bg-card px-2 py-1 text-sm font-bold">#{number.toString().padStart(3, "0")}</span>)}</div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{numbers.length} × {formatFiat(campaign.priceMinor)}</span><span className="font-semibold">{formatFiat(total)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Costo del servicio</span><span className="font-semibold">Calculado por P2P.me</span></div><div className="flex justify-between border-t pt-3"><span>Total objetivo</span><span className="font-bold">{formatFiat(total)}</span></div></div><div className={`mt-5 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-semibold ${seconds < 120 ? "bg-destructive/10 text-destructive" : "bg-muted"}`}><Clock3 className="size-4" />Reserva {countdown}</div></CardContent></Card></aside>
      </div>
    </main>
  </div>;
}
