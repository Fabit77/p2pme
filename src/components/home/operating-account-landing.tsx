import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  HandCoins,
  Layers3,
  Link2,
  Package,
  QrCode,
  ReceiptText,
  Shirt,
  TicketCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const demoHref = "/club-los-andes/rifa-viaje-sub-15";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-mid">{children}</p>;
}

function SectionIntro({ eyebrow, title, text, centered = false }: { eyebrow?: string; title: string; text?: string; centered?: boolean }) {
  return <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}<h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl lg:text-5xl">{title}</h2>{text ? <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">{text}</p> : null}</div>;
}

function HeroDashboard() {
  const funds = [
    ["Cuotas agosto", "$1.201.000", "84 pagos", "82%"],
    ["Viaje Sub-15", "$1.300.000", "126 pagos", "72%"],
    ["Rifa Sub-15", "$981.000", "327 pagos", "65%"],
    ["Camisetas", "$320.000", "18 pagos", "48%"],
  ] as const;
  return <div className="relative mx-auto w-full max-w-[580px] pb-6 pt-4 sm:px-5 lg:py-10" aria-label="Vista conceptual del panel de Club Los Andes">
    <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-card shadow-[0_24px_70px_-45px_rgba(11,43,31,.55)]">
      <div className="bg-primary px-5 py-5 text-primary-foreground sm:px-7 sm:py-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-medium text-white/65">Club Los Andes</p><p className="mt-2 text-xs text-white/60">Saldo total</p><p className="mt-0.5 text-3xl font-bold tracking-tight sm:text-4xl">$3.482.000</p></div><span className="grid size-11 place-items-center rounded-2xl bg-white/10"><Layers3 className="size-5" /></span></div></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">{funds.map(([name, amount, payments, progress], index) => <div key={name} className="landing-rise rounded-2xl border bg-background p-4 transition duration-300 hover:-translate-y-0.5 hover:border-brand-sage" style={{ animationDelay: `${index * 80}ms` }}><div className="flex items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">Fondo</p><p className="mt-1 text-sm font-semibold">{name}</p></div><span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-brand-mid">Activo</span></div><p className="mt-4 text-xl font-bold">{amount}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="landing-progress h-full rounded-full bg-brand-mid" style={{ width: progress }} /></div><p className="mt-2 text-[11px] text-muted-foreground">{payments} identificados</p></div>)}</div>
    </div>
    <div className="landing-float mt-3 rounded-2xl border bg-card p-3 shadow-[0_12px_35px_-24px_rgba(11,43,31,.6)] sm:absolute sm:-left-5 sm:top-24 sm:mt-0 sm:w-44"><p className="text-xs font-semibold">Juan Pérez</p><p className="mt-0.5 text-[11px] text-muted-foreground">Cuota agosto</p><span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-mid"><CheckCircle2 className="size-3" />Pagado</span></div>
    <div className="landing-float-delayed mt-3 rounded-2xl border bg-card p-3 shadow-[0_12px_35px_-24px_rgba(11,43,31,.6)] sm:absolute sm:-right-4 sm:bottom-20 sm:mt-0 sm:w-44"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">María González</p><p className="mt-0.5 text-[11px] text-muted-foreground">Rifa #148</p></div><p className="text-xs font-bold">$3.000</p></div></div>
    <div className="mt-3 rounded-2xl border bg-card p-3 sm:mx-auto sm:w-52"><p className="text-xs font-semibold">Pedro Díaz</p><div className="mt-1 flex items-center justify-between"><p className="text-[11px] text-muted-foreground">Camiseta · Talle L</p><span className="text-[10px] font-bold text-brand-mid">Pagado</span></div></div>
  </div>;
}

function ProblemVisual() {
  const items = [
    { label: "Chat", visual: <div className="space-y-1.5"><span className="block h-2 w-3/4 rounded-full bg-secondary" /><span className="ml-auto block h-2 w-1/2 rounded-full bg-brand-sage/45" /><span className="block h-2 w-2/3 rounded-full bg-secondary" /></div> },
    { label: "Comprobante", visual: <div className="mx-auto w-20 rounded-lg border bg-background p-2"><span className="block h-1.5 w-8 rounded bg-muted-foreground/25" /><span className="mt-2 block text-center text-xs font-bold">$3.000</span></div> },
    { label: "Transferencia", visual: <div className="flex items-center justify-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-bold">A</span><ArrowRight className="size-4 text-muted-foreground" /><span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-bold">?</span></div> },
    { label: "Planilla", visual: <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md bg-border p-px">{Array.from({ length: 12 }, (_, index) => <span key={index} className={`h-3 bg-card ${index === 6 ? "bg-warning/35" : ""}`} />)}</div> },
    { label: "Revisión manual", visual: <div className="flex items-center justify-center gap-2 text-xs"><ClipboardCheck className="size-7 text-muted-foreground" /><span className="font-medium">¿Quién pagó?</span></div> },
  ];
  return <div className="mt-10 grid gap-3 md:grid-cols-5">{items.map((item, index) => <div key={item.label} className="relative rounded-2xl border bg-card p-4"><div className="h-16 rounded-xl bg-muted/55 p-3">{item.visual}</div><p className="mt-3 text-sm font-semibold">{item.label}</p>{index < items.length - 1 ? <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden size-5 rounded-full bg-background text-muted-foreground md:block" /> : null}</div>)}</div>;
}

function IncomeLayers() {
  const funds = [
    ["Cuotas mensuales", "$1.201.000", "84 pagos", "Al día", "w-[82%]"],
    ["Viaje Sub-15", "$1.300.000", "126 pagos", "72%", "w-[72%]"],
    ["Rifa anual", "$981.000", "327 pagos", "65%", "w-[65%]"],
    ["Venta de camisetas", "$320.000", "18 pagos", "En curso", "w-[48%]"],
    ["Inscripciones", "$540.000", "36 pagos", "Abierta", "w-[58%]"],
  ] as const;
  return <div className="mt-10 rounded-[2rem] border bg-card p-4 sm:p-7"><div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-muted-foreground">Organización</p><p className="mt-1 text-lg font-bold">Club Deportivo Los Andes</p></div><div className="flex items-center gap-2 text-xs font-semibold text-brand-mid"><Layers3 className="size-4" />5 Fondos activos</div></div><div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">{funds.map(([name, amount, payments, status, width], index) => <article key={name} className="group rounded-2xl border bg-background p-4 transition duration-300 hover:-translate-y-1 hover:border-brand-sage"><span className="grid size-8 place-items-center rounded-xl bg-secondary text-xs font-black text-brand-mid">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-4 min-h-10 text-sm font-semibold">{name}</h3><p className="mt-3 text-lg font-bold">{amount}</p><p className="text-[11px] text-muted-foreground">{payments}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full bg-brand-mid ${width}`} /></div><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-brand-mid">{status}</p></article>)}</div></div>;
}

function StepVisual({ step }: { step: number }) {
  if (step === 1) return <div className="space-y-2 rounded-xl border bg-card p-3"><span className="block h-2 w-16 rounded bg-muted" /><span className="block h-8 rounded-lg border bg-background" /><span className="block h-7 w-24 rounded-lg bg-primary" /></div>;
  if (step === 2) return <div className="grid place-items-center rounded-xl border bg-card p-3"><div className="flex w-full items-center gap-2 rounded-lg bg-muted p-2"><Link2 className="size-3 text-brand-mid" /><span className="truncate text-[9px]">fondo.app/club/viaje</span></div><QrCode className="mt-3 size-10 text-primary" /></div>;
  if (step === 3) return <div className="rounded-xl border bg-card p-3"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-lg font-bold">$3.000</p><div className="mt-3 rounded-lg bg-primary py-2 text-center text-[10px] font-bold text-white">Pagar</div></div>;
  return <div className="space-y-2 rounded-xl border bg-card p-3"><div className="flex items-center justify-between rounded-lg bg-secondary p-2"><div><p className="text-[10px] font-bold">Juan Pérez</p><p className="text-[9px] text-muted-foreground">Rifa #148</p></div><CheckCircle2 className="size-4 text-brand-mid" /></div><div className="flex justify-between text-[9px]"><span>Identificado</span><span className="font-bold">$3.000</span></div></div>;
}

function HowItWorks() {
  const steps = [
    ["Crea un Fondo", "Define qué quieres recaudar y cómo quieres organizarlo."],
    ["Comparte", "Genera un enlace o QR y envíalo a tu comunidad."],
    ["Recibe", "Cada persona paga usando una experiencia simple."],
    ["Fondo organiza", "Cada ingreso queda asociado automáticamente a una persona y a un propósito."],
  ] as const;
  return <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{steps.map(([title, text], index) => <article key={title} className="rounded-3xl border bg-background p-5"><div className="mb-5"><StepVisual step={index + 1} /></div><p className="text-xs font-black tracking-[0.18em] text-brand-mid">{String(index + 1).padStart(2, "0")}</p><h3 className="mt-2 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div>;
}

function RaffleCase() {
  const flow = ["El club crea la rifa", "Comparte el enlace", "Juan elige #148", "Paga", "Fondo registra"];
  return <div className="mt-10 grid gap-8 lg:grid-cols-[.88fr_1.12fr] lg:items-center"><div><div className="flex flex-wrap gap-2">{["500 números", "$3.000 por número", "Meta $1.500.000"].map((item) => <span key={item} className="rounded-full border bg-card px-3 py-2 text-xs font-semibold">{item}</span>)}</div><div className="mt-7 space-y-2">{flow.map((item, index) => <div key={item} className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-black text-brand-mid">{index + 1}</span><p className="text-sm font-semibold">{item}</p></div>)}</div><Button asChild size="lg" className="mt-8"><Link href={demoHref}>Probar la demo <ArrowRight className="size-4" /></Link></Button></div><div className="rounded-[2rem] border bg-card p-4 sm:p-6"><div className="grid gap-4 sm:grid-cols-[1fr_.9fr]"><div className="rounded-2xl bg-primary p-5 text-white"><p className="text-xs text-white/65">Rifa viaje Sub-15</p><p className="mt-2 text-3xl font-bold">$981.000</p><p className="mt-1 text-xs text-white/65">recaudados de $1.500.000</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[65.4%] rounded-full bg-brand-sage" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div><p className="text-xl font-bold">327 / 500</p><p className="text-[10px] text-white/60">números vendidos</p></div><div><p className="text-xl font-bold">327</p><p className="text-[10px] text-white/60">pagos conciliados</p></div></div></div><div className="rounded-2xl border bg-background p-4"><div className="flex items-center justify-between"><span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-brand-mid">Pagado</span><span className="text-sm font-bold">$3.000</span></div><p className="mt-5 text-xs text-muted-foreground">Persona</p><p className="font-semibold">Juan Pérez</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-muted p-2"><p className="text-muted-foreground">Fondo</p><p className="mt-1 font-semibold">Viaje Sub-15</p></div><div className="rounded-lg bg-muted p-2"><p className="text-muted-foreground">Número</p><p className="mt-1 font-semibold">#148</p></div></div></div></div></div></div>;
}

function UseCaseVisual({ type }: { type: number }) {
  if (type === 0) return <div className="grid grid-cols-3 gap-1.5">{["AGO", "SEP", "OCT"].map((month, index) => <span key={month} className={`rounded-lg p-2 text-center text-[9px] font-bold ${index === 0 ? "bg-secondary text-brand-mid" : "border"}`}>{month}<Check className="mx-auto mt-1 size-3" /></span>)}</div>;
  if (type === 1) return <div><div className="flex justify-between text-[10px]"><span>Meta</span><b>72%</b></div><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-full w-[72%] rounded-full bg-brand-mid" /></div></div>;
  if (type === 2) return <div className="grid grid-cols-6 gap-1">{[12, 28, 43, 67, 91, 148, 203, 327, 388, 401, 455, 499].map((n, i) => <span key={n} className={`rounded p-1 text-center text-[8px] ${i === 5 ? "bg-primary text-white" : "bg-muted"}`}>{n}</span>)}</div>;
  if (type === 3) return <div className="flex items-center justify-between rounded-xl border p-2"><CalendarDays className="size-5 text-brand-mid" /><div className="text-right"><b className="block text-xs">36 / 50</b><span className="text-[9px] text-muted-foreground">cupos confirmados</span></div></div>;
  if (type === 4) return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary"><Shirt className="size-5 text-brand-mid" /></span><div><b className="block text-xs">Camiseta · L</b><span className="text-[9px] text-muted-foreground">Pago identificado</span></div></div>;
  return <div className="flex -space-x-2">{["M", "J", "S", "+"].map((letter, index) => <span key={`${letter}-${index}`} className="grid size-9 place-items-center rounded-full border-2 border-card bg-secondary text-xs font-bold">{letter}</span>)}</div>;
}

function UseCases() {
  const cases = [
    ["Cuotas", "Organiza mensualidades, pagos realizados y pendientes.", WalletCards],
    ["Colectas", "Recauda dinero para una meta específica.", HandCoins],
    ["Rifas", "Relaciona automáticamente pagos, personas y números.", TicketCheck],
    ["Eventos", "Gestiona inscripciones, cupos y pagos.", CalendarDays],
    ["Productos", "Vende camisetas, merchandising u otros productos.", Package],
    ["Donaciones", "Recibe aportes y mantenlos identificados.", Gift],
  ] as const;
  return <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{cases.map(([title, text, Icon], index) => <article key={title} className="group rounded-3xl border bg-card p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-sage"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-2xl bg-secondary text-brand-mid"><Icon className="size-5" /></span><span className="text-[10px] font-bold uppercase tracking-[.15em] text-muted-foreground">Fondo {String(index + 1).padStart(2, "0")}</span></div><div className="mt-5 rounded-2xl bg-muted/55 p-3"><UseCaseVisual type={index} /></div><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}</div>;
}

function BeforeAfter() {
  const without = ["Cuentas personales", "Capturas", "Transferencias sin contexto", "Planillas", "Revisión manual", "Difícil saber quién pagó"];
  const withFondo = ["Un enlace", "Pagos identificados", "Fondos separados", "Historial", "Dashboard", "Reportes claros"];
  return <div className="mt-10 grid gap-5 md:grid-cols-2"><div className="relative overflow-hidden rounded-3xl border bg-card p-6"><div className="absolute right-5 top-5 rotate-3 rounded-lg border bg-muted px-3 py-2 text-[10px] text-muted-foreground">comprobante_284.jpg</div><h3 className="text-xl font-bold">Sin Fondo</h3><div className="mt-7 flex flex-wrap gap-2">{without.map((item, index) => <span key={item} className={`rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground ${index % 2 ? "rotate-1" : "-rotate-1"}`}>{item}</span>)}</div><p className="mt-8 text-sm font-semibold text-muted-foreground">El dinero está. La información vive en distintos lugares.</p></div><div className="rounded-3xl border border-brand-sage/60 bg-secondary/50 p-6"><div className="flex items-center justify-between"><h3 className="text-xl font-bold">Con Fondo</h3><BadgeCheck className="size-6 text-brand-mid" /></div><div className="mt-6 grid gap-2 sm:grid-cols-2">{withFondo.map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-card p-3 text-sm font-semibold"><CheckCircle2 className="size-4 shrink-0 text-brand-mid" />{item}</div>)}</div><p className="mt-7 text-sm font-semibold text-brand-mid">Cada ingreso conserva su persona, propósito e historial.</p></div></div>;
}

function P2PInfrastructure() {
  const nodes = [
    { title: "Persona", subtitle: "Paga como siempre", icon: Users },
    { title: "ARS · BRL · MXN", subtitle: "Métodos locales", icon: Banknote },
    { title: "P2P.me", subtitle: "Mueve el dinero", icon: ArrowDown },
    { title: "USDC", subtitle: "Infraestructura", icon: ReceiptText },
    { title: "Fondo", subtitle: "Organiza el contexto", icon: Layers3 },
  ] as const;
  return <div className="mt-10 grid gap-3 sm:grid-cols-5">{nodes.map(({ title, subtitle, icon: Icon }, index) => <div key={title} className="relative rounded-2xl border bg-card p-4 text-center"><span className="mx-auto grid size-9 place-items-center rounded-xl bg-secondary text-brand-mid"><Icon className="size-4" /></span><p className="mt-3 text-sm font-bold">{title}</p><p className="mt-1 text-[10px] text-muted-foreground">{subtitle}</p>{index < nodes.length - 1 ? <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden size-5 rounded-full bg-background text-muted-foreground sm:block" /> : null}</div>)}</div>;
}

export function OperatingAccountLanding() {
  return <main className="overflow-hidden">
    <section className="relative"><div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_15%,var(--accent),transparent_32%)]" /><div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24"><div className="max-w-2xl"><h1 className="text-4xl font-bold leading-[1.02] tracking-[-0.055em] sm:text-5xl lg:text-6xl">Tu cuenta operativa para recibir y organizar dinero.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Crea distintos fondos para cuotas, colectas, eventos, rifas o ventas. Recibe pagos, identifica quién pagó y mantén cada ingreso separado y ordenado.</p><p className="mt-5 text-sm font-semibold text-brand-mid">Para personas · clubes · comunidades · organizaciones</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg"><Link href="/dashboard">Crear mi Fondo <ArrowRight className="size-4" /></Link></Button><Button asChild variant="outline" size="lg"><a href="#como-funciona">Ver cómo funciona</a></Button></div></div><HeroDashboard /></div></section>

    <section className="border-y bg-card"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><SectionIntro eyebrow="El problema" title="Cobrar es fácil. Ordenar 300 pagos no." text="Cuando una comunidad empieza a recibir decenas o cientos de transferencias, rápidamente aparecen capturas de chats, planillas, cuentas personales y pagos difíciles de identificar." /><ProblemVisual /><p className="mt-8 text-center text-lg font-bold">El dinero llega. <span className="text-brand-mid">El contexto se pierde.</span></p></div></section>

    <section><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><SectionIntro title="Un lugar para cada ingreso." text="Una organización no tiene un solo tipo de ingreso. Fondo permite separar y entender cada uno." /><IncomeLayers /></div></section>

    <section id="como-funciona" className="scroll-mt-20 border-y bg-card"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><SectionIntro eyebrow="Cómo funciona" title="Empieza a recibir pagos en minutos." centered /><HowItWorks /></div></section>

    <section><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><SectionIntro eyebrow="Caso de uso" title="De 500 transferencias a una sola vista." text="Club Los Andes organiza una rifa para financiar el viaje del equipo Sub-15. Cada pago queda unido a una persona y a su número." /><RaffleCase /></div></section>

    <section className="border-y bg-card"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><SectionIntro title="Un Fondo para cada necesidad." text="Separa cada flujo sin perder la vista completa de tu operación." /><UseCases /></div></section>

    <section><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><SectionIntro title="Del caos operativo a una cuenta organizada." /><BeforeAfter /></div></section>

    <section className="border-y bg-secondary/45"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><SectionIntro eyebrow="Infraestructura de pagos" title="Paga local. Opera global." text="Tu comunidad utiliza métodos de pago locales. P2P.me conecta el pago con infraestructura en stablecoins por detrás." centered /><P2PInfrastructure /><div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-primary px-6 py-5 text-center text-white"><p className="text-lg font-bold">P2P.me mueve el dinero. Fondo entiende para qué llegó.</p><p className="mt-2 text-xs text-white/60">Powered by P2P.me</p></div></div></section>

    <section><div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:py-28"><SectionIntro title="La tecnología queda detrás." text="Tu comunidad solo ve una forma simple de pagar. Fondo y P2P.me se encargan del resto." centered /><div className="mx-auto mt-10 flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row"><div className="rounded-2xl border bg-card px-6 py-4 font-semibold">Usuario</div><ArrowRight className="hidden size-5 text-muted-foreground sm:block" /><ArrowDown className="size-5 text-muted-foreground sm:hidden" /><div className="rounded-2xl border bg-card px-6 py-4 font-semibold">Pago local</div><ArrowRight className="hidden size-5 text-muted-foreground sm:block" /><ArrowDown className="size-5 text-muted-foreground sm:hidden" /><div className="rounded-2xl bg-primary px-8 py-4 font-semibold text-white">Fondo</div></div><p className="mt-6 text-xs font-semibold tracking-[.18em] text-muted-foreground">P2P.me · USDC · Base</p></div></section>

    <section className="border-y bg-card"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 md:grid-cols-5 lg:px-8">{["Pagos identificados", "Fondos separados", "Historial organizado", "Reportes claros", "Powered by P2P.me"].map((item) => <div key={item} className="flex items-center justify-center gap-2 text-center text-xs font-semibold sm:text-sm"><CheckCircle2 className="size-4 shrink-0 text-brand-mid" />{item}</div>)}</div></section>

    <section><div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28"><div className="rounded-[2rem] bg-primary px-6 py-12 text-center text-white sm:px-12 sm:py-16"><h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Tu próximo Fondo puede estar listo en minutos.</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">Deja de organizar pagos entre transferencias, chats y planillas.</p><Button asChild size="lg" className="mt-8 bg-white text-primary hover:bg-white/90"><Link href="/dashboard">Crear mi Fondo <ArrowRight className="size-4" /></Link></Button><p className="mt-5 text-xs text-white/60">Empieza con cuotas, una colecta, una rifa o cualquier ingreso que necesites organizar.</p></div></div></section>
  </main>;
}
