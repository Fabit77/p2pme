import { ArrowDownToLine, Clock3, Landmark, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawalForm, CancelWithdrawalButton } from "@/components/dashboard/withdrawal-form";
import { getOrganizerContext } from "@/lib/auth/session";
import { formatFiat, formatUsdc, type FiatCurrency } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { calculateAvailableUsdc, withdrawalStatusLabel, type WithdrawalStatus } from "@/lib/withdrawals";

type PaymentRow = { id: string; campaign_id: string; usdc_amount_micro: number | string | null; local_currency: string; local_amount_minor: number | string; completed_at: string | null; tx_hash: string | null; campaigns: { title: string } | null };
type WithdrawalRow = { id: string; amount_usdc_micro: number | string; destination_address: string; status: WithdrawalStatus; payout_tx_hash: string | null; rejection_reason: string | null; created_at: string };

export default async function WalletPage() {
  const { organization } = await getOrganizerContext();
  if (!organization) return null;
  const supabase = await createClient();
  const [{ data: paymentData, error: paymentError }, { data: withdrawalData, error: withdrawalError }, { data: organizationData }] = await Promise.all([
    supabase.from("payments").select("id,campaign_id,usdc_amount_micro,local_currency,local_amount_minor,completed_at,tx_hash,campaigns(title)").eq("organization_id", organization.id).eq("status", "COMPLETED").order("completed_at", { ascending: false }),
    supabase.from("withdrawal_requests").select("id,amount_usdc_micro,destination_address,status,payout_tx_hash,rejection_reason,created_at").eq("organization_id", organization.id).order("created_at", { ascending: false }),
    supabase.from("organizations").select("settlement_wallet_address").eq("id", organization.id).single(),
  ]);
  if (paymentError || withdrawalError) throw new Error("No pudimos cargar tu saldo.");
  const payments = (paymentData ?? []) as unknown as PaymentRow[];
  const withdrawals = (withdrawalData ?? []) as unknown as WithdrawalRow[];
  const received = payments.reduce((sum, payment) => sum + BigInt(payment.usdc_amount_micro ?? 0), 0n);
  const withdrawalAmounts = withdrawals.map((item) => ({ amount: BigInt(item.amount_usdc_micro), status: item.status }));
  const available = calculateAvailableUsdc(received, withdrawalAmounts);
  const pending = withdrawals.filter((item) => item.status === "PENDING" || item.status === "APPROVED").reduce((sum, item) => sum + BigInt(item.amount_usdc_micro), 0n);
  const paid = withdrawals.filter((item) => item.status === "PAID").reduce((sum, item) => sum + BigInt(item.amount_usdc_micro), 0n);
  const byCampaign = new Map<string, { title: string; amount: bigint; count: number }>();
  for (const payment of payments) {
    const current = byCampaign.get(payment.campaign_id) ?? { title: payment.campaigns?.title ?? "Campaña", amount: 0n, count: 0 };
    current.amount += BigInt(payment.usdc_amount_micro ?? 0);
    current.count += 1;
    byCampaign.set(payment.campaign_id, current);
  }
  const metrics = [
    { label: "Disponible", value: formatUsdc(available), icon: WalletCards },
    { label: "Retiros en revisión", value: formatUsdc(pending), icon: Clock3 },
    { label: "Retirado", value: formatUsdc(paid), icon: ArrowDownToLine },
    { label: "Total acreditado", value: formatUsdc(received), icon: Landmark },
  ];
  return <div><p className="text-sm font-semibold text-primary">Tesorería de tu organización</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Saldo y retiros</h1><p className="mt-2 max-w-3xl text-muted-foreground">Solo se acreditan pagos que P2P.me haya confirmado. Para el hackathon, Fondo custodia los USDC y procesa cada retiro manualmente.</p><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></span></CardContent></Card>)}</div><div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><div className="space-y-6"><Card><CardHeader><CardTitle>Acreditado por campaña</CardTitle></CardHeader><CardContent>{byCampaign.size === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay pagos P2P.me confirmados.</p> : <div className="divide-y">{Array.from(byCampaign.entries()).map(([id, item]) => <div key={id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.count} {item.count === 1 ? "pago confirmado" : "pagos confirmados"}</p></div><p className="font-semibold">{formatUsdc(item.amount)}</p></div>)}</div>}</CardContent></Card><Card><CardHeader><CardTitle>Ingresos confirmados</CardTitle></CardHeader><CardContent>{payments.length === 0 ? <p className="text-sm text-muted-foreground">Los pagos aparecerán aquí después de ser verificados.</p> : <div className="divide-y">{payments.map((payment) => <div key={payment.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold">{payment.campaigns?.title ?? "Campaña"}</p><p className="text-xs text-muted-foreground">{payment.completed_at ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.completed_at)) : "Confirmado"}</p>{payment.tx_hash ? <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Tx: {payment.tx_hash}</p> : null}</div><div className="sm:text-right"><p className="font-semibold text-primary">+ {formatUsdc(BigInt(payment.usdc_amount_micro ?? 0))}</p><p className="text-xs text-muted-foreground">{formatFiat(BigInt(payment.local_amount_minor), payment.local_currency as FiatCurrency)}</p></div></div>)}</div>}</CardContent></Card><Card><CardHeader><CardTitle>Historial de retiros</CardTitle></CardHeader><CardContent>{withdrawals.length === 0 ? <p className="text-sm text-muted-foreground">Aún no has solicitado retiros.</p> : <div className="divide-y">{withdrawals.map((item) => <div key={item.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{formatUsdc(BigInt(item.amount_usdc_micro))}</p><Badge variant={item.status === "PAID" ? "success" : item.status === "REJECTED" || item.status === "CANCELLED" ? "outline" : "warning"}>{withdrawalStatusLabel[item.status]}</Badge></div><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.destination_address}</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</p>{item.rejection_reason ? <p className="mt-1 text-xs text-destructive">{item.rejection_reason}</p> : null}{item.payout_tx_hash ? <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Tx: {item.payout_tx_hash}</p> : null}</div>{item.status === "PENDING" ? <CancelWithdrawalButton requestId={item.id} /> : null}</div>)}</div>}</CardContent></Card></div><Card className="h-fit"><CardHeader><CardTitle>Solicitar retiro</CardTitle><p className="text-sm leading-6 text-muted-foreground">Fondo revisará la solicitud y enviará los USDC a esta wallet. Registrar una solicitud no mueve fondos automáticamente.</p></CardHeader><CardContent><WithdrawalForm defaultAddress={organizationData?.settlement_wallet_address} disabled={available <= 0n} /></CardContent></Card></div></div>;
}
