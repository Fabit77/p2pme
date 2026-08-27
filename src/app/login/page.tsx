import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function LoginPage() { return <main className="grid min-h-screen place-items-center p-4"><Card className="w-full max-w-md"><CardHeader className="pt-7"><Logo /><CardTitle className="pt-6 text-2xl">Organiza los cobros de tu comunidad</CardTitle><p className="text-sm leading-6 text-muted-foreground">Ingresa con un enlace seguro o explora la experiencia de demostración.</p></CardHeader><CardContent><AuthForm /><p className="mt-6 text-center text-xs text-muted-foreground">Al continuar aceptas los términos de uso. <Link href="/" className="underline">Volver al inicio</Link></p></CardContent></Card></main>; }
