"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => searchParams.get("mode") === "register" ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Cuenta creada. Revisa tu correo para confirmar el acceso.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "";
      setMessage(detail.includes("Invalid login") ? "Email o contraseña incorrectos." : detail || "No pudimos completar el acceso.");
    } finally {
      setLoading(false);
    }
  };

  const enterDemo = () => {
    window.localStorage.setItem("fondo-demo-session", "organizer");
    router.push("/dashboard");
  };

  return <div>
    <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm">
      <button type="button" onClick={() => { setMode("login"); setMessage(""); }} className={`rounded-lg px-3 py-2 font-medium ${mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Ingresar</button>
      <button type="button" onClick={() => { setMode("register"); setMessage(""); }} className={`rounded-lg px-3 py-2 font-medium ${mode === "register" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Crear cuenta</button>
    </div>
    <form onSubmit={submit} className="grid gap-4">
      {mode === "register" && <label className="grid gap-2 text-sm font-medium">Tu nombre<div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="pl-9" autoComplete="name" /></div></label>}
      <label className="grid gap-2 text-sm font-medium">Email<div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-9" placeholder="tu@email.com" autoComplete="email" /></div></label>
      <label className="grid gap-2 text-sm font-medium">Contraseña<div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="pl-9" autoComplete={mode === "login" ? "current-password" : "new-password"} /></div></label>
      <Button type="submit" disabled={loading || !IS_SUPABASE_CONFIGURED}>{loading ? "Procesando…" : mode === "login" ? "Ingresar" : "Crear mi cuenta"}</Button>
    </form>
    {message && <p role="status" className="mt-4 rounded-xl bg-muted p-3 text-sm">{message}</p>}
    {!IS_SUPABASE_CONFIGURED && <><p className="mt-4 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">Supabase todavía no está conectado en este entorno. El demo sigue disponible.</p><div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" /></div><Button variant="outline" className="w-full" onClick={enterDemo}>Entrar al demo sin cuenta</Button></>}
  </div>;
}
