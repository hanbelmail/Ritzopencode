import { CHECKOUT_REMINDER_TEMPLATE, QUOTE_REMINDER_TEMPLATE } from "../lib/defaults.js";
export const REMINDER_LEASE_MS = 60_000;
export const REMINDER_MAX_ATTEMPTS = 3;
const DAY_MS = 86_400_000;

export type ReminderKind = "quoteReminder" | "checkoutReminder";

export function reminderSettings(settings: any) {
  return {
    quoteReminderSmsEnabled: settings.quoteReminderSmsEnabled === true,
    checkoutReminderSmsEnabled: settings.checkoutReminderSmsEnabled === true,
    checkoutReminderTime: settings.checkoutReminderTime || "10:00",
    quoteReminderSmsTemplate: settings.quoteReminderSmsTemplate ?? QUOTE_REMINDER_TEMPLATE,
    checkoutReminderSmsTemplate: settings.checkoutReminderSmsTemplate ?? CHECKOUT_REMINDER_TEMPLATE,
  };
}

export function validateReminderSettings(settings: any) {
  const values = reminderSettings(settings);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.checkoutReminderTime)) throw new Error("Checkout reminder time must use HH:MM Hawaii time");
  for (const kind of ["quoteReminder", "checkoutReminder"] as const) {
    const template = values[`${kind}SmsTemplate`];
    if (typeof template !== "string" || !template.trim() || template.length > 1600) throw new Error("Reminder templates must contain 1–1600 characters");
    const allowed = new Set(["guestName", "ticketUrl", "checkIn", "checkOut", "quoteExpiryHawaii"]);
    for (const match of template.matchAll(/\{\{?([^{}]+)\}?\}/g)) {
      if (!allowed.has(match[1])) throw new Error(`Unsupported reminder placeholder: ${match[1]}`);
    }
    if (kind === "quoteReminder" && (!/\{\{?ticketUrl\}?\}/.test(template) || !/\{\{?quoteExpiryHawaii\}?\}/.test(template))) throw new Error("Quote reminder must include {ticketUrl} and {quoteExpiryHawaii}");
  }
  return values;
}

function dateOnly(value: any) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function reminderPlan(ticket: any, kind: ReminderKind, settings: any) {
  if (kind === "quoteReminder") {
    const deadline = Date.parse(ticket.quoteExpiresAt || "");
    if (ticket.status !== "PRICE SENT" || !Number.isFinite(Number(ticket.rateOffered)) || !(Number(ticket.rateOffered) > 0) || !Number.isFinite(deadline) || !dateOnly(ticket.checkIn) || !dateOnly(ticket.checkOut) || ticket.checkIn >= ticket.checkOut) return null;
    return { key: `quote-reminder:${ticket.id}:${ticket.quoteRevision || 0}`, dueAt: deadline - DAY_MS, deadline, quoteRevision: ticket.quoteRevision || 0, quoteToken: ticket.quoteToken || "", checkIn: ticket.checkIn || "", checkOut: ticket.checkOut || "" };
  }
  if (ticket.status !== "BOOKING CONFIRMED" || !String(ticket.reservationConfirmationNumber || "").trim() || !dateOnly(ticket.checkIn) || !dateOnly(ticket.checkOut) || ticket.checkIn >= ticket.checkOut) return null;
  const sendTime = reminderSettings(settings).checkoutReminderTime;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) return null;
  // Hawaii is UTC−10 year-round; subtract a calendar day without host timezone/DST arithmetic.
  const dueAt = Date.parse(`${ticket.checkOut}T${sendTime}:00-10:00`) - DAY_MS;
  const deadline = Date.parse(`${ticket.checkOut}T00:00:00-10:00`);
  // One acceptance per reservation, including after a checkout-date edit.
  return { key: `checkout-reminder:${ticket.id}`, dueAt, deadline, checkIn: ticket.checkIn, checkOut: ticket.checkOut, quoteRevision: ticket.quoteRevision || 0, quoteToken: ticket.quoteToken || "" };
}

export function sameReminderPlan(row: any, plan: any) {
  return ["key", "dueAt", "deadline", "quoteRevision", "quoteToken", "checkIn", "checkOut"].every((field) => row[field] === plan[field]);
}

export function reminderHawaiiDate(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function renderReminder(kind: ReminderKind, ticket: any, settings: any, appUrl: string) {
  const url = new URL(appUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid public CRM URL");
  const template = validateReminderSettings(settings)[`${kind}SmsTemplate`];
  const values: Record<string, string> = {
    guestName: (ticket.guests || []).find(Boolean) || "Guest",
    checkIn: ticket.checkIn || "",
    checkOut: ticket.checkOut || "",
    ticketUrl: new URL(`/ticket/${encodeURIComponent(ticket.id)}`, url.origin).toString(),
    quoteExpiryHawaii: ticket.quoteExpiresAt ? new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Honolulu", dateStyle: "medium", timeStyle: "short" }).format(new Date(ticket.quoteExpiresAt)) : "",
  };
  const content = template.replace(/\{\{?([^{}]+)\}?\}/g, (_: string, name: string) => values[name] ?? "").trim();
  if (!content || content.length > 1600) throw new Error("Rendered reminder must contain 1–1600 characters");
  return content;
}
