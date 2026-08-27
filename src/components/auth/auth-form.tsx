"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm() {
  const router = useRouter(); const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setMessage(""); try { const { createClient } = await import("@/lib/supabase/client"); const supabase = createClient(); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/dashboard` } }); if (error) throw error; setMessage("Te enviamos un enlace seguro. Revisa tu correo."); } catch (cause) { setMessage(cause instanceof Error && cause.message.includes("configurado") ? "Supabase aún no está configurado. Puedes entrar al demo." : "No pudimos enviar el enlace. Intenta nuevamente."); } finally { setLoading(false); } };
  const enterDemo = () => { window.localStorage.setItem("fondo-demo-session", "organizer"); router.push("/dashboard"); };
  return <div><form onSubmit={submit} className="grid gap-4"><label className="grid gap-2 text-sm font-medium">Email<div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="tu@email.com" /></div></label><Button type="submit" disabled={loading}>{loading ? "Enviando…" : "Continuar con email"}</Button></form>{message && <p role="status" className="mt-4 rounded-xl bg-muted p-3 text-sm">{message}</p>}<div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" /></div><Button variant="outline" className="w-full" onClick={enterDemo}>Entrar al demo sin cuenta</Button></div>;
}
