import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="text-sm font-semibold text-primary">404</p><h1 className="mt-2 text-3xl font-bold">No encontramos esta página</h1><p className="mt-3 text-muted-foreground">Puede que el enlace haya cambiado o la campaña ya no esté disponible.</p><Button asChild className="mt-6"><Link href="/">Volver al inicio</Link></Button></div></main>; }
