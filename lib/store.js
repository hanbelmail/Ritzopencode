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
export const DASHBOARD_DATE_FIELD_OPTIONS = [
  { value: "checkIn", label: "Check-in" },
  { value: "checkOut", label: "Check-out" },
  { value: "createdAt", label: "Quote-created" },
];
export const DASHBOARD_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

const DASHBOARD_VIEWS = ["board", "table"];
const DASHBOARD_DATE_FIELDS = DASHBOARD_DATE_FIELD_OPTIONS.map((option) => option.value);
const DEFAULT_DASHBOARD_PREFERENCES = {
  view: "table",
  search: "",
  selectedStatuses: [],
  dateFilter: { field: "checkIn", from: "", to: "" },
  pageSize: 25,
  visibleColumns: [],
};

const HOME_PAGE_VARIANTS = ["classic", "new"];

function normalizeEmailRecipients(recipients) {
  if (!Array.isArray(recipients)) return [];

  return recipients
    .map((recipient) => {
      if (typeof recipient === "string") {
        return { email: recipient.trim(), active: true };
      }

      return {
        email: String(recipient?.email || "").trim(),
        active: recipient?.active !== false,
      };
    })
    .filter((recipient) => recipient.email);
}

function validDateStamp(value) {
  const stamp = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(stamp) ? stamp : "";
}

function uniqueAllowedValues(values, allowedValues) {
  if (!Array.isArray(values)) return [];

  const allowed = new Set(allowedValues);
  return values.filter((value, index) => allowed.has(value) && values.indexOf(value) === index);
}

export function normalizeDashboardPreferences(preferences, { defaultVisibleColumns = [] } = {}) {
  const saved = preferences && typeof preferences === "object" ? preferences : {};
  const dateFilter = saved.dateFilter && typeof saved.dateFilter === "object" ? saved.dateFilter : {};
  const visibleColumns = uniqueAllowedValues(saved.visibleColumns, defaultVisibleColumns);
  const pageSize = Number(saved.pageSize);

  return {
    ...DEFAULT_DASHBOARD_PREFERENCES,
    view: DASHBOARD_VIEWS.includes(saved.view) ? saved.view : DEFAULT_DASHBOARD_PREFERENCES.view,
    search: typeof saved.search === "string" ? saved.search : DEFAULT_DASHBOARD_PREFERENCES.search,
    selectedStatuses: uniqueAllowedValues(saved.selectedStatuses, STATUSES),
    dateFilter: {
      field: DASHBOARD_DATE_FIELDS.includes(dateFilter.field) ? dateFilter.field : DEFAULT_DASHBOARD_PREFERENCES.dateFilter.field,
      from: validDateStamp(dateFilter.from),
      to: validDateStamp(dateFilter.to),
    },
    pageSize: DASHBOARD_PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_DASHBOARD_PREFERENCES.pageSize,
    visibleColumns: visibleColumns.length > 0 ? visibleColumns : defaultVisibleColumns,
  };
}

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

  saved.emailAlertsEnabled = Boolean(saved.emailAlertsEnabled);
  saved.quoteAlertEnabled = saved.quoteAlertEnabled !== false;
  saved.priceSentGuestEmailEnabled = saved.priceSentGuestEmailEnabled !== false;
  saved.priceSentStaffAlertEnabled = Boolean(saved.priceSentStaffAlertEnabled);
  saved.paymentSubmittedAlertEnabled = Boolean(saved.paymentSubmittedAlertEnabled);
  saved.bookingRequestHotelAlertEnabled = Boolean(saved.bookingRequestHotelAlertEnabled);
  saved.bookingConfirmedHotelAlertEnabled = Boolean(saved.bookingConfirmedHotelAlertEnabled);
  saved.staffEmailRecipients = normalizeEmailRecipients(saved.staffEmailRecipients);
  saved.hotelEmailRecipients = normalizeEmailRecipients(saved.hotelEmailRecipients);

  return { ...DEFAULT_SETTINGS, ...saved };
}

export function useSettings() {
  const settings = useQuery(api.settings.get);
  return useMemo(
    () => (settings === undefined ? undefined : normalizeSettings(settings)),
    [settings]
  );
}

export function useDashboardPreferences(defaultVisibleColumns = []) {
  const preferences = useQuery(api.dashboardPreferences.get);
  return useMemo(
    () => (preferences === undefined || preferences === null ? preferences : normalizeDashboardPreferences(preferences, { defaultVisibleColumns })),
    [preferences, defaultVisibleColumns]
  );
}

export function useTickets() {
  return useQuery(api.tickets.list) || [];
}

export function useTicketPage({ search = "", status = "all", dateFilter = {}, pageSize = 25, cursor = null } = {}) {
  return useQuery(api.tickets.listPage, {
    search: search.trim() || undefined,
    status: status === "all" ? undefined : status,
    dateField: dateFilter.field || "checkIn",
    from: dateFilter.from || undefined,
    to: dateFilter.to || undefined,
    paginationOpts: { numItems: pageSize, cursor },
  });
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

export function useDashboardPreferenceActions(defaultVisibleColumns = []) {
  const saveMutation = useMutation(api.dashboardPreferences.save);
  return useMemo(
    () => ({
      saveDashboardPreferences: (preferences) => saveMutation({ preferences: normalizeDashboardPreferences(preferences, { defaultVisibleColumns }) }),
    }),
    [saveMutation, defaultVisibleColumns]
  );
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
