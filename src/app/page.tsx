import type { Metadata } from "next";
import { SiteHeader } from "@/components/shared/site-header";
import { OperatingAccountLanding } from "@/components/home/operating-account-landing";

export const metadata: Metadata = {
  title: "Fondo — La cuenta operativa para organizar tus ingresos",
  description: "Recibe pagos, separa tus ingresos y administra cuotas, colectas, rifas, eventos y ventas desde una sola cuenta operativa.",
};

export default function Home() {
  return <><SiteHeader /><OperatingAccountLanding /><footer className="border-t py-8 text-center text-sm text-muted-foreground">© 2026 Fondo · Powered by P2P.me · Construido para la hackathon P2P.me</footer></>;
}
