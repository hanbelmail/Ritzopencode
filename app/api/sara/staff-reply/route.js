import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { getConvexClient, getConvexServiceKey, jsonError } from "@/lib/convex-server";
import { normalizePhone } from "@/lib/phone";
import { getQuoFrom, sendQuoText } from "@/lib/quo-server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const publicId = String(body?.publicId || "").trim();
    const content = String(body?.content || "").trim();
    const messageId = String(body?.messageId || "").trim();
    if (!publicId || !content || content.length > 1600 || !/^staff:[A-Za-z0-9-]{8,100}$/.test(messageId)) {
      return jsonError("Conversation, stable message ID, and a 1-1600 character reply are required", 400);
    }

    const authToken = await convexAuthNextjsToken();
    if (!authToken) return jsonError("Authentication required", 401);
    const client = getConvexClient();
    client.setAuth(authToken);
    const serviceKey = getConvexServiceKey();
    const context = await client.query(api.conversations.getContext, { serviceKey, publicId });
    if (!context || context.conversation.channel !== "sms" || !context.conversation.externalParticipant) return jsonError("SMS conversation not found", 404);
    const settings = { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get, { serviceKey })) || {}) };
    if (!settings.saraSmsEnabled) return jsonError("Sara SMS is disabled", 409);
    const to = normalizePhone(context.conversation.externalParticipant);
    if (settings.saraSmsTestMode && !(settings.saraSmsAllowlist || []).some((phone) => normalizePhone(phone) === to)) {
      return jsonError("Recipient is not on the SMS test allowlist", 403);
    }

    const staffMessage = await client.mutation(api.conversations.addStaffReply, {
      publicId,
      messageId,
      content,
    });
    const from = getQuoFrom();
    const idempotencyKey = `quo:${messageId}`;
    const queued = await client.mutation(api.messaging.queueSms, { serviceKey, publicId, messageId, idempotencyKey, from, to, content: staffMessage.content });
    if (["accepted", "delivered"].includes(queued.outbox.status)) {
      return NextResponse.json({ sent: true, duplicate: true, messageId, providerMessageId: queued.outbox.providerMessageId || null });
    }
    const claim = await client.mutation(api.messaging.claimSms, { serviceKey, idempotencyKey });
    if (!claim.claimed) {
      if (claim.status === "sending") return NextResponse.json({ sent: false, pending: true, messageId }, { status: 202 });
      return jsonError(claim.reason || `SMS is ${claim.status}`, 409);
    }

    try {
      const result = await sendQuoText({ content: claim.outbox.content, to: claim.outbox.to, from: claim.outbox.from });
      await client.mutation(api.messaging.markSms, { serviceKey, idempotencyKey, status: "accepted", providerMessageId: result.data?.id });
      return NextResponse.json({ sent: true, messageId, providerMessageId: result.data?.id || null });
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
  } catch (error) {
    const message = error.message || "Failed to send staff SMS reply";
    return jsonError(message, /opted out|disabled|allowlist/i.test(message) ? 409 : 500);
  }
}
