"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { createOrganizationAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function OrganizationOnboarding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createOrganizationAction(name);
        router.refresh();
      } catch {
        setError("No pudimos crear la organización. Prueba con otro nombre.");
      }
    });
  };
  return <Card className="mx-auto max-w-xl"><CardHeader><span className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"><Building2 className="size-6" /></span><CardTitle className="pt-3 text-2xl">Crea tu espacio de organización</CardTitle><p className="text-sm leading-6 text-muted-foreground">Aquí vivirán únicamente tus rifas, colectas, enlaces y reportes.</p></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4"><label className="grid gap-2 text-sm font-medium">Nombre de la organización<Input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Club Deportivo Central" /></label>{error ? <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}<Button disabled={pending}>{pending ? "Creando…" : "Crear mi organización"}</Button></form></CardContent></Card>;
}
