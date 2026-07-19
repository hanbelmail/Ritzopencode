import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { getConvexClient, getConvexServiceKey, jsonError } from "@/lib/convex-server";
import { normalizePhone } from "@/lib/phone";
import { getQuoFrom, sendQuoText } from "@/lib/quo-server";
import { runSaraAgent } from "@/lib/sara-agent-server";

export const runtime = "nodejs";

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

function webhookAuthorized(request, rawBody) {
  const signingSecret = process.env.QUO_WEBHOOK_SECRET;
  if (signingSecret) {
    const webhookId = request.headers.get("webhook-id") || "";
    const timestamp = request.headers.get("webhook-timestamp") || "";
    const signatureHeader = request.headers.get("webhook-signature") || "";
    const timestampSeconds = Number(timestamp);
    if (!webhookId || !timestampSeconds || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;
    const encodedSecret = signingSecret.startsWith("whsec_") ? signingSecret.slice(6) : signingSecret;
    const secret = Buffer.from(encodedSecret, "base64");
    const expected = createHmac("sha256", secret).update(`${webhookId}.${timestamp}.${rawBody}`).digest("base64");
    return signatureHeader.split(/\s+/).some((candidate) => {
      const [version, signature] = candidate.split(",");
      return version === "v1" && secureEqual(signature, expected);
    });
  }

  if (process.env.NODE_ENV === "production") throw new Error("QUO_WEBHOOK_SECRET is not configured");
  const expected = process.env.QUO_WEBHOOK_TOKEN;
  const provided = request.nextUrl.searchParams.get("token") || request.headers.get("x-webhook-token") || "";
  return Boolean(expected && secureEqual(provided, expected));
}

function eventResource(payload) {
  return payload?.data?.resource || payload?.data?.object || payload?.data || payload?.resource || {};
}

function messageText(resource) {
  return String(resource?.text ?? resource?.body ?? resource?.content ?? "").trim();
}

function eventType(payload) {
  return String(payload?.type || payload?.event || "").trim();
}

function providerMessageId(resource) {
  return String(resource?.id || resource?.messageId || "").trim();
}

function eventOccurredAt(payload, resource, fallback) {
  const value = resource?.createdAt || resource?.timestamp || payload?.createdAt || payload?.data?.createdAt;
  const numeric = typeof value === "number" || /^\d+$/.test(String(value || "")) ? Number(value) : null;
  const normalized = numeric !== null && Number.isFinite(numeric) && numeric < 1_000_000_000_000 ? numeric * 1000 : value;
  const date = normalized ? new Date(normalized) : new Date(fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback).toISOString() : date.toISOString();
}

function identifierValue(identifier) {
  if (Array.isArray(identifier)) return identifierValue(identifier[0]);
  if (typeof identifier === "string") return identifier;
  return identifier?.value || identifier?.phoneNumber || identifier?.e164 || "";
}

function participantFrom(payload, resource) {
  const contextSender = payload?.data?.context?.senderIdentifier;
  const from = contextSender || (Array.isArray(resource?.from) ? resource.from[0] : resource?.from);
  return normalizePhone(String(identifierValue(from) || ""));
}

function containsMedia(payload, resource) {
  const candidates = [resource?.media, resource?.attachments, payload?.data?.media, payload?.data?.attachments];
  return candidates.some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
}

function canonicalOrigin(request) {
  return process.env.PUBLIC_APP_URL ? new URL(process.env.PUBLIC_APP_URL).origin : request.nextUrl.origin;
}

function isAllowlisted(settings, phone) {
  if (!settings.saraSmsTestMode) return true;
  return (settings.saraSmsAllowlist || []).some((allowed) => normalizePhone(allowed) === phone);
}

async function deliverReply({ client, serviceKey, publicId, to, content, messageId }) {
  const from = getQuoFrom();
  const idempotencyKey = `quo:${messageId}`;
  const queued = await client.mutation(api.messaging.queueSms, {
    serviceKey,
    publicId,
    messageId,
    idempotencyKey,
    from,
    to,
    content,
  });
  if (queued.outbox.status === "accepted" || queued.outbox.status === "delivered") return queued.outbox;
  const claim = await client.mutation(api.messaging.claimSms, { serviceKey, idempotencyKey });
  if (!claim.claimed) {
    if (claim.status === "suppressed") return claim.outbox;
    throw new Error(`SMS delivery cannot continue from ${claim.status} state`);
  }
  try {
    const result = await sendQuoText({ content: claim.outbox.content, to: claim.outbox.to, from: claim.outbox.from });
    return client.mutation(api.messaging.markSms, {
      serviceKey,
      idempotencyKey,
      status: "accepted",
      providerMessageId: result.data?.id,
    });
  } catch (error) {
    await client.mutation(api.messaging.markSms, {
      serviceKey,
      idempotencyKey,
      status: "failed",
      retryable: error.retryable === true,
      error: String(error.message || "Quo send failed").slice(0, 1000),
    });
    throw error;
  }
}

export async function POST(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1024 * 1024) return jsonError("Webhook payload is too large", 413);

  let eventId = "";
  let client;
  let serviceKey;
  let claimToken = "";
  try {
    const rawBody = await request.text();
    if (!webhookAuthorized(request, rawBody)) return jsonError("Invalid webhook signature", 401);
    const payload = JSON.parse(rawBody);
    const type = eventType(payload);
    const resource = eventResource(payload);
    const messageId = providerMessageId(resource);
    eventId = String(request.headers.get("webhook-id") || payload?.id || messageId || "").trim();
    if (!eventId || !type) return jsonError("Webhook event ID and type are required", 400);

    client = getConvexClient();
    serviceKey = getConvexServiceKey();
    const recorded = await client.mutation(api.messaging.recordWebhook, {
      serviceKey,
      eventId,
      type,
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    });
    const claim = await client.mutation(api.messaging.claimWebhook, { serviceKey, eventId });
    if (!claim.claimed) {
      if (claim.status === "processing") {
        return NextResponse.json(
          { error: "Webhook event is already processing" },
          { status: 503, headers: { "Retry-After": String(claim.retryAfterSeconds || 30) } }
        );
      }
      return NextResponse.json({ received: true, duplicate: true, status: claim.status });
    }
    claimToken = claim.claimToken;
    const sourceTimestamp = eventOccurredAt(payload, resource, recorded.event.createdAt);

    if (["message.delivered", "message.failed", "message.undelivered"].includes(type)) {
      if (messageId) {
        const delivery = await client.mutation(api.messaging.applyDeliveryEvent, {
          serviceKey,
          providerMessageId: messageId,
          delivered: type === "message.delivered",
          error: type === "message.delivered" ? undefined : String(resource?.error || resource?.status || type),
        });
        if (!delivery.matched) throw new Error("Delivery event arrived before its outbound message was registered");
      }
      await client.mutation(api.messaging.finishWebhook, { serviceKey, eventId, claimToken, status: "processed" });
      return NextResponse.json({ received: true });
    }

    if (type !== "message.received" || resource?.direction === "outgoing") {
      await client.mutation(api.messaging.finishWebhook, { serviceKey, eventId, claimToken, status: "ignored" });
      return NextResponse.json({ received: true, ignored: true });
    }

    const participant = participantFrom(payload, resource);
    if (!/^\+[1-9]\d{1,14}$/.test(participant)) throw new Error("Inbound sender must use E.164 format");
    const externalConversationId = String(payload?.data?.context?.conversationId || resource?.conversationId || "").trim() || undefined;
    const phoneNumberId = String(payload?.data?.context?.phoneNumberId || resource?.phoneNumberId || "").trim() || undefined;
    const proposedPublicId = externalConversationId ? `quo-${externalConversationId}` : `quo-${createHash("sha256").update(`${phoneNumberId || "line"}:${participant}`).digest("hex").slice(0, 32)}`;
    const openedConversation = await client.mutation(api.conversations.openSms, {
      serviceKey,
      publicId: proposedPublicId,
      externalConversationId,
      externalParticipant: participant,
      phoneNumberId,
    });
    const publicId = openedConversation.publicId;

    const text = messageText(resource);
    const command = text.trim().toUpperCase();
    if (command === "STOP" || command === "UNSUBSCRIBE" || command === "CANCEL" || command === "END" || command === "QUIT") {
      await client.mutation(api.sara.setSmsOptOut, { serviceKey, publicId, optedOut: true, eventId, eventTimestamp: sourceTimestamp });
      await client.mutation(api.conversations.appendInbound, {
        serviceKey,
        publicId,
        messageId: messageId || `quo-message:${eventId}`,
        content: text,
        providerEventId: eventId,
        providerMessageId: messageId || undefined,
      }).catch(() => null);
      await client.mutation(api.messaging.finishWebhook, { serviceKey, eventId, claimToken, status: "processed" });
      return NextResponse.json({ received: true, optedOut: true });
    }
    if (command === "START" || command === "UNSTOP") {
      await client.mutation(api.sara.setSmsOptOut, { serviceKey, publicId, optedOut: false, eventId, eventTimestamp: sourceTimestamp });
    }

    const hasMedia = containsMedia(payload, resource);
    const inboundText = text || "[Media message received; SMS attachment access is not supported]";
    const inbound = await client.mutation(api.conversations.appendInbound, {
      serviceKey,
      publicId,
      messageId: messageId || `quo-message:${eventId}`,
      content: inboundText,
      providerEventId: eventId,
      providerMessageId: messageId || undefined,
    });
    const settings = { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get, { serviceKey })) || {}) };
    if (!settings.saraSmsEnabled || !isAllowlisted(settings, participant)) {
      await client.mutation(api.messaging.finishWebhook, { serviceKey, eventId, claimToken, status: "ignored" });
      return NextResponse.json({ received: true, replySkipped: true, reason: settings.saraSmsEnabled ? "not_allowlisted" : "sms_disabled" });
    }

    let result;
    if ((hasMedia || !text) && inbound.shouldRespond) {
      const context = await client.query(api.conversations.getContext, { serviceKey, publicId });
      if (!context?.conversation?.aiEnabled) {
        result = { reply: null, handedOff: false };
      } else {
        const controlVersion = context.conversation.controlVersion || 0;
        await client.mutation(api.sara.handoff, {
          serviceKey,
          publicId,
          reason: "Inbound SMS media cannot be securely retrieved from the documented Quo API",
          expectedControlVersion: controlVersion,
        });
        const ticketUrl = context.conversation.ticketId ? new URL(`/ticket/${context.conversation.ticketId}`, canonicalOrigin(request)).toString() : null;
        const reply = ticketUrl
          ? `I can't securely read SMS attachments. Please upload payment proof through your ticket: ${ticketUrl}. A reservations team member can also help.`
          : settings.saraHandoffMessage;
        const outboundMessageId = `sara-media:${messageId || eventId}`;
        await client.mutation(api.conversations.appendOutbound, {
          serviceKey,
          publicId,
          messageId: outboundMessageId,
          content: reply,
          authorType: "system",
          replyToMessageId: messageId || undefined,
          expectedControlVersion: controlVersion,
        });
        result = { reply, outboundMessageId, handedOff: true };
      }
    } else if (inbound.shouldRespond) {
      try {
        result = await runSaraAgent({ client, publicId, inboundMessageId: messageId || `quo-message:${eventId}`, origin: canonicalOrigin(request) });
      } catch (error) {
        const errorMessage = String(error.message || "");
        if (errorMessage.includes("already processing")) throw error;
        if (/paused|opted out/i.test(errorMessage)) {
          result = { reply: null, handedOff: false };
        } else {
          const current = await client.query(api.conversations.getContext, { serviceKey, publicId });
          if (!current?.conversation?.aiEnabled) {
            result = { reply: null, handedOff: false };
          } else {
            const controlVersion = current.conversation.controlVersion || 0;
            await client.mutation(api.sara.handoff, { serviceKey, publicId, reason: `Agent runtime failure: ${errorMessage.slice(0, 300)}`, expectedControlVersion: controlVersion });
            const reply = settings.saraHandoffMessage || DEFAULT_SETTINGS.saraHandoffMessage;
            const outboundMessageId = `sara-fallback:${messageId || eventId}`;
            await client.mutation(api.conversations.appendOutbound, {
              serviceKey,
              publicId,
              messageId: outboundMessageId,
              content: reply,
              authorType: "system",
              replyToMessageId: messageId || undefined,
              expectedControlVersion: controlVersion,
            });
            result = { reply, outboundMessageId, handedOff: true };
          }
        }
      }
    } else result = { reply: null, handedOff: false };

    if (!result?.reply && inbound.duplicate) {
      const context = await client.query(api.conversations.getContext, { serviceKey, publicId });
      const inboundId = messageId || `quo-message:${eventId}`;
      const recoveryIds = new Set([`sara:${inboundId}`, `sara-fallback:${inboundId}`, `sara-media:${messageId || eventId}`]);
      const existingReply = context?.messages?.find((message) =>
        recoveryIds.has(message.messageId) &&
        Number(message.metadata?.controlVersion ?? 0) === Number(context.conversation.controlVersion || 0)
      );
      if (existingReply) {
        result = {
          reply: existingReply.content,
          outboundMessageId: existingReply.messageId,
          handedOff: ["system", "assistant"].includes(existingReply.authorType) && context.conversation.stage === "handoff",
        };
      }
    }

    if (result?.reply && result?.outboundMessageId) {
      await deliverReply({ client, serviceKey, publicId, to: participant, content: result.reply, messageId: result.outboundMessageId });
    }
    await client.mutation(api.messaging.finishWebhook, { serviceKey, eventId, claimToken, status: "processed" });
    return NextResponse.json({ received: true, replied: Boolean(result?.reply), handedOff: Boolean(result?.handedOff) });
  } catch (error) {
    if (client && serviceKey && eventId && claimToken) {
      await client.mutation(api.messaging.finishWebhook, {
        serviceKey,
        eventId,
        claimToken,
        status: "failed",
        error: String(error.message || "Webhook processing failed").slice(0, 1000),
      }).catch(() => {});
    }
    const message = error.message || "Failed to process Quo webhook";
    return jsonError(message, /credential|configured/i.test(message) ? 503 : 500);
  }
}
