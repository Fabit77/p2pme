"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const examples = [
  {
    title: "Rifa viaje Sub-15",
    raised: "$981.000",
    goal: "$1.500.000",
    progress: 65.4,
    metrics: [["327", "pagos conciliados"], ["327 / 500", "números vendidos"], ["Automático", "reporte actualizado"]],
  },
  {
    title: "Colecta nuevo gimnasio",
    raised: "$2.840.000",
    goal: "$4.000.000",
    progress: 71,
    metrics: [["184", "aportes recibidos"], ["71%", "de la meta alcanzada"], ["En vivo", "reporte actualizado"]],
  },
  {
    title: "Festival de la comunidad",
    raised: "$1.275.000",
    goal: "$1.800.000",
    progress: 70.8,
    metrics: [["255", "entradas confirmadas"], ["255 / 360", "cupos vendidos"], ["Automático", "control de ingresos"]],
  },
] as const;

export function CampaignShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % examples.length), 4500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const example = examples[active];

  return <div className="self-center" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    <Card className="overflow-hidden border-0 shadow-2xl shadow-primary/10">
      <div key={`header-${active}`} className="animate-[showcase-in_.45s_ease-out] bg-primary px-6 py-5 text-primary-foreground">
        <p className="text-sm opacity-80">{example.title}</p>
        <p className="mt-1 text-3xl font-bold">{example.raised}</p>
        <p className="text-sm opacity-80">recaudados de {example.goal}</p>
      </div>
      <CardContent key={`content-${active}`} className="animate-[showcase-in_.45s_ease-out] p-6">
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success transition-[width] duration-700" style={{ width: `${example.progress}%` }} /></div>
        {example.metrics.map(([value, label]) => <div key={label} className="flex items-center justify-between gap-4 border-b py-3 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><span className="text-right font-semibold">{value}</span></div>)}
      </CardContent>
    </Card>
    <div className="mt-4 flex justify-center gap-2" aria-label="Ejemplos de campañas">
      {examples.map((item, index) => <button key={item.title} type="button" onClick={() => setActive(index)} aria-label={`Mostrar ${item.title}`} aria-pressed={active === index} className={`h-2 rounded-full transition-all ${active === index ? "w-8 bg-primary" : "w-2 bg-primary/25 hover:bg-primary/50"}`} />)}
    </div>
  </div>;
}
