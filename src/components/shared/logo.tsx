import Link from "next/link";
import Image from "next/image";

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return <Link href={href} className="inline-flex items-center" aria-label="Fondo"><Image src={compact ? "/brand/fondo-mark-no-plant.svg" : "/brand/fondo-logo-no-plant.svg"} alt="Fondo" width={compact ? 40 : 137} height={40} priority /></Link>;
}
