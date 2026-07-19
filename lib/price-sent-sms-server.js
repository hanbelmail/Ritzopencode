import { api } from "@/convex/_generated/api";
import { fmtMoney } from "@/lib/calc";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { isE164Phone, normalizePhone } from "@/lib/phone";
import { activePriceSentSmsTemplate } from "@/lib/sms-templates";
import { getAutomationServiceKey } from "@/lib/convex-server";
import { sendQuoText } from "@/lib/quo-server";

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

export async function sendPriceSentSms({ client, ticket, origin }) {
  if (!ticket) return { sent: false, skipped: true, reason: "Ticket not found" };
  if (ticket.status !== "PRICE SENT") {
    return { sent: false, skipped: true, reason: "Ticket is not PRICE SENT" };
  }

  const savedSettings = (await client.query(api.settings.get, { serviceKey: getAutomationServiceKey() })) || {};
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
  const permission = await client.query(api.sara.canSendSms, { serviceKey: getAutomationServiceKey(), phone });
  if (!permission.allowed) {
    return { sent: false, skipped: true, reason: "Guest opted out of SMS" };
  }

  const serviceKey = getAutomationServiceKey();
  const claim = await client.mutation(api.tickets.claimPriceSentSms, { id: ticket.id, serviceKey, phone });
  if (!claim.claimed) return { sent: false, skipped: true, reason: claim.reason };

  let message;
  try {
    const currentTicket = claim.ticket;
    const ticketUrl = new URL(`/ticket/${currentTicket.id}`, origin).toString();
    const screenshotUrl = currentTicket.retailPriceScreenshotKey
      ? new URL(`/ticket/${currentTicket.id}/retail-price-image`, origin).toString()
      : "";
    const template = activePriceSentSmsTemplate(
      claim.smsSettings.priceSentSmsTemplates,
      claim.smsSettings.priceSentSmsTemplateId,
      claim.smsSettings.priceSentSmsTemplate
    );
    const content = buildMessage({ ticket: currentTicket, template: template.content, ticketUrl, screenshotUrl });
    if (!content) throw Object.assign(new Error("SMS template is empty"), { retryable: true });
    if (content.length > 1600) throw Object.assign(new Error("SMS content exceeds Quo's 1600-character limit"), { retryable: true });
    const finalClaim = await client.mutation(api.tickets.confirmPriceSentSmsClaim, {
      id: ticket.id,
      serviceKey,
      claimToken: claim.claimToken,
      phone: claim.phone,
    });
    if (!finalClaim.confirmed) return { sent: false, skipped: true, reason: finalClaim.reason };
    message = await sendQuoText({ content, to: finalClaim.phone });
  } catch (error) {
    await client.mutation(api.tickets.finishPriceSentSms, {
      id: ticket.id,
      serviceKey,
      claimToken: claim.claimToken,
      accepted: false,
      retryable: error.retryable === true,
      error: String(error.message || "Quo send failed").slice(0, 1000),
    });
    throw error;
  }
  const updated = await client.mutation(api.tickets.finishPriceSentSms, {
    id: ticket.id,
    serviceKey,
    claimToken: claim.claimToken,
    accepted: true,
    ...(message.data?.id ? { providerMessageId: message.data.id } : {}),
  });

  return { sent: true, ticket: updated, messageId: message.data?.id };
}
