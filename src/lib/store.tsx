"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Campaign, FondoState, Payment } from "@/lib/types";
import { createId } from "@/lib/utils";

const STORAGE_KEY = "fondo-demo-state-v1";

interface StoreValue extends FondoState {
  ready: boolean;
  createCampaign: (input: Pick<Campaign, "title" | "description" | "type" | "ticketCount" | "priceMinor" | "goalMinor" | "endsAt">) => Campaign;
  reserveTicket: (campaignId: string, number: number) => { reservationId: string; expiresAt: string };
  completeDemoPayment: (input: { campaignId: string; number: number; name: string; email: string; reservationId: string }) => Payment;
  resetDemo: () => void;
}

const FondoStore = createContext<StoreValue | null>(null);

function releaseExpired(state: FondoState): FondoState {
  const now = Date.now();
  return {
    ...state,
    campaigns: state.campaigns.map((campaign) => ({
      ...campaign,
      tickets: campaign.tickets.map((ticket) => ticket.status === "RESERVED" && ticket.reservedUntil && Date.parse(ticket.reservedUntil) <= now
        ? { id: ticket.id, number: ticket.number, status: "AVAILABLE" }
        : ticket),
    })),
  };
}

export function FondoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FondoState>(DEMO_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    queueMicrotask(() => {
      if (saved) {
        try { setState(releaseExpired(JSON.parse(saved) as FondoState)); } catch { /* retain safe seed */ }
      }
      setReady(true);
    });
  }, []);

  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [ready, state]);

  const createCampaign = useCallback<StoreValue["createCampaign"]>((input) => {
    const slug = input.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const id = createId("campaign");
    const campaign: Campaign = {
      ...input, id, slug, organizationId: "org_demo", organizationName: "Club Deportivo Los Andes",
      organizationSlug: "club-los-andes", status: "ACTIVE", currency: "ARS", createdAt: new Date().toISOString(),
      tickets: input.type === "RAFFLE" ? Array.from({ length: input.ticketCount }, (_, i) => ({ id: `${id}_${i + 1}`, number: i + 1, status: "AVAILABLE" })) : [],
    };
    setState((current) => ({ ...current, campaigns: [campaign, ...current.campaigns] }));
    return campaign;
  }, []);

  const reserveTicket = useCallback<StoreValue["reserveTicket"]>((campaignId, number) => {
    const reservationId = createId("reservation");
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const ticket = state.campaigns.find((campaign) => campaign.id === campaignId)?.tickets.find((item) => item.number === number);
    const isExpired = ticket?.status === "RESERVED" && ticket.reservedUntil && Date.parse(ticket.reservedUntil) <= Date.now();
    if (!ticket) throw new Error("No encontramos ese número.");
    if (ticket.status !== "AVAILABLE" && !isExpired) throw new Error("Ese número ya no está disponible.");
    setState((current) => ({
      ...current,
      campaigns: current.campaigns.map((campaign) => campaign.id !== campaignId ? campaign : {
        ...campaign,
        tickets: campaign.tickets.map((ticket) => {
          if (ticket.number !== number) return ticket;
          const isExpired = ticket.status === "RESERVED" && ticket.reservedUntil && Date.parse(ticket.reservedUntil) <= Date.now();
          if (ticket.status !== "AVAILABLE" && !isExpired) throw new Error("Ese número ya no está disponible.");
          return { ...ticket, status: "RESERVED", reservationId, reservedUntil: expiresAt };
        }),
      }),
    }));
    return { reservationId, expiresAt };
  }, [state.campaigns]);

  const completeDemoPayment = useCallback<StoreValue["completeDemoPayment"]>((input) => {
    const campaign = state.campaigns.find((item) => item.id === input.campaignId);
    if (!campaign) throw new Error("Campaña no encontrada.");
    const ticket = campaign.tickets.find((item) => item.number === input.number);
    if (!ticket || ticket.status !== "RESERVED" || ticket.reservationId !== input.reservationId) throw new Error("La reserva ya no es válida.");
    const existing = state.payments.find((item) => item.campaignId === input.campaignId && item.ticketNumber === input.number && item.status === "COMPLETED");
    if (existing) return existing;
    const payment: Payment = {
      id: createId("payment"), campaignId: input.campaignId, participantName: input.name, participantEmail: input.email,
      ticketNumber: input.number, localCurrency: campaign.currency, localAmountMinor: campaign.priceMinor,
      provider: "mock", providerOrderId: createId("demo_order"), status: "COMPLETED",
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    };
    setState((current) => ({
      payments: [payment, ...current.payments],
      campaigns: current.campaigns.map((item) => item.id !== input.campaignId ? item : ({
        ...item, tickets: item.tickets.map((ticket) => ticket.number === input.number && ticket.reservationId === input.reservationId
          ? { ...ticket, status: "PAID", paymentId: payment.id, reservedUntil: undefined }
          : ticket),
      })),
    }));
    return payment;
  }, [state]);

  const resetDemo = useCallback(() => setState(DEMO_STATE), []);
  const value = useMemo(() => ({ ...state, ready, createCampaign, reserveTicket, completeDemoPayment, resetDemo }), [state, ready, createCampaign, reserveTicket, completeDemoPayment, resetDemo]);
  return <FondoStore.Provider value={value}>{children}</FondoStore.Provider>;
}

export function useFondoStore() {
  const value = useContext(FondoStore);
  if (!value) throw new Error("useFondoStore must be used within FondoStoreProvider");
  return value;
}
