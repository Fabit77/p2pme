import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { SiteSignOutButton } from "@/components/shared/site-sign-out-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = await getCurrentUser();
  let accountName: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    accountName = profile?.display_name
      ?? (typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : null)
      ?? user.email?.split("@")[0]
      ?? "Mi cuenta";
  }

  return <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"><Logo /><nav className="flex min-w-0 items-center gap-2">{user && accountName ? <><Button asChild variant="ghost" className="max-w-40 truncate sm:max-w-64"><Link href="/dashboard">{accountName}</Link></Button><SiteSignOutButton /></> : <><Button asChild variant="ghost"><Link href="/login">Iniciar sesión</Link></Button><Button asChild><Link href="/login?mode=register">Crear cuenta</Link></Button></>}</nav></div></header>;
}
