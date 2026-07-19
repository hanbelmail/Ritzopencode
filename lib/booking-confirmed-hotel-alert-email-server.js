import { api } from "@/convex/_generated/api";
import { fmtDate } from "@/lib/calc";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { getR2ObjectAttachment, isBookingConfirmedHotelAlertAttachmentKey } from "@/lib/r2";
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

function buildEmail(ticket) {
  const guestName = (ticket.guests || []).filter(Boolean).join(", ") || "Guest";
  const confirmationNumber = ticket.reservationConfirmationNumber || "Not provided";
  const text = [
    "Aloha,",
    "",
    "Please see below the confirmation details.",
    "",
    "Unit: E1609",
    `Name: ${guestName}`,
    `Check-in: ${fmtDate(ticket.checkIn)} (4pm regular check-in)`,
    `Check-out: ${fmtDate(ticket.checkOut)} (12pm regular check-out)`,
    `Confirmation #: ${confirmationNumber}`,
    "",
    "Upon arrival, please proceed to the lobby floor to check in at the Front Desk.",
    "",
    "Cleaning Service Requests: Arrival/Departure set cleaning",
    "For additional cleaning requests during your stay, please select your preferred service timeframe. Please refer to the attached for the pricing.",
    "  1. 9 AM - 12 PM",
    "  2. 12 PM - 3 PM",
    "Please arrange any cleaning service requests or cancellations at least 72 hours in advance. Requests or cancellations made within 72 hours of the scheduled service will incur an additional charge. Please refer to the attached price list.",
    "Please do not leave the Privacy sign on the entrance door on the scheduled service day.",
    "",
    "Accompanying Guests",
    "We kindly ask you to register all accompanying guests staying in the unit. Please note that room keys cannot be issued to unregistered guests.",
    "",
    "Parking",
    "Parking is $60 + tax per night. (The rate is subject to change)",
    "",
    "Check Out",
    "Check out time is at 12:00 p.m..",
    "Please settle all room charges, including the departure cleaning fees before departure at the Front Desk.",
    "",
    "Best Regards,",
  ].join("\n");
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#25211d;font-size:15px;line-height:1.7;">
      <p style="margin:0 0 18px;">Aloha,</p>
      <p style="margin:0 0 18px;">Please see below the confirmation details.</p>
      <p style="margin:0 0 18px;">
        Unit: E1609<br>
        Name: ${escapeHtml(guestName)}<br>
        Check-in: ${escapeHtml(fmtDate(ticket.checkIn))} (4pm regular check-in)<br>
        Check-out: ${escapeHtml(fmtDate(ticket.checkOut))} (12pm regular check-out)<br>
        Confirmation #: ${escapeHtml(confirmationNumber)}
      </p>
      <p style="margin:0 0 18px;">Upon arrival, please proceed to the lobby floor to check in at the Front Desk.</p>
      <p style="margin:0 0 4px;"><strong>Cleaning Service Requests: Arrival/Departure set cleaning</strong></p>
      <p style="margin:0 0 8px;">For additional cleaning requests during your stay, please select your preferred service timeframe. Please refer to the attached for the pricing.</p>
      <p style="margin:0 0 8px;">1. 9 AM - 12 PM<br>2. 12 PM - 3 PM</p>
      <p style="margin:0 0 18px;">Please arrange any cleaning service requests or cancellations at least 72 hours in advance. Requests or cancellations made within 72 hours of the scheduled service will incur an additional charge. Please refer to the attached price list.<br>Please do not leave the Privacy sign on the entrance door on the scheduled service day.</p>
      <p style="margin:0 0 4px;"><strong>Accompanying Guests</strong></p>
      <p style="margin:0 0 18px;">We kindly ask you to register all accompanying guests staying in the unit. Please note that room keys cannot be issued to unregistered guests.</p>
      <p style="margin:0 0 4px;"><strong>Parking</strong></p>
      <p style="margin:0 0 18px;">Parking is $60 + tax per night. (The rate is subject to change)</p>
      <p style="margin:0 0 4px;"><strong>Check Out</strong></p>
      <p style="margin:0 0 18px;">Check out time is at 12:00 p.m..<br>Please settle all room charges, including the departure cleaning fees before departure at the Front Desk.</p>
      <p style="margin:0;">Best Regards,</p>
    </div>`;

  return { subject: `Ritz Confirmation #: ${confirmationNumber}`, text, html };
}

async function sendResendEmail({ to, subject, html, text, attachments }) {
  const apiKey = requireEnv("AUTH_RESEND_KEY");
  const from = requireEnv("AUTH_RESEND_FROM");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text, ...(attachments.length ? { attachments } : {}) }),
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

  const settings = { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get, { serviceKey: getAutomationServiceKey() })) || {}) };
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

  const attachments = await Promise.all(
    (settings.bookingConfirmedHotelAlertAttachments || []).map((attachment) => {
      if (!isBookingConfirmedHotelAlertAttachmentKey(attachment.key)) {
        throw new Error("Invalid booking confirmed hotel alert attachment");
      }
      return getR2ObjectAttachment(attachment.key, attachment.fileName);
    })
  );

  await sendResendEmail({ to, attachments, ...buildEmail(ticket) });

  const bookingConfirmedHotelEmailSentAt = new Date().toISOString();
  const updated = await client.mutation(api.tickets.update, {
    id: ticket.id,
    data: { bookingConfirmedHotelEmailSentAt },
    serviceKey: getAutomationServiceKey(),
  });

  return { sent: true, ticket: updated, recipients: to.length };
}
