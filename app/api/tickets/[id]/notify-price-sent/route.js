import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { fmtDate, fmtMoney } from "@/lib/calc";
import { getConvexClient, jsonError } from "@/lib/convex-server";
import { DEFAULT_SETTINGS } from "@/lib/defaults";

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

function detailRows(ticket, settings) {
  const hasPrice = ticket.rateOffered !== null && ticket.rateOffered !== undefined;
  return [
    ["Ticket ID", ticket.id],
    ["Check-in", fmtDate(ticket.checkIn)],
    ["Check-out", fmtDate(ticket.checkOut)],
    ["Nights", ticket.nights || 0],
    ["Room", ticket.roomType || "Pending"],
    ["Retail Price", hasPrice ? fmtMoney(ticket.retailPrice) : "Pending"],
    ["Discount", hasPrice ? `${ticket.discountPct || 0}% off` : "Pending"],
    ["Your Price", hasPrice ? fmtMoney(ticket.rateOffered) : "Pending"],
    ["Cleaning Fee", `${fmtMoney(settings.cleaningFee)} paid directly to the Ritz`],
  ];
}

function buildEmail({ ticket, settings, ticketUrl }) {
  const primaryGuest = (ticket.guests || []).filter(Boolean)[0] || "Guest";
  const rows = detailRows(ticket, settings);
  const htmlRows = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 0;color:#7a7067;font-size:13px;border-bottom:1px solid #eee7dc;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;color:#25211d;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #eee7dc;">${escapeHtml(value)}</td>
      </tr>`)
    .join("");

  const text = [
    `Aloha ${primaryGuest},`,
    "",
    "Your Ritz-Carlton private rate is ready.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `View your ticket: ${ticketUrl}`,
  ].join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#f7f1e8;font-family:Arial,Helvetica,sans-serif;color:#25211d;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f1e8;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffaf3;border:1px solid #eadfce;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="background:#211b17;color:#ffffff;padding:30px;">
                  <p style="margin:0 0 10px;color:#d7c2a3;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Private Rate Ready</p>
                  <h1 style="margin:0;font-size:30px;line-height:1.12;font-weight:700;">Aloha, ${escapeHtml(primaryGuest)}</h1>
                  <p style="margin:14px 0 0;color:#eee1cf;font-size:15px;line-height:1.6;">Your Ritz-Carlton private room quote is ready. Review the details below and open your guest ticket to secure the reservation.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 30px 8px;">
                  <div style="background:#fff4df;border:1px solid #ecd8b8;border-radius:18px;padding:18px;text-align:center;">
                    <p style="margin:0 0 8px;color:#7b5428;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Your Price</p>
                    <p style="margin:0;color:#25211d;font-size:34px;font-weight:800;line-height:1;">${escapeHtml(fmtMoney(ticket.rateOffered))}</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 30px 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${htmlRows}</table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 30px 30px;text-align:center;">
                  <a href="${escapeHtml(ticketUrl)}" style="display:inline-block;background:#25211d;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:15px;font-weight:700;">View Your Ticket</a>
                  <p style="margin:18px 0 0;color:#7a7067;font-size:12px;line-height:1.6;">If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(ticketUrl)}" style="color:#8a5c2e;">${escapeHtml(ticketUrl)}</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>`;

  return { html, text };
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

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const client = getConvexClient();
    const ticket = await client.query(api.tickets.get, { id });

    if (!ticket) return jsonError("Ticket not found", 404);
    if (ticket.status !== "PRICE SENT") {
      return NextResponse.json({ sent: false, skipped: true, reason: "Ticket is not PRICE SENT" });
    }
    if (!ticket.email) {
      return NextResponse.json({ sent: false, skipped: true, reason: "Ticket has no guest email" });
    }
    if (ticket.priceSentEmailSentAt) {
      return NextResponse.json({ sent: false, skipped: true, reason: "Price sent email already sent" });
    }

    const settings = { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get)) || {}) };
    const origin = request.nextUrl.origin;
    const ticketUrl = new URL(`/ticket/${ticket.id}`, origin).toString();
    const email = buildEmail({ ticket, settings, ticketUrl });

    await sendResendEmail({
      to: ticket.email,
      subject: "Your Ritz-Carlton private rate is ready",
      ...email,
    });

    const priceSentEmailSentAt = new Date().toISOString();
    const updated = await client.mutation(api.tickets.update, {
      id,
      data: { priceSentEmailSentAt },
    });

    return NextResponse.json({ sent: true, ticket: updated });
  } catch (error) {
    const message = error.message || "Failed to send price sent email";
    const status = message.includes("not found") ? 404 : message.includes("Missing required environment variable") ? 500 : 502;
    return jsonError(message, status);
  }
}
