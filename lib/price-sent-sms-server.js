import { api } from "@/convex/_generated/api";
import { fmtMoney } from "@/lib/calc";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { isE164Phone, normalizePhone } from "@/lib/phone";
import { activePriceSentSmsTemplate } from "@/lib/sms-templates";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function buildMessage({ ticket, template, ticketUrl, screenshotUrl }) {
  const guestName = (ticket.guests || []).find(Boolean) || "Guest";
  const hasPrice = ticket.rateOffered !== null && ticket.rateOffered !== undefined;
  const estimatedSavings = hasPrice && ticket.retailPrice !== null && ticket.retailPrice !== undefined
    ? Math.max(Number(ticket.retailPrice) - Number(ticket.rateOffered), 0)
    : null;
  const replacements = {
    "{guestName}": guestName,
    "{retailPrice}": hasPrice ? fmtMoney(ticket.retailPrice) : "Pending",
    "{discount}": hasPrice ? `${ticket.discountPct || 0}% off` : "Pending",
    "{estimatedSavings}": estimatedSavings !== null ? fmtMoney(estimatedSavings) : "Pending",
    "{yourPrice}": hasPrice ? fmtMoney(ticket.rateOffered) : "Pending",
    "{cleaningFeeNotice}": "Cleaning fee is paid directly to the Ritz at check-in and is not included in the private rate above.",
    "{retailPriceScreenshotBlock}": screenshotUrl ? `Ritz website retail price image: ${screenshotUrl}` : "",
    "{retailPriceScreenshotUrl}": screenshotUrl,
    "{ticketUrl}": ticketUrl,
  };

  return Object.entries(replacements)
    .reduce((message, [placeholder, value]) => message.replaceAll(placeholder, value), template)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendQuoMessage({ content, to }) {
  const apiKey = requireEnv("QUO_API_KEY");
  const from = requireEnv("QUO_FROM").trim();
  if (!isE164Phone(from) && !/^PN\S+$/.test(from)) {
    throw new Error("QUO_FROM must be an E.164 phone number or Quo PN identifier");
  }
  const response = await fetch("https://api.quo.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, from, to: [to] }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || result.description || "Quo failed to send the SMS");
  }

  return result;
}

export async function sendPriceSentSms({ client, ticket, origin }) {
  if (!ticket) return { sent: false, skipped: true, reason: "Ticket not found" };
  if (ticket.status !== "PRICE SENT") {
    return { sent: false, skipped: true, reason: "Ticket is not PRICE SENT" };
  }

  const savedSettings = (await client.query(api.settings.get)) || {};
  const settings = { ...DEFAULT_SETTINGS, ...savedSettings };
  if (!settings.priceSentSmsEnabled) {
    return { sent: false, skipped: true, reason: "Guest price sent SMS is disabled" };
  }
  if (ticket.priceSentSmsSentAt) {
    return { sent: false, skipped: true, reason: "Price sent SMS already sent" };
  }
  if (!ticket.phone) {
    return { sent: false, skipped: true, reason: "Ticket has no guest phone number" };
  }

  const phone = normalizePhone(ticket.phone);
  if (!isE164Phone(phone)) {
    return { sent: false, skipped: true, reason: "Guest phone number must use E.164 format" };
  }

  const ticketUrl = new URL(`/ticket/${ticket.id}`, origin).toString();
  const screenshotUrl = ticket.retailPriceScreenshotKey
    ? new URL(`/ticket/${ticket.id}/retail-price-image`, origin).toString()
    : "";
  const template = activePriceSentSmsTemplate(
    savedSettings.priceSentSmsTemplates,
    savedSettings.priceSentSmsTemplateId,
    savedSettings.priceSentSmsTemplate
  );
  const content = buildMessage({ ticket, template: template.content, ticketUrl, screenshotUrl });
  if (!content) {
    return { sent: false, skipped: true, reason: "SMS template is empty" };
  }
  if (content.length > 1600) {
    return { sent: false, skipped: true, reason: "SMS content exceeds Quo's 1600-character limit" };
  }

  const message = await sendQuoMessage({ content, to: phone });
  const priceSentSmsSentAt = new Date().toISOString();
  const updated = await client.mutation(api.tickets.update, {
    id: ticket.id,
    data: { priceSentSmsSentAt },
  });

  return { sent: true, ticket: updated, messageId: message.data?.id };
}
