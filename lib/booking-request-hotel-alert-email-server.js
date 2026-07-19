import { api } from "@/convex/_generated/api";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { getAutomationServiceKey } from "@/lib/convex-server";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function activeHotelEmails(settings) {
  return (settings.hotelEmailRecipients || [])
    .map((recipient) => {
      if (typeof recipient === "string") {
        return { email: recipient.trim(), active: true };
      }

      return {
        email: String(recipient?.email || "").trim(),
        active: recipient?.active !== false,
      };
    })
    .filter((recipient) => recipient.email && recipient.active)
    .map((recipient) => recipient.email);
}

function fmtRequestDate(value) {
  const [year, month, day] = String(value || "").split("T")[0].split("-");
  if (!year || !month || !day) return "Not provided";
  return `${Number(day)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1]} ${year}`;
}

function buildEmail(ticket) {
  const guestNames = (ticket.guests || []).filter(Boolean).join(", ") || "Guest";
  const stayDates = `${fmtRequestDate(ticket.checkIn)} - ${fmtRequestDate(ticket.checkOut)}`;
  const text = [
    `May we please reserve for ${guestNames}`,
    stayDates,
    "Guest will pay cleaning fee, normal check in and check out.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#25211d;font-size:15px;line-height:1.7;">
      <p style="margin:0 0 10px;">May we please reserve for ${escapeHtml(guestNames)}</p>
      <p style="margin:0 0 10px;">${escapeHtml(stayDates)}</p>
      <p style="margin:0;">Guest will pay cleaning fee, normal check in and check out.</p>
    </div>`;

  return { subject: "1609E", text, html };
}

async function sendResendEmail({ to, subject, html, text }) {
  const apiKey = requireEnv("AUTH_RESEND_KEY");
  const from = requireEnv("AUTH_RESEND_FROM");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    let details = "";
    try {
      details = JSON.stringify(await response.json());
    } catch {
      details = await response.text();
    }
    throw new Error(`Resend error: ${details}`);
  }
}

export async function sendBookingRequestHotelAlertEmail({ client, ticket }) {
  if (!ticket) return { sent: false, skipped: true, reason: "Ticket not found" };
  if (ticket.status !== "PAYMENT VERIFIED") {
    return { sent: false, skipped: true, reason: "Ticket is not PAYMENT VERIFIED" };
  }
  if (ticket.bookingRequestHotelEmailSentAt) {
    return { sent: false, skipped: true, reason: "Booking request hotel alert already sent" };
  }

  const settings = { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get, { serviceKey: getAutomationServiceKey() })) || {}) };
  if (!settings.emailAlertsEnabled) {
    return { sent: false, skipped: true, reason: "Email alerts are disabled" };
  }
  if (!settings.bookingRequestHotelAlertEnabled) {
    return { sent: false, skipped: true, reason: "Booking request hotel alert is disabled" };
  }

  const to = activeHotelEmails(settings);
  if (!to.length) {
    return { sent: false, skipped: true, reason: "No active hotel email recipients" };
  }

  await sendResendEmail({ to, ...buildEmail(ticket) });

  const bookingRequestHotelEmailSentAt = new Date().toISOString();
  const updated = await client.mutation(api.tickets.update, {
    id: ticket.id,
    data: { bookingRequestHotelEmailSentAt },
    serviceKey: getAutomationServiceKey(),
  });

  return { sent: true, ticket: updated, recipients: to.length };
}
