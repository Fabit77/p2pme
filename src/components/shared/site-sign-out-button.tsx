"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SiteSignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const signOut = () => {
    startTransition(async () => {
      await createClient().auth.signOut();
      router.replace("/");
      router.refresh();
    });
  };

  return <Button type="button" onClick={signOut} disabled={pending}>{pending ? "Cerrando…" : "Cerrar sesión"}</Button>;
}
