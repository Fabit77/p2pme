"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateOrganizationNameAction } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrganizationNameForm({ defaultValue }: { defaultValue: string }) {
  const [name, setName] = useState(defaultValue);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    startTransition(async () => {
      try { await updateOrganizationNameAction(name); setMessage("Nombre guardado."); }
      catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos guardarlo."); }
    });
  };
  return <form onSubmit={submit} className="grid gap-3"><label className="grid gap-2 text-sm font-medium">Nombre de la organización<Input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label>{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}<Button className="w-fit" disabled={pending}>{pending ? "Guardando…" : "Guardar nombre"}</Button></form>;
}
