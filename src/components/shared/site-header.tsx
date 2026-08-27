import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"><Logo /><nav className="flex items-center gap-2"><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/club-los-andes/rifa-viaje-sub-15">Ver demo</Link></Button><Button asChild><Link href="/dashboard">Ir al dashboard</Link></Button></nav></div></header>;
}
