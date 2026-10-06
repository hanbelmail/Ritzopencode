import { api } from "@/convex/_generated/api";
import { getConvexServiceKey } from "@/lib/convex-server";
import { withDefaultSettings } from "@/lib/defaults";
import { isE164Phone, normalizePhone } from "@/lib/phone";
import { getQuoFrom, sendQuoText } from "@/lib/quo-server";
import { sendPriceSentEmail } from "@/lib/price-sent-email-server";
import { sendPriceSentSms } from "@/lib/price-sent-sms-server";
import { buildQuoteFailureMessage } from "@/lib/sara-reservation-change";
import { activePriceSentSmsTemplate } from "@/lib/sms-templates";
import { renderTicketStatusSms } from "@/lib/ticket-status-sms-server";

function errorText(error) {
  return String(error?.message || error || "Notification failed").slice(0, 300);
}

async function deliverConversationSms({ client, serviceKey, settings, conversation, messageId, content }) {
  if (settings.saraSmsEnabled !== true) return { sent: false, skipped: true, reason: "Sona SMS is disabled" };
  const to = String(conversation.externalParticipant || "");
  if (!isE164Phone(normalizePhone(to))) return { sent: false, skipped: true, reason: "SMS destination is not E.164" };
  const allowlisted = (settings.saraSmsAllowlist || []).some((allowed) => normalizePhone(allowed) === normalizePhone(to));
  if (settings.saraSmsTestMode !== false && !allowlisted) return { sent: false, skipped: true, reason: "Guest is not on the SMS test allowlist" };

  const from = getQuoFrom();
  const idempotencyKey = `quo:${messageId}`;
  const queued = await client.mutation(api.messaging.queueSms, { serviceKey, publicId: conversation.publicId, messageId, idempotencyKey, from, to, content });
  if (["accepted", "delivered"].includes(queued.outbox.status)) {
    return { sent: true, duplicate: true, providerMessageId: queued.outbox.providerMessageId || null };
  }
  const claim = await client.mutation(api.messaging.claimSms, { serviceKey, idempotencyKey });
  if (!claim.claimed) return { sent: false, skipped: true, reason: claim.reason || `SMS is ${claim.status}` };

  try {
    const result = await sendQuoText({ content: claim.outbox.content, to: claim.outbox.to, from: claim.outbox.from });
    await client.mutation(api.messaging.markSms, { serviceKey, idempotencyKey, status: "accepted", providerMessageId: result.providerMessageId });
    return { sent: true, providerMessageId: result.providerMessageId || null };
  } catch (error) {
    await client.mutation(api.messaging.markSms, {
      serviceKey,
      idempotencyKey,
      status: "failed",
      retryable: error.retryable === true,
      error: errorText(error),
    });
    return { sent: false, error: errorText(error) };
  }
}

async function appendConversationNotification({ client, ticket, kind, buildContent, messageId, action, smsAllowed, settings }) {
  const serviceKey = getConvexServiceKey();
  const publicId = String(ticket.conversationId);
  const quoteRevision = Number(ticket.quoteRevision || 0);
  try {
    const context = await client.query(api.conversations.getServiceContext, { serviceKey, publicId });
    if (!context) return { sent: false, skipped: true, reason: "Conversation not found" };
    const conversation = context.conversation;
    if (!conversation.aiEnabled || ["human_required", "closed"].includes(conversation.status)) {
      return { sent: false, skipped: true, reason: "Sona is paused for this conversation" };
    }

    const content = String(buildContent(conversation) || "").trim();
    await client.mutation(api.conversations.appendOutbound, {
      serviceKey,
      publicId,
      messageId,
      content,
      authorType: "assistant",
      metadata: { deterministic: true, action, quoteRevision },
      expectedControlVersion: conversation.controlVersion || 0,
    });

    let sms = null;
    if (smsAllowed && conversation.channel === "sms") {
      const deliverySettings = settings || withDefaultSettings(await client.query(api.settings.get, { serviceKey }));
      sms = await deliverConversationSms({ client, serviceKey, settings: deliverySettings, conversation, messageId, content });
    }

    await client.mutation(api.sara.recordQuoteNotification, { serviceKey, ticketId: ticket.id, quoteRevision, kind });
    return { sent: true, messageId, quoteRevision, sms };
  } catch (error) {
    return { sent: false, error: errorText(error) };
  }
}

export function buildQuoteReadyContent({ ticket, settings, origin }) {
  const ticketUrl = new URL(`/ticket/${ticket.id}`, origin).toString();
  const screenshotUrl = ticket.retailPriceScreenshotKey
    ? new URL(`/ticket/${ticket.id}/retail-price-image`, origin).toString()
    : "";
  const template = activePriceSentSmsTemplate(settings.priceSentSmsTemplates, settings.priceSentSmsTemplateId, settings.priceSentSmsTemplate);
  return renderTicketStatusSms({ ticket, template: template.content, ticketUrl, screenshotUrl });
}

export async function sendQuoteReadyNotification({ client, ticket, origin }) {
  if (!ticket?.conversationId || ticket.status !== "PRICE SENT") return null;
  const quoteRevision = Number(ticket.quoteRevision || 0);
  if (Number(ticket.requoteNotifiedRevision ?? -1) === quoteRevision) return null;

  const serviceKey = getConvexServiceKey();
  const settings = withDefaultSettings(await client.query(api.settings.get, { serviceKey }));
  let content;
  try {
    content = buildQuoteReadyContent({ ticket, settings, origin });
  } catch (error) {
    return { sent: false, skipped: true, reason: errorText(error) };
  }
  if (!content) return { sent: false, skipped: true, reason: "Price sent SMS template is empty" };

  return appendConversationNotification({
    client,
    ticket,
    kind: "ready",
    buildContent: () => content,
    messageId: `sara-quote-ready:${ticket.id}:${quoteRevision}`,
    action: quoteRevision > 0 ? "quote_revised_ready" : "quote_ready",
    smsAllowed: !ticket.priceSentSmsSentAt,
    settings,
  });
}

export async function sendQuoteFailureNotification({ client, ticket }) {
  if (!ticket?.conversationId || ticket.status !== "QUOTE REQUESTED" || !ticket.quoteError) return null;
  const quoteRevision = Number(ticket.quoteRevision || 0);
  if (Number(ticket.quoteFailureNotifiedRevision ?? -1) === quoteRevision) return null;

  return appendConversationNotification({
    client,
    ticket,
    kind: "failure",
    buildContent: () => buildQuoteFailureMessage({ checkIn: ticket.checkIn, checkOut: ticket.checkOut }),
    messageId: `sara-quote-failed:${ticket.id}:${quoteRevision}`,
    action: "quote_failed",
    smsAllowed: true,
  });
}

export async function resendQuoteAfterContactChange({ client, ticket, origin, emailChanged, phoneChanged }) {
  if (!ticket || ticket.status !== "PRICE SENT") return null;
  if (!emailChanged && !phoneChanged) return null;
  const result = {};
  if (emailChanged) result.email = await sendPriceSentEmail({ client, ticket, origin }).catch((error) => ({ sent: false, error: errorText(error) }));
  if (phoneChanged) result.sms = await sendPriceSentSms({ client, ticket, origin }).catch((error) => ({ sent: false, error: errorText(error) }));
  return result;
}
