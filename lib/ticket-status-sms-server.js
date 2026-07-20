import { api } from "@/convex/_generated/api";
import { fmtMoney } from "@/lib/calc";
import {
  BOOKING_CONFIRMED_SMS_TEMPLATE_DEFAULTS,
  DEFAULT_SETTINGS,
  PAYMENT_SUBMITTED_SMS_TEMPLATE_DEFAULTS,
  PAYMENT_VERIFIED_SMS_TEMPLATE_DEFAULTS,
  PRICE_SENT_SMS_TEMPLATE_DEFAULTS,
} from "@/lib/defaults";
import { getAutomationServiceKey } from "@/lib/convex-server";
import { isE164Phone, normalizePhone } from "@/lib/phone";
import { sendQuoText } from "@/lib/quo-server";
import { activePriceSentSmsTemplate, activeSmsTemplate } from "@/lib/sms-templates";

const EVENT_CONFIG = {
  priceSent: {
    status: "PRICE SENT",
    label: "Price sent",
    enabledKey: "priceSentSmsEnabled",
    sentAtKey: "priceSentSmsSentAt",
    defaults: PRICE_SENT_SMS_TEMPLATE_DEFAULTS,
  },
  paymentSubmitted: {
    status: "PAYMENT SUBMITTED",
    label: "Payment submitted",
    enabledKey: "paymentSubmittedSmsEnabled",
    sentAtKey: "paymentSubmittedSmsSentAt",
    defaults: PAYMENT_SUBMITTED_SMS_TEMPLATE_DEFAULTS,
  },
  paymentVerified: {
    status: "PAYMENT VERIFIED",
    label: "Payment verified",
    enabledKey: "paymentVerifiedSmsEnabled",
    sentAtKey: "paymentVerifiedSmsSentAt",
    defaults: PAYMENT_VERIFIED_SMS_TEMPLATE_DEFAULTS,
  },
  bookingConfirmed: {
    status: "BOOKING CONFIRMED",
    label: "Booking confirmed",
    enabledKey: "bookingConfirmedSmsEnabled",
    sentAtKey: "bookingConfirmedSmsSentAt",
    defaults: BOOKING_CONFIRMED_SMS_TEMPLATE_DEFAULTS,
  },
};

function replacePlaceholder(message, name, value) {
  return message
    .replaceAll(`{{${name}}}`, String(value ?? ""))
    .replaceAll(`{${name}}`, String(value ?? ""));
}

export function renderTicketStatusSms({ ticket, template, ticketUrl, screenshotUrl = "" }) {
  const guestName = (ticket.guests || []).find(Boolean) || "Guest";
  const hasPrice = ticket.rateOffered !== null && ticket.rateOffered !== undefined;
  const estimatedSavings = hasPrice && ticket.retailPrice !== null && ticket.retailPrice !== undefined
    ? Math.max(Number(ticket.retailPrice) - Number(ticket.rateOffered), 0)
    : null;
  const confirmationNumber = String(ticket.reservationConfirmationNumber || "").trim();
  const email = String(ticket.email || "").trim();

  if (/\{\{?confirmationNumber\}?\}/.test(template) && !confirmationNumber) {
    throw Object.assign(new Error("Reservation confirmation number is required for this SMS"), { retryable: true });
  }
  if (/\{\{?email\}?\}/.test(template) && !email) {
    throw Object.assign(new Error("Guest email is required for this SMS"), { retryable: true });
  }

  const replacements = {
    guestName,
    email,
    confirmationNumber,
    ticketUrl,
    checkIn: ticket.checkIn || "",
    checkOut: ticket.checkOut || "",
    roomType: ticket.roomType || "",
    paymentMethod: ticket.paymentMethod || "",
    paymentDate: ticket.paymentDate || "",
    retailPrice: hasPrice ? fmtMoney(ticket.retailPrice) : "Pending",
    discount: hasPrice ? `${ticket.discountPct || 0}% off` : "Pending",
    estimatedSavings: estimatedSavings !== null ? fmtMoney(estimatedSavings) : "Pending",
    yourPrice: hasPrice ? fmtMoney(ticket.rateOffered) : "Pending",
    cleaningFeeNotice: "Cleaning fee is paid directly to the Ritz at check-in and is not included in the private rate above.",
    retailPriceScreenshotBlock: screenshotUrl ? `Ritz website retail price image: ${screenshotUrl}` : "",
    retailPriceScreenshotUrl: screenshotUrl,
  };

  return Object.entries(replacements)
    .reduce((message, [name, value]) => replacePlaceholder(message, name, value), template)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendTicketStatusSms({ client, ticket, origin, event }) {
  const config = EVENT_CONFIG[event];
  if (!config) throw new Error("Unsupported ticket status SMS event");
  if (!ticket) return { sent: false, skipped: true, reason: "Ticket not found" };
  if (ticket.status !== config.status) return { sent: false, skipped: true, reason: `Ticket is not ${config.status}` };

  const serviceKey = getAutomationServiceKey();
  const settings = { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get, { serviceKey })) || {}) };
  if (!settings[config.enabledKey]) return { sent: false, skipped: true, reason: `${config.label} guest SMS is disabled` };
  if (ticket[config.sentAtKey]) return { sent: false, skipped: true, reason: `${config.label} SMS already sent` };
  if (!ticket.phone) return { sent: false, skipped: true, reason: "Ticket has no guest phone number" };

  const phone = normalizePhone(ticket.phone);
  if (!isE164Phone(phone)) return { sent: false, skipped: true, reason: "Guest phone number must use E.164 format" };
  const permission = await client.query(api.sara.canSendSms, { serviceKey, phone });
  if (!permission.allowed) return { sent: false, skipped: true, reason: "Guest opted out of SMS" };

  const claim = await client.mutation(api.tickets.claimTicketStatusSms, { id: ticket.id, event, serviceKey, phone });
  if (!claim.claimed) return { sent: false, skipped: true, reason: claim.reason };

  let providerMessage;
  try {
    const currentTicket = claim.ticket;
    const ticketUrl = new URL(`/ticket/${currentTicket.id}`, origin).toString();
    const screenshotUrl = currentTicket.retailPriceScreenshotKey
      ? new URL(`/ticket/${currentTicket.id}/retail-price-image`, origin).toString()
      : "";
    const selectedTemplate = event === "priceSent"
      ? activePriceSentSmsTemplate(claim.smsSettings.templates, claim.smsSettings.templateId, claim.smsSettings.legacyTemplate)
      : activeSmsTemplate(claim.smsSettings.templates, claim.smsSettings.templateId, config.defaults);
    const content = renderTicketStatusSms({ ticket: currentTicket, template: selectedTemplate.content, ticketUrl, screenshotUrl });
    if (!content) throw Object.assign(new Error("SMS template is empty"), { retryable: true });
    if (content.length > 1600) throw Object.assign(new Error("SMS content exceeds Quo's 1600-character limit"), { retryable: true });
    const finalClaim = await client.mutation(api.tickets.confirmTicketStatusSmsClaim, {
      id: ticket.id,
      event,
      serviceKey,
      claimToken: claim.claimToken,
      phone: claim.phone,
    });
    if (!finalClaim.confirmed) return { sent: false, skipped: true, reason: finalClaim.reason };
    providerMessage = await sendQuoText({ content, to: finalClaim.phone });
  } catch (error) {
    await client.mutation(api.tickets.finishTicketStatusSms, {
      id: ticket.id,
      event,
      serviceKey,
      claimToken: claim.claimToken,
      accepted: false,
      retryable: error.retryable === true,
      error: String(error.message || "Quo send failed").slice(0, 1000),
    });
    throw error;
  }

  const updated = await client.mutation(api.tickets.finishTicketStatusSms, {
    id: ticket.id,
    event,
    serviceKey,
    claimToken: claim.claimToken,
    accepted: true,
    ...(providerMessage.data?.id ? { providerMessageId: providerMessage.data.id } : {}),
  });
  return { sent: true, ticket: updated, messageId: providerMessage.data?.id };
}
