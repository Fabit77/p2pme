"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Campaign, FondoState, Payment } from "@/lib/types";
import { createId } from "@/lib/utils";

const STORAGE_KEY = "fondo-demo-state-v1";

interface StoreValue extends FondoState {
  ready: boolean;
  createCampaign: (input: Pick<Campaign, "title" | "description" | "type" | "ticketCount" | "priceMinor" | "goalMinor" | "endsAt">) => Campaign;
  reserveTickets: (campaignId: string, numbers: number[]) => { reservationIds: string[]; expiresAt: string };
  completeDemoPayment: (input: { campaignId: string; numbers: number[]; name: string; email: string; reservationIds: string[] }) => Payment;
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

  const reserveTickets = useCallback<StoreValue["reserveTickets"]>((campaignId, numbers) => {
    const uniqueNumbers = [...new Set(numbers)].sort((a, b) => a - b);
    if (!uniqueNumbers.length) throw new Error("Selecciona al menos un número.");
    const reservationIds = uniqueNumbers.map(() => createId("reservation"));
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const campaign = state.campaigns.find((item) => item.id === campaignId);
    const selectedTickets = uniqueNumbers.map((number) => campaign?.tickets.find((ticket) => ticket.number === number));
    if (selectedTickets.some((ticket) => !ticket)) throw new Error("No encontramos uno de los números.");
    const unavailable = selectedTickets.find((ticket) => ticket && ticket.status !== "AVAILABLE" && !(ticket.status === "RESERVED" && ticket.reservedUntil && Date.parse(ticket.reservedUntil) <= Date.now()));
    if (unavailable) throw new Error(`El número ${unavailable.number} ya no está disponible.`);
    const reservationByNumber = new Map(uniqueNumbers.map((number, index) => [number, reservationIds[index]]));
    setState((current) => ({
      ...current,
      campaigns: current.campaigns.map((item) => item.id !== campaignId ? item : {
        ...item,
        tickets: item.tickets.map((ticket) => {
          const reservationId = reservationByNumber.get(ticket.number);
          return reservationId ? { ...ticket, status: "RESERVED", reservationId, reservedUntil: expiresAt } : ticket;
        }),
      }),
    }));
    return { reservationIds, expiresAt };
  }, [state.campaigns]);

  const completeDemoPayment = useCallback<StoreValue["completeDemoPayment"]>((input) => {
    const campaign = state.campaigns.find((item) => item.id === input.campaignId);
    if (!campaign) throw new Error("Campaña no encontrada.");
    const uniqueNumbers = [...new Set(input.numbers)].sort((a, b) => a - b);
    if (uniqueNumbers.length !== input.reservationIds.length) throw new Error("La reserva ya no es válida.");
    const reservations = new Map(uniqueNumbers.map((number, index) => [number, input.reservationIds[index]]));
    const valid = uniqueNumbers.every((number) => {
      const ticket = campaign.tickets.find((item) => item.number === number);
      return ticket?.status === "RESERVED" && ticket.reservationId === reservations.get(number);
    });
    if (!valid) throw new Error("Uno o más números ya no están reservados.");
    const existing = state.payments.find((item) => item.campaignId === input.campaignId && uniqueNumbers.every((number) => (item.ticketNumbers ?? [item.ticketNumber]).includes(number)) && item.status === "COMPLETED");
    if (existing) return existing;
    const payment: Payment = {
      id: createId("payment"), campaignId: input.campaignId, participantName: input.name, participantEmail: input.email,
      ticketNumber: uniqueNumbers[0], ticketNumbers: uniqueNumbers, localCurrency: campaign.currency, localAmountMinor: campaign.priceMinor * uniqueNumbers.length,
      provider: "mock", providerOrderId: createId("demo_order"), status: "COMPLETED",
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    };
    setState((current) => ({
      payments: [payment, ...current.payments],
      campaigns: current.campaigns.map((item) => item.id !== input.campaignId ? item : ({
        ...item, tickets: item.tickets.map((ticket) => reservations.get(ticket.number) === ticket.reservationId
          ? { ...ticket, status: "PAID", paymentId: payment.id, reservedUntil: undefined }
          : ticket),
      })),
    }));
    return payment;
  }, [state]);

  const resetDemo = useCallback(() => setState(DEMO_STATE), []);
  const value = useMemo(() => ({ ...state, ready, createCampaign, reserveTickets, completeDemoPayment, resetDemo }), [state, ready, createCampaign, reserveTickets, completeDemoPayment, resetDemo]);
  return <FondoStore.Provider value={value}>{children}</FondoStore.Provider>;
}

export function useFondoStore() {
  const value = useContext(FondoStore);
  if (!value) throw new Error("useFondoStore must be used within FondoStoreProvider");
  return value;
}
