import Link from "next/link";
import { Sprout } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return <Link href={href} className="inline-flex items-center gap-2 font-bold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Sprout className="size-5" /></span>{!compact && <span>{APP_CONFIG.name}</span>}</Link>;
}
