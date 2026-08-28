import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/shared/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function LoginPage() { return <main className="grid min-h-screen place-items-center p-4"><Card className="w-full max-w-md"><CardHeader className="pt-7"><Logo /><CardTitle className="pt-6 text-2xl">Tu panel, tus campañas</CardTitle><p className="text-sm leading-6 text-muted-foreground">Cada cuenta accede únicamente a su organización, rifas, colectas y pagos.</p></CardHeader><CardContent><Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" />}><AuthForm /></Suspense><p className="mt-6 text-center text-xs text-muted-foreground">Al continuar aceptas los términos de uso. <Link href="/" className="underline">Volver al inicio</Link></p></CardContent></Card></main>; }
