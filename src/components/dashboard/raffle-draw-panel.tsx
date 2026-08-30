"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleDotDashed, ListOrdered, LockKeyhole, Trophy } from "lucide-react";
import { closeRaffleAction, conductRaffleDrawAction } from "@/app/dashboard/campaigns/[id]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type RaffleDrawResult = {
  id: string;
  presentation: "WHEEL" | "LIST";
  createdAt: string;
  winners: Array<{ id: string; position: number; prizeLabel: string; ticketNumber: number; participantName: string }>;
};

function DrawResults({ draw }: { draw: RaffleDrawResult }) {
  if (draw.presentation === "WHEEL") return <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{draw.winners.map((winner) => <div key={winner.id} className="text-center"><p className="mb-3 text-sm font-semibold">{winner.prizeLabel}</p><div className="relative mx-auto grid aspect-square max-w-56 place-items-center rounded-full border-[12px] border-secondary bg-[conic-gradient(from_45deg,var(--color-primary),var(--color-secondary),var(--color-primary))] p-5 shadow-lg"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl text-primary">▼</span><div className="grid size-28 place-items-center rounded-full bg-card shadow-inner"><div><p className="text-xs text-muted-foreground">Número ganador</p><p className="text-3xl font-black">#{winner.ticketNumber.toString().padStart(3, "0")}</p></div></div></div><p className="mt-3 font-semibold">{winner.participantName}</p></div>)}</div>;
  return <div className="divide-y rounded-2xl border">{draw.winners.map((winner) => <div key={winner.id} className="grid gap-2 p-4 sm:grid-cols-[48px_1fr_auto] sm:items-center"><span className="grid size-10 place-items-center rounded-full bg-secondary font-bold text-primary">{winner.position}</span><div><p className="font-semibold">{winner.prizeLabel}</p><p className="text-sm text-muted-foreground">{winner.participantName}</p></div><Badge variant="success">#{winner.ticketNumber.toString().padStart(3, "0")}</Badge></div>)}</div>;
}

export function RaffleDrawPanel({ campaignId, status, soldCount, canEdit, draw }: { campaignId: string; status: "DRAFT" | "ACTIVE" | "CLOSED"; soldCount: number; canEdit: boolean; draw: RaffleDrawResult | null }) {
  const router = useRouter();
  const [configuring, setConfiguring] = useState(false);
  const [closing, setClosing] = useState(false);
  const [winnerCount, setWinnerCount] = useState(1);
  const [prizes, setPrizes] = useState(["Primer premio"]);
  const [presentation, setPresentation] = useState<"WHEEL" | "LIST">("WHEEL");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const updateWinnerCount = (value: number) => {
    const nextCount = Math.max(1, Math.min(value || 1, Math.max(soldCount, 1), 100));
    setWinnerCount(nextCount);
    setPrizes((current) => Array.from({ length: nextCount }, (_, index) => current[index] ?? `${index + 1}° premio`));
  };

  const openDraw = () => {
    if (status !== "CLOSED") { setMessage("Primero debes cerrar la rifa para realizar el sorteo."); return; }
    if (soldCount === 0) { setMessage("La rifa no tiene números vendidos para sortear."); return; }
    setMessage(""); setConfiguring(true);
  };

  const closeRaffle = () => {
    setMessage("");
    startTransition(async () => {
      try { await closeRaffleAction(campaignId); setClosing(false); setMessage("Rifa cerrada. Ya puedes configurar el sorteo."); router.refresh(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos cerrar la rifa."); }
    });
  };

  const conductDraw = (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    startTransition(async () => {
      try { await conductRaffleDrawAction({ campaignId, presentation, prizes }); setMessage("Sorteo realizado y guardado."); router.refresh(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos realizar el sorteo."); }
    });
  };

  if (draw) return <Card id="sorteo" className="mt-8 overflow-hidden border-primary/20"><CardHeader className="bg-secondary/60"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Sorteo oficial</p><CardTitle className="mt-1 flex items-center gap-2"><Trophy className="size-5" />Ganadores</CardTitle></div><Badge variant="success">Finalizado</Badge></div><p className="text-sm text-muted-foreground">Realizado el {new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short" }).format(new Date(draw.createdAt))}. El resultado quedó guardado y no puede repetirse.</p></CardHeader><CardContent className="p-6"><DrawResults draw={draw} /></CardContent></Card>;

  return <Card id="sorteo" className="mt-8 border-primary/20"><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Sorteo de la rifa</p><CardTitle className="mt-1">Elegir ganadores</CardTitle><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Participan únicamente los {soldCount} números vendidos y pagados. Los números disponibles o reservados quedan excluidos.</p></div>{canEdit ? <Button type="button" onClick={openDraw}><Trophy className="size-4" />Realizar sorteo</Button> : null}</div></CardHeader><CardContent>
    {!canEdit ? <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Tienes acceso de lectura. Cuando un editor realice el sorteo, el resultado aparecerá aquí.</p> : null}
    {message ? <div role="status" className="mb-4 rounded-xl bg-secondary p-4 text-sm font-medium text-secondary-foreground">{message}{status !== "CLOSED" && !closing ? <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => setClosing(true)}><LockKeyhole className="size-4" />Cerrar rifa</Button> : null}</div> : null}
    {closing ? <div className="mb-4 rounded-2xl border border-warning/40 bg-warning/10 p-4"><p className="font-semibold">¿Cerrar la rifa?</p><p className="mt-1 text-sm text-muted-foreground">Al cerrarla se bloquearán nuevas reservas y pagos. Esta acción es necesaria antes del sorteo.</p><div className="mt-4 flex gap-2"><Button type="button" onClick={closeRaffle} disabled={pending}>{pending ? "Cerrando…" : "Confirmar cierre"}</Button><Button type="button" variant="ghost" onClick={() => setClosing(false)} disabled={pending}>Cancelar</Button></div></div> : null}
    {configuring ? <form onSubmit={conductDraw} className="grid gap-6 rounded-2xl border bg-muted/40 p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Cantidad de ganadores<Input type="number" min={1} max={Math.min(soldCount, 100)} value={winnerCount} onChange={(event) => updateWinnerCount(Number(event.target.value))} required /></label><fieldset><legend className="mb-2 text-sm font-medium">Cómo mostrar el resultado</legend><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setPresentation("WHEEL")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${presentation === "WHEEL" ? "border-primary bg-secondary text-primary" : "bg-card"}`}><CircleDotDashed className="size-4" />Ruleta</button><button type="button" onClick={() => setPresentation("LIST")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${presentation === "LIST" ? "border-primary bg-secondary text-primary" : "bg-card"}`}><ListOrdered className="size-4" />Lista</button></div></fieldset></div><div><p className="mb-3 text-sm font-medium">Nombre de cada premio</p><div className="grid gap-3">{prizes.map((prize, index) => <label key={index} className="grid gap-2 text-sm text-muted-foreground"><span>Ganador {index + 1}</span><Input value={prize} onChange={(event) => setPrizes((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`${index + 1}° premio`} minLength={1} maxLength={120} required /></label>)}</div></div><div className="flex flex-wrap gap-2"><Button disabled={pending || prizes.some((prize) => !prize.trim())}>{pending ? "Sorteando…" : "Confirmar y sortear"}</Button><Button type="button" variant="ghost" onClick={() => setConfiguring(false)} disabled={pending}>Cancelar</Button></div><p className="text-xs leading-5 text-muted-foreground">Al confirmar, el resultado se guardará como el sorteo oficial de esta campaña y no podrá generarse nuevamente.</p></form> : null}
  </CardContent></Card>;
}
