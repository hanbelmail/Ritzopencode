"use client"

import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_SETTINGS, PAYMENT_METHODS } from "@/lib/defaults";

export { DEFAULT_SETTINGS, PAYMENT_METHODS };

export const TICKETS_KEY = "ritz_tickets";
export const SETTINGS_KEY = "ritz_settings";
export const MIGRATION_KEY = "ritz_convex_migrated";

export const STATUSES = ["QUOTE REQUESTED", "PRICE SENT", "PAYMENT SUBMITTED", "PAYMENT VERIFIED", "BOOKING CONFIRMED", "CANCELLED"];

const HOME_PAGE_VARIANTS = ["classic", "new"];

export function normalizeSettings(settings) {
  if (!settings) return { ...DEFAULT_SETTINGS };
  const saved = { ...settings };

  delete saved.faqLink;

  if (saved.roomTypes && typeof saved.roomTypes[0] === "string") {
    saved.roomTypes = saved.roomTypes.map((name) => ({ name, hidden: false }));
  }

  if (saved.paymentInstructions && !saved.paymentMethods) {
    saved.paymentMethods = PAYMENT_METHODS.map((name) => ({
      name,
      instructions: saved.paymentInstructions[name] || "",
      hidden: false,
    }));
    delete saved.paymentInstructions;
  }

  if (!HOME_PAGE_VARIANTS.includes(saved.homePageVariant)) {
    saved.homePageVariant = DEFAULT_SETTINGS.homePageVariant;
  }

  return { ...DEFAULT_SETTINGS, ...saved };
}

export function useSettings() {
  const settings = useQuery(api.settings.get);
  return useMemo(
    () => (settings === undefined ? undefined : normalizeSettings(settings)),
    [settings]
  );
}

export function useTickets() {
  return useQuery(api.tickets.list) || [];
}

export function useTicket(id) {
  return useQuery(api.tickets.get, id ? { id } : "skip");
}

export function useSettingsActions() {
  const saveMutation = useMutation(api.settings.save);
  return {
    saveSettings: (settings) => saveMutation({ settings: normalizeSettings(settings) }),
  };
}

export function useTicketActions() {
  const createMutation = useMutation(api.tickets.create);
  const updateMutation = useMutation(api.tickets.update);
  const deleteMutation = useMutation(api.tickets.remove);

  return {
    createTicket: (data) => createMutation({ data }),
    updateTicket: (id, data) => updateMutation({ id, data }),
    deleteTicket: (id) => deleteMutation({ id }),
  };
}

export function readLegacyStore() {
  if (typeof window === "undefined") return { tickets: [], settings: null };

  const rawTickets = localStorage.getItem(TICKETS_KEY);
  const rawSettings = localStorage.getItem(SETTINGS_KEY);

  return {
    tickets: rawTickets ? JSON.parse(rawTickets) : [],
    settings: rawSettings ? normalizeSettings(JSON.parse(rawSettings)) : null,
  };
}
