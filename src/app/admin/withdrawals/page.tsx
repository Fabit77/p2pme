import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { reviewWithdrawalAction } from "@/app/admin/withdrawals/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/logo";
import { requireUser } from "@/lib/auth/session";
import { formatUsdc } from "@/lib/money";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { withdrawalStatusLabel, type WithdrawalStatus } from "@/lib/withdrawals";

type RequestRow = { id: string; organization_id: string; requested_by: string; destination_address: string; amount_usdc_micro: number | string; status: WithdrawalStatus; payout_tx_hash: string | null; rejection_reason: string | null; created_at: string };

export default async function AdminWithdrawalsPage() {
  const user = await requireUser();
  if (!isPlatformAdminEmail(user.email)) notFound();
  const admin = createAdminClient();
  const { data, error } = await admin.from("withdrawal_requests").select("id,organization_id,requested_by,destination_address,amount_usdc_micro,status,payout_tx_hash,rejection_reason,created_at").order("created_at", { ascending: false });
  if (error) throw new Error("No pudimos cargar las solicitudes.");
  const requests = (data ?? []) as unknown as RequestRow[];
  const organizationIds = [...new Set(requests.map((item) => item.organization_id))];
  const userIds = [...new Set(requests.map((item) => item.requested_by))];
  const [{ data: organizations }, { data: profiles }] = await Promise.all([
    organizationIds.length ? admin.from("organizations").select("id,name").in("id", organizationIds) : Promise.resolve({ data: [] }),
    userIds.length ? admin.from("profiles").select("id,email,display_name").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const organizationMap = new Map((organizations ?? []).map((item) => [item.id, item.name]));
  const profileMap = new Map((profiles ?? []).map((item) => [item.id, `${item.display_name} · ${item.email}`]));
  return <main className="min-h-screen bg-muted/35 p-4 py-8 lg:p-10"><div className="mx-auto max-w-6xl"><div className="mb-6 flex items-center justify-between"><Logo href="/dashboard" /><Button asChild variant="ghost"><Link href="/dashboard"><ArrowLeft className="size-4" />Volver al panel</Link></Button></div><div className="mt-5 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><ShieldCheck className="size-6" /></span><div><p className="text-sm font-semibold text-primary">Administración privada de Fondo</p><h1 className="text-3xl font-bold tracking-tight">Solicitudes de retiro</h1></div></div><p className="mt-3 max-w-3xl text-muted-foreground">Verifica la wallet y el monto antes de enviar USDC. Solo marca “Pagado” después de realizar el envío y confirmar su hash.</p>{requests.length === 0 ? <Card className="mt-8"><CardContent className="p-10 text-center text-muted-foreground">No hay solicitudes de retiro.</CardContent></Card> : <div className="mt-8 space-y-4">{requests.map((item) => <Card key={item.id}><CardHeader className="flex-row flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><CardTitle>{organizationMap.get(item.organization_id) ?? "Organización"}</CardTitle><Badge variant={item.status === "PAID" ? "success" : item.status === "REJECTED" || item.status === "CANCELLED" ? "outline" : "warning"}>{withdrawalStatusLabel[item.status]}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{profileMap.get(item.requested_by) ?? "Organizador"}</p></div><p className="text-xl font-bold">{formatUsdc(BigInt(item.amount_usdc_micro))}</p></CardHeader><CardContent><div className="rounded-xl bg-muted p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wallet de destino</p><p className="mt-1 break-all font-mono text-sm">{item.destination_address}</p></div><p className="mt-3 text-xs text-muted-foreground">Solicitado {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</p>{item.rejection_reason ? <p className="mt-2 text-sm text-destructive">Motivo: {item.rejection_reason}</p> : null}{item.payout_tx_hash ? <p className="mt-2 break-all font-mono text-xs">Tx: {item.payout_tx_hash}</p> : null}{item.status === "PENDING" ? <div className="mt-5 grid gap-3 lg:grid-cols-2"><form action={reviewWithdrawalAction}><input type="hidden" name="action" value="approve" /><input type="hidden" name="requestId" value={item.id} /><Button className="w-full">Aprobar retiro</Button></form><form action={reviewWithdrawalAction} className="flex gap-2"><input type="hidden" name="action" value="reject" /><input type="hidden" name="requestId" value={item.id} /><Input name="reason" required minLength={3} maxLength={500} placeholder="Motivo del rechazo" /><Button variant="destructive">Rechazar</Button></form></div> : null}{item.status === "APPROVED" ? <form action={reviewWithdrawalAction} className="mt-5 flex flex-col gap-2 sm:flex-row"><input type="hidden" name="action" value="paid" /><input type="hidden" name="requestId" value={item.id} /><Input name="txHash" required pattern="^0x[0-9a-fA-F]{64}$" placeholder="Hash 0x… del envío confirmado" /><Button>Registrar como pagado</Button></form> : null}</CardContent></Card>)}</div>}</div></main>;
}
