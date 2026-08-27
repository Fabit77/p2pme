export const APP_CONFIG = {
  name: "Fondo",
  tagline: "Cobros simples para comunidades.",
  description: "Cobros, conciliación y trazabilidad para comunidades.",
  reservationMinutes: 10,
  demoOrganizationSlug: "club-los-andes",
  demoCampaignSlug: "rifa-viaje-sub-15",
} as const;

export const IS_P2P_LIVE = process.env.NEXT_PUBLIC_P2P_MODE === "live";
