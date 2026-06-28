import { api } from "@/convex/_generated/api";
import { fmtDate } from "@/lib/calc";
import { DEFAULT_SETTINGS } from "@/lib/defaults";

const HOTEL_ALERT_SUBJECT = "1609E";

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

function buildEmail(ticket) {
  const guestName = (ticket.guests || []).filter(Boolean).join(", ") || "Guest";
  const stayDates = `${fmtDate(ticket.checkIn)} - ${fmtDate(ticket.checkOut)}`;
  const text = [
    `May we please reserve for ${guestName}`,
    stayDates,
    "Guest will pay cleaning fee, normal check in and check out.",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#25211d;font-size:15px;line-height:1.7;">
      <p style="margin:0 0 10px;">May we please reserve for ${escapeHtml(guestName)}</p>
      <p style="margin:0 0 10px;">${escapeHtml(stayDates)}</p>
      <p style="margin:0;">Guest will pay cleaning fee, normal check in and check out.</p>
    </div>`;

  return { subject: HOTEL_ALERT_SUBJECT, text, html };
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

export async function sendBookingConfirmedHotelAlertEmail({ client, ticket }) {
  if (!ticket) return { sent: false, skipped: true, reason: "Ticket not found" };
  if (ticket.status !== "BOOKING CONFIRMED") {
    return { sent: false, skipped: true, reason: "Ticket is not BOOKING CONFIRMED" };
  }
  if (ticket.bookingConfirmedHotelEmailSentAt) {
    return { sent: false, skipped: true, reason: "Booking confirmed hotel alert already sent" };
  }

  const settings = { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get)) || {}) };
  if (!settings.emailAlertsEnabled) {
    return { sent: false, skipped: true, reason: "Email alerts are disabled" };
  }
  if (!settings.bookingConfirmedHotelAlertEnabled) {
    return { sent: false, skipped: true, reason: "Booking confirmed hotel alert is disabled" };
  }

  const to = activeHotelEmails(settings);
  if (!to.length) {
    return { sent: false, skipped: true, reason: "No active hotel email recipients" };
  }

  await sendResendEmail({ to, ...buildEmail(ticket) });

  const bookingConfirmedHotelEmailSentAt = new Date().toISOString();
  const updated = await client.mutation(api.tickets.update, {
    id: ticket.id,
    data: { bookingConfirmedHotelEmailSentAt },
  });

  return { sent: true, ticket: updated, recipients: to.length };
}
