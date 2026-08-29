"use client";

import Image from "next/image";
import { FormEvent, useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2, UserPlus, X } from "lucide-react";
import {
  archiveCampaignAction,
  inviteCampaignMemberAction,
  removeCampaignInvitationAction,
  removeCampaignMemberAction,
  updateCampaignAction,
  updateCampaignImageAction,
  updateCampaignMemberRoleAction,
} from "@/app/dashboard/campaigns/[id]/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Member = { id: string; email: string; role: "editor" | "viewer" };
type Invitation = { id: string; email: string; role: "editor" | "viewer" };

export function CampaignAdminPanel({ campaign, members, invitations }: {
  campaign: { id: string; title: string; description: string; visibility: "PUBLIC" | "PRIVATE"; coverImageUrl: string | null };
  members: Member[];
  invitations: Invitation[];
}) {
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description);
  const [visibility, setVisibility] = useState(campaign.visibility);
  const [imageUrl, setImageUrl] = useState(campaign.coverImageUrl);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (work: () => Promise<unknown>, success: string) => {
    setMessage("");
    startTransition(async () => {
      try { await work(); setMessage(success); }
      catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos completar la acción."); }
    });
  };

  const saveCampaign = (event: FormEvent) => {
    event.preventDefault();
    run(() => updateCampaignAction({ campaignId: campaign.id, title, description, visibility }), "Cambios guardados.");
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Usa una imagen JPG, PNG o WebP de hasta 5 MB."); return;
    }
    setMessage("");
    startTransition(async () => {
      try {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${campaign.id}/${crypto.randomUUID()}.${extension}`;
        const supabase = createClient();
        const { error } = await supabase.storage.from("campaign-images").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("campaign-images").getPublicUrl(path);
        await updateCampaignImageAction(campaign.id, data.publicUrl);
        setImageUrl(data.publicUrl);
        setMessage("Imagen actualizada.");
      } catch { setMessage("No pudimos subir la imagen. Verifica que la migración de Supabase esté aplicada."); }
    });
  };

  const invite = (event: FormEvent) => {
    event.preventDefault();
    run(async () => { await inviteCampaignMemberAction({ campaignId: campaign.id, email, role }); setEmail(""); }, "Acceso agregado o invitación registrada.");
  };

  return <div className="mt-8 grid gap-6 xl:grid-cols-2">
    <Card>
      <CardHeader><CardTitle>Configuración de campaña</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-muted p-4 sm:flex-row sm:items-center">
          {imageUrl ? <Image src={imageUrl} alt={`Imagen de ${title}`} width={96} height={96} className="size-24 rounded-2xl object-cover" /> : <span className="grid size-24 place-items-center rounded-2xl bg-secondary text-3xl font-bold text-primary">{title.slice(0, 1).toUpperCase()}</span>}
          <div><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => uploadImage(event.target.files?.[0])} /><Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={pending}><ImagePlus className="size-4" />Cambiar imagen</Button><p className="mt-2 text-xs text-muted-foreground">JPG, PNG o WebP · máximo 5 MB.</p></div>
        </div>
        <form onSubmit={saveCampaign} className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">Nombre de la campaña<Input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={100} required /></label>
          <label className="grid gap-2 text-sm font-medium">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={2} maxLength={1000} required className="min-h-28 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          <label className="grid gap-2 text-sm font-medium">Visibilidad<select value={visibility} onChange={(event) => setVisibility(event.target.value as "PUBLIC" | "PRIVATE")} className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="PUBLIC">Pública — cualquiera con el enlace puede aportar</option><option value="PRIVATE">Privada — solo personas autorizadas</option></select></label>
          <Button className="w-fit" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Personas con acceso</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={invite} className="grid gap-3 sm:grid-cols-[1fr_150px_auto]"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="persona@correo.com" required /><select value={role} onChange={(event) => setRole(event.target.value as "editor" | "viewer")} className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="editor">Editor</option><option value="viewer">Lector</option></select><Button disabled={pending}><UserPlus className="size-4" />Agregar</Button></form>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">El editor puede configurar la campaña y administrar accesos. El lector solo puede revisar su actividad. Si el correo todavía no tiene cuenta, el acceso se activará cuando la cree.</p>
        <div className="mt-5 divide-y rounded-xl border">
          {members.map((member) => <div key={member.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"><span className="min-w-0 flex-1 truncate text-sm font-medium">{member.email}</span><select defaultValue={member.role} onChange={(event) => run(() => updateCampaignMemberRoleAction(campaign.id, member.id, event.target.value), "Permiso actualizado.")} className="h-9 rounded-lg border bg-background px-2 text-sm"><option value="editor">Editor</option><option value="viewer">Lector</option></select><Button type="button" variant="ghost" size="icon" aria-label={`Quitar a ${member.email}`} onClick={() => run(() => removeCampaignMemberAction(campaign.id, member.id), "Acceso eliminado.")}><X className="size-4" /></Button></div>)}
          {invitations.map((invitation) => <div key={invitation.id} className="flex items-center gap-3 p-3"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{invitation.email}</span><span className="text-xs text-muted-foreground">Invitación pendiente · {invitation.role === "editor" ? "Editor" : "Lector"}</span></span><Button type="button" variant="ghost" size="icon" aria-label={`Cancelar invitación a ${invitation.email}`} onClick={() => run(() => removeCampaignInvitationAction(campaign.id, invitation.id), "Invitación cancelada.")}><X className="size-4" /></Button></div>)}
          {!members.length && !invitations.length ? <p className="p-4 text-sm text-muted-foreground">Todavía no agregaste colaboradores.</p> : null}
        </div>
      </CardContent>
    </Card>

    <Card className="border-destructive/30 xl:col-span-2">
      <CardHeader><CardTitle className="text-destructive">Eliminar campaña</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">La campaña dejará de aparecer y su enlace ya no recibirá aportes. Los pagos históricos se conservarán.</p><div className="mt-4 flex max-w-lg flex-col gap-3 sm:flex-row"><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Escribe ELIMINAR" /><Button type="button" variant="destructive" disabled={pending || confirmation.toUpperCase() !== "ELIMINAR"} onClick={() => run(() => archiveCampaignAction(campaign.id, confirmation), "Campaña eliminada.")}><Trash2 className="size-4" />Eliminar campaña</Button></div></CardContent>
    </Card>
    {message ? <p role="status" className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-xl">{message}</p> : null}
  </div>;
}
