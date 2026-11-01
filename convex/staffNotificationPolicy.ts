export const STAFF_ALERT_MAX_ATTEMPTS = 5;
export const STAFF_ALERT_LEASE_MS = 60_000;
// Resend retains idempotency keys for 24 hours. Never replay an ambiguous send beyond that window.
export const STAFF_ALERT_RETRY_WINDOW_MS = 23 * 60 * 60_000;
export const QUOTE_STALLED_MS = 10 * 60_000;
export const STAFF_ALERT_RETRY_DELAYS = [30_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

export function activeStaffEmails(settings: any): string[] {
  return [...new Set((settings.staffEmailRecipients || [])
    .filter((recipient: any) => typeof recipient === "string" || recipient?.active !== false)
    .map((recipient: any) => String(typeof recipient === "string" ? recipient : recipient?.email || "").trim().toLowerCase())
    .filter(Boolean))] as string[];
}

export function staffAlertSkipReason(notification: any, ticket: any, conversation: any, settings: any): string | null {
  if (!settings.emailAlertsEnabled) return "Staff email alerts are disabled";
  if (notification.kind === "newQuote" && settings.quoteAlertEnabled === false) return "New quote alert is disabled";
  if (notification.kind !== "newQuote" && settings.staffAttentionEmailEnabled === false) return "Needs attention email alerts are disabled";
  if (!activeStaffEmails(settings).length) return "No active staff email recipients";
  if (notification.ticketId && !ticket) return "Ticket no longer exists";
  if (ticket?.status === "CANCELLED") return "Ticket was cancelled";
  if (notification.quoteRevision !== undefined && (ticket?.quoteRevision || 0) !== notification.quoteRevision) return "Superseded quote round";
  // A new-inquiry alert describes an event, not the ticket's current pricing status.
  if (notification.kind === "newQuote" && ticket?.quoteAlertEmailSentAt) return "New quote alert already accepted";
  if (["quoteFailure", "quoteStalled", "quoteWebhookFailure"].includes(notification.kind)) {
    if (!["QUOTE REQUESTED", "QUOTE"].includes(ticket?.status)) return "Quote no longer needs attention";
    if ((ticket?.quoteRevision || 0) !== notification.quoteRevision) return "Superseded quote round";
    if (notification.kind === "quoteFailure" && !ticket?.quoteError) return "Quote error was cleared";
  }
  if (notification.kind === "handoff" && conversation?.status !== "human_required") return "Conversation no longer needs human assistance";
  if (notification.resolvedAt) return "Issue was resolved";
  return null;
}

export function canRetryStaffAlert(notification: any, now: number): boolean {
  return notification.attempts < STAFF_ALERT_MAX_ATTEMPTS &&
    (!notification.firstAttemptAt || now - Date.parse(notification.firstAttemptAt) < STAFF_ALERT_RETRY_WINDOW_MS);
}

export function retryableEmailStatus(status: number): boolean {
  return [408, 425, 429].includes(status) || status >= 500;
}

export function staffAlertTitle(kind: string): string {
  return ({ newQuote: "New quote request", quoteFailure: "Quote lookup failed", quoteStalled: "Quote needs review (10 minutes)", quoteWebhookFailure: "Quote automation delivery failed", handoff: "Sona needs human assistance", deliveryFailure: "Notification delivery failed" } as Record<string, string>)[kind] || "Staff alert";
}

export function buildStaffAlertEmail(notification: any, ticket: any, conversation: any, appUrl: string) {
  const url = new URL(appUrl);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid PUBLIC_APP_URL or SITE_URL");
  const path = notification.conversationId ? `/sara-dashboard?conversation=${encodeURIComponent(notification.conversationId)}` : notification.ticketId ? `/new?id=${encodeURIComponent(notification.ticketId)}` : "/attention";
  const link = new URL(path, url.origin).toString();
  const guests = (ticket?.guests || conversation?.collected?.guests || []).filter(Boolean).join(", ") || "Guest";
  const title = staffAlertTitle(notification.kind);
  const text = [title, "", `Guests: ${guests}`, ...(ticket ? [
    `Ticket: ${ticket.id}`, `Current status: ${ticket.status}`, `Check-in: ${ticket.checkIn || "Not provided"}`,
    `Check-out: ${ticket.checkOut || "Not provided"}`, `Email: ${ticket.email || "Not provided"}`,
    `Phone: ${ticket.phone || "Not provided"}`, `Room: ${ticket.roomType || "Not provided"}`,
    `Source: ${ticket.sourceChannel || "CRM"}`,
  ] : []), ...(notification.reason ? ["", notification.reason] : []), "", `Open CRM: ${link}`].join("\n");
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return { subject: `${title}: ${guests}`.replace(/[\r\n]/g, " ").slice(0, 200), text, html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escaped}</div>` };
}
