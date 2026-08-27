import type { Metadata } from "next";
import { APP_CONFIG } from "@/lib/config";
import { FondoStoreProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_CONFIG.name} — ${APP_CONFIG.tagline}`, template: `%s | ${APP_CONFIG.name}` },
  description: APP_CONFIG.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased"><FondoStoreProvider>{children}</FondoStoreProvider></body>
    </html>
  );
}
