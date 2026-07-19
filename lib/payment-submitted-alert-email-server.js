import { api } from "@/convex/_generated/api";
import { fmtDate, fmtMoney } from "@/lib/calc";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { getExtensionFromR2Key, getR2ObjectAttachment } from "@/lib/r2";
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

function activeRecipientEmails(settings) {
  return (settings.staffEmailRecipients || [])
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

function buildEmail({ ticket, adminUrl, ticketUrl, hasPaymentScreenshot }) {
  const primaryGuest = (ticket.guests || []).filter(Boolean)[0] || "Guest";
  const rows = [
    ["Ticket ID", ticket.id],
    ["Guest names", (ticket.guests || []).filter(Boolean).join(", ") || "Not provided"],
    ["Email", ticket.email || "Not provided"],
    ["Phone", ticket.phone || "Not provided"],
    ["Check-in", fmtDate(ticket.checkIn)],
    ["Check-out", fmtDate(ticket.checkOut)],
    ["Room", ticket.roomType || "Not selected"],
    ["Private rate", ticket.rateOffered !== null && ticket.rateOffered !== undefined ? fmtMoney(ticket.rateOffered) : "Pending"],
    ["Payment method", ticket.paymentMethod || "Not provided"],
    ["Payment date", fmtDate(ticket.paymentDate)],
    ["Payment proof", hasPaymentScreenshot ? "Attached" : "Not attached"],
  ];
  const htmlRows = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 0;color:#7a7067;font-size:13px;border-bottom:1px solid #eee7dc;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;color:#25211d;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #eee7dc;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`)
    .join("");

  const text = [
    "Payment submitted for review.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open staff ticket: ${adminUrl}`,
    `Guest ticket: ${ticketUrl}`,
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#f7f1e8;font-family:Arial,Helvetica,sans-serif;color:#25211d;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f1e8;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffaf3;border:1px solid #eadfce;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="background:#211b17;color:#ffffff;padding:30px;">
                  <p style="margin:0 0 10px;color:#d7c2a3;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Payment Submitted</p>
                  <h1 style="margin:0;font-size:30px;line-height:1.12;font-weight:700;">${escapeHtml(primaryGuest)} submitted payment proof</h1>
                  <p style="margin:14px 0 0;color:#eee1cf;font-size:15px;line-height:1.6;">A reservation payment is ready for staff review. The guest's payment screenshot is attached when available.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 30px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${htmlRows}</table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 30px 30px;text-align:center;">
                  <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#25211d;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:15px;font-weight:700;">Open Staff Ticket</a>
                  <p style="margin:18px 0 0;color:#7a7067;font-size:12px;line-height:1.6;">Guest ticket:<br><a href="${escapeHtml(ticketUrl)}" style="color:#8a5c2e;">${escapeHtml(ticketUrl)}</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>`;

  return { html, text, subject: `Payment submitted: ${primaryGuest}` };
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
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      ...(attachments?.length ? { attachments } : {}),
    }),
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

export async function sendPaymentSubmittedAlertEmail({ client, ticket, origin }) {
  if (!ticket) return { sent: false, skipped: true, reason: "Ticket not found" };
  if (ticket.status !== "PAYMENT SUBMITTED") {
    return { sent: false, skipped: true, reason: "Ticket is not PAYMENT SUBMITTED" };
  }
  if (ticket.paymentSubmittedStaffEmailSentAt) {
    return { sent: false, skipped: true, reason: "Payment submitted alert already sent" };
  }

  const settings = { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get, { serviceKey: getAutomationServiceKey() })) || {}) };
  if (!settings.emailAlertsEnabled) {
    return { sent: false, skipped: true, reason: "Email alerts are disabled" };
  }
  if (!settings.paymentSubmittedAlertEnabled) {
    return { sent: false, skipped: true, reason: "Payment submitted alert is disabled" };
  }

  const to = activeRecipientEmails(settings);
  if (!to.length) {
    return { sent: false, skipped: true, reason: "No active staff email recipients" };
  }

  const attachments = [];
  if (ticket.paymentScreenshotKey) {
    const extension = getExtensionFromR2Key(ticket.paymentScreenshotKey);
    attachments.push(await getR2ObjectAttachment(
      ticket.paymentScreenshotKey,
      `ritz-payment-proof.${extension}`
    ));
  }

  const adminUrl = new URL(`/new?id=${encodeURIComponent(ticket.id)}`, origin).toString();
  const ticketUrl = new URL(`/ticket/${ticket.id}`, origin).toString();
  const email = buildEmail({ ticket, adminUrl, ticketUrl, hasPaymentScreenshot: attachments.length > 0 });

  await sendResendEmail({ to, attachments, ...email });

  const paymentSubmittedStaffEmailSentAt = new Date().toISOString();
  const updated = await client.mutation(api.tickets.update, {
    id: ticket.id,
    data: { paymentSubmittedStaffEmailSentAt },
    serviceKey: getAutomationServiceKey(),
  });

  return { sent: true, ticket: updated, recipients: to.length, attachedPaymentProof: attachments.length > 0 };
}
