"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CircleDollarSign, LogOut, Plus, Settings, ShieldCheck, WalletCards } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function DashboardShell({ children, organizationName = "Club Los Andes", email = "Cuenta demo", live = false, platformAdmin = false, canCreateCampaign = true, canManageOrganization = true }: { children: React.ReactNode; organizationName?: string; email?: string; live?: boolean; platformAdmin?: boolean; canCreateCampaign?: boolean; canManageOrganization?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    { href: "/dashboard", label: "Resumen", icon: BarChart3, visible: true },
    { href: "/dashboard/wallet", label: "Saldo y retiros", icon: WalletCards, visible: canManageOrganization },
    { href: "/dashboard/campaigns/new", label: "Nueva campaña", icon: Plus, visible: canCreateCampaign },
    { href: "/dashboard/settings", label: "Configuración", icon: Settings, visible: canManageOrganization },
  ];
  const signOut = async () => { if (live) await createClient().auth.signOut(); else window.localStorage.removeItem("fondo-demo-session"); router.replace(live ? "/login" : "/"); router.refresh(); };
  return <div className="min-h-screen bg-muted/35"><aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card p-5 lg:block"><Logo href="/dashboard" /><div className="mt-8 rounded-2xl bg-secondary p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organización</p><p className="mt-1 font-semibold">{organizationName}</p><p className="truncate text-xs text-muted-foreground">{email}</p></div><nav className="mt-6 space-y-1">{links.filter((item) => item.visible).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground", pathname === href && "bg-secondary text-secondary-foreground")}><Icon className="size-4" />{label}</Link>)}{platformAdmin ? <Link href="/admin/withdrawals" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><ShieldCheck className="size-4" />Administrar retiros</Link> : null}</nav><div className="absolute bottom-5 left-5 right-5"><button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><LogOut className="size-4" />Cerrar sesión</button></div></aside><div className="lg:pl-64"><header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-8"><div className="lg:hidden"><Logo href="/dashboard" compact /></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleDollarSign className="size-4 text-primary" /><span>{live ? "Panel privado" : "Modo demo seguro"}</span></div>{canCreateCampaign ? <Link href="/dashboard/campaigns/new" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Crear campaña</Link> : <span className="text-sm text-muted-foreground">Acceso compartido</span>}</header><main className="mx-auto max-w-7xl p-4 py-8 lg:p-8">{children}</main></div></div>;
}
