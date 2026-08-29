"use client";

import Link from "next/link";
import { MouseEvent, useRef, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CampaignLinkActions({ href, fullUrl, isPublic }: { href: string; fullUrl: string; isPublic: boolean }) {
  const [notice, setNotice] = useState<{ x: number; y: number } | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = async (event: MouseEvent<HTMLButtonElement>) => {
    await navigator.clipboard.writeText(fullUrl);
    setNotice({ x: event.clientX + 10, y: event.clientY + 10 });
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setNotice(null), 1500);
  };
  return <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={href} target="_blank"><ExternalLink className="size-4" />{isPublic ? "Página pública" : "Vista privada"}</Link></Button><Button type="button" variant="outline" onClick={copy}><Link2 className="size-4" />Copiar enlace</Button>{notice ? <span role="status" className="pointer-events-none fixed z-50 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-lg" style={{ left: notice.x, top: notice.y }}>Enlace copiado</span> : null}</div>;
}
