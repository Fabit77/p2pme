import Link from "next/link";
import Image from "next/image";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return <Link href={href} className="inline-flex items-center" aria-label="Fondo"><span className={compact ? "relative block size-12 overflow-hidden" : "relative block h-[60px] w-[180px]"}><Image src="/brand/fondo-brand.png" alt="Fondo" width={2172} height={724} priority className={compact ? "absolute -left-[17px] -top-[15px] h-[80px] w-[240px] max-w-none mix-blend-multiply" : "block h-[60px] w-[180px] max-w-none mix-blend-multiply"} /></span></Link>;
}
