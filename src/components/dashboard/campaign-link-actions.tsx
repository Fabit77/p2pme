"use client";

import Link from "next/link";
import { ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CampaignLinkActions({ href }: { href: string }) {
  return <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={href} target="_blank"><ExternalLink className="size-4" />Página pública</Link></Button><Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${href}`)}><Link2 className="size-4" />Copiar enlace</Button></div>;
}
