import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !key) throw new Error("Supabase no está configurado."); const store = await cookies(); return createServerClient(url, key, { cookies: { getAll: () => store.getAll(), setAll: (values) => { try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Component: proxy refreshes cookies */ } } } }); }
