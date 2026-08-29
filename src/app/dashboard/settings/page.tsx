import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletSettingsForm } from "@/components/dashboard/wallet-settings-form";
import { getOrganizerContext } from "@/lib/auth/session";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  if (!IS_SUPABASE_CONFIGURED) return <div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Configuración</p><h1 className="mt-1 text-3xl font-bold">Organización</h1><Card className="mt-7"><CardContent className="p-6 text-muted-foreground">Conecta Supabase para guardar la configuración.</CardContent></Card></div>;
  const { organization } = await getOrganizerContext();
  if (!organization) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").select("name,country,local_currency,settlement_wallet_address").eq("id", organization.id).single();
  if (error) throw new Error("No pudimos cargar la configuración.");
  return <div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Configuración</p><h1 className="mt-1 text-3xl font-bold">Organización</h1><p className="mt-2 text-muted-foreground">Datos privados usados para administrar tus campañas y retiros.</p><Card className="mt-7"><CardHeader><CardTitle>{data.name}</CardTitle></CardHeader><CardContent className="grid gap-6"><div className="grid gap-4 rounded-xl bg-muted p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">País</p><p className="font-semibold">{data.country}</p></div><div><p className="text-xs text-muted-foreground">Moneda principal</p><p className="font-semibold">{data.local_currency}</p></div></div><WalletSettingsForm defaultValue={data.settlement_wallet_address} /><p className="text-xs leading-5 text-muted-foreground">Esta wallet es el destino sugerido cuando solicitas un retiro. Fondo nunca te pedirá su clave privada o frase semilla.</p></CardContent></Card></div>;
}
