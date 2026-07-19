import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireServiceKey } from "./security";
import { getSmsConsent, normalizeSmsPhone } from "./smsConsent";

async function conversationByPublicId(ctx: any, publicId: string) {
  const conversation = await ctx.db.query("conversations").withIndex("by_publicId", (q: any) => q.eq("publicId", publicId)).first();
  if (!conversation) throw new Error("Conversation not found");
  return conversation;
}

export const recordWebhook = mutation({
  args: {
    serviceKey: v.string(),
    eventId: v.string(),
    type: v.string(),
    payloadHash: v.string(),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const existing = await ctx.db
      .query("webhookEvents")
      .withIndex("by_provider_eventId", (q) => q.eq("provider", "quo").eq("eventId", args.eventId))
      .first();
    if (existing) {
      if (existing.type !== args.type || existing.payloadHash !== args.payloadHash) throw new Error("Webhook event ID was reused with a different payload");
      return { event: existing, duplicate: true };
    }
    const id = await ctx.db.insert("webhookEvents", {
      provider: "quo",
      eventId: args.eventId,
      type: args.type,
      payloadHash: args.payloadHash,
      status: "received",
      createdAt: new Date().toISOString(),
    });
    return { event: await ctx.db.get(id), duplicate: false };
  },
});

export const finishWebhook = mutation({
  args: {
    serviceKey: v.string(),
    eventId: v.string(),
    claimToken: v.string(),
    status: v.union(v.literal("processed"), v.literal("ignored"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const event = await ctx.db
      .query("webhookEvents")
      .withIndex("by_provider_eventId", (q) => q.eq("provider", "quo").eq("eventId", args.eventId))
      .first();
    if (!event) throw new Error("Webhook event not found");
    if (event.status !== "processing" || event.claimToken !== args.claimToken) throw new Error("Webhook processing lease was lost");
    await ctx.db.patch(event._id, {
      status: args.status,
      error: args.error,
      processedAt: new Date().toISOString(),
      claimToken: undefined,
      leaseExpiresAt: undefined,
    });
  },
});

export const claimWebhook = mutation({
  args: { serviceKey: v.string(), eventId: v.string() },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const event = await ctx.db
      .query("webhookEvents")
      .withIndex("by_provider_eventId", (q) => q.eq("provider", "quo").eq("eventId", args.eventId))
      .first();
    if (!event) throw new Error("Webhook event not found");
    const now = new Date();
    const staleProcessing = event.status === "processing" && (!event.leaseExpiresAt || event.leaseExpiresAt <= now.toISOString());
    if (!["received", "failed"].includes(event.status) && !staleProcessing) {
      return { claimed: false, status: event.status, retryAfterSeconds: event.status === "processing" ? 30 : undefined };
    }
    const claimToken = crypto.randomUUID();
    const claimedAt = now.toISOString();
    const leaseExpiresAt = new Date(now.getTime() + 10 * 60_000).toISOString();
    await ctx.db.patch(event._id, {
      status: "processing",
      error: undefined,
      claimedAt,
      claimToken,
      leaseExpiresAt,
      attempts: (event.attempts || 0) + 1,
    });
    return { claimed: true, status: "processing", claimToken, leaseExpiresAt };
  },
});

export const queueSms = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    messageId: v.string(),
    idempotencyKey: v.string(),
    from: v.string(),
    to: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const existing = await ctx.db.query("messageOutbox").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey)).first();
    if (existing) return { outbox: existing, duplicate: true };
    const conversation = await conversationByPublicId(ctx, args.publicId);
    const message = await ctx.db.query("messages").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.messageId)).first();
    if (!message || message.conversationId !== conversation._id) throw new Error("Outbound message not found");
    const messageOutbox = await ctx.db.query("messageOutbox").withIndex("by_messageId", (q) => q.eq("messageId", message._id)).first();
    if (messageOutbox) return { outbox: messageOutbox, duplicate: true };
    if (conversation.channel !== "sms" || conversation.externalParticipant !== args.to) throw new Error("SMS destination does not match the conversation");
    if (message.content !== args.content) throw new Error("SMS content does not match the persisted message");
    const consent = await getSmsConsent(ctx, args.to);
    if (consent.optedOut) throw new Error("SMS recipient opted out");
    const messageControlVersion = Number(message.metadata?.controlVersion ?? conversation.controlVersion ?? 0);
    if (messageControlVersion !== (conversation.controlVersion || 0)) throw new Error("SMS message was superseded by staff control");
    const now = new Date().toISOString();
    const id = await ctx.db.insert("messageOutbox", {
      idempotencyKey: args.idempotencyKey,
      conversationId: conversation._id,
      messageId: message._id,
      channel: "sms",
      from: args.from,
      to: args.to,
      content: args.content,
      status: "pending",
      attempts: 0,
      consentVersion: consent.version,
      controlVersion: messageControlVersion,
      createdAt: now,
      updatedAt: now,
    });
    return { outbox: await ctx.db.get(id), duplicate: false };
  },
});

export const claimSms = mutation({
  args: { serviceKey: v.string(), idempotencyKey: v.string() },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const outbox = await ctx.db.query("messageOutbox").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey)).first();
    if (!outbox) throw new Error("SMS outbox item not found");
    const retrying = outbox.status === "failed" && outbox.retryable === true;
    if (outbox.status !== "pending" && !retrying) return { claimed: false, status: outbox.status, outbox };
    const conversation = await ctx.db.get(outbox.conversationId);
    if (!conversation) throw new Error("SMS conversation not found");
    const consent = await getSmsConsent(ctx, outbox.to);
    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const settings = settingsRow?.data || {};
    const normalizedTo = normalizeSmsPhone(outbox.to);
    const allowlisted = (settings.saraSmsAllowlist || []).some((phone: string) => normalizeSmsPhone(phone) === normalizedTo);
    let blockedReason = "";
    if (conversation.channel !== "sms" || normalizeSmsPhone(conversation.externalParticipant || "") !== normalizedTo) blockedReason = "SMS destination no longer matches the conversation";
    else if (consent.optedOut) blockedReason = "SMS recipient opted out";
    else if ((outbox.consentVersion ?? 0) !== consent.version) blockedReason = "SMS consent changed after this message was queued";
    else if ((outbox.controlVersion ?? 0) !== (conversation.controlVersion || 0)) blockedReason = "Conversation control changed after this message was queued";
    else if (!settings.saraSmsEnabled) blockedReason = "Sara SMS is disabled";
    else if (settings.saraSmsTestMode !== false && !allowlisted) blockedReason = "SMS recipient is not on the test allowlist";
    if (blockedReason) {
      const suppressedAt = new Date().toISOString();
      await ctx.db.patch(outbox._id, { status: "suppressed", retryable: false, lastError: blockedReason, updatedAt: suppressedAt });
      await ctx.db.patch(outbox.messageId, { deliveryStatus: "suppressed" });
      return { claimed: false, status: "suppressed", reason: blockedReason, outbox: await ctx.db.get(outbox._id) };
    }
    const now = new Date().toISOString();
    await ctx.db.patch(outbox._id, { status: "sending", attempts: outbox.attempts + 1, retryable: undefined, updatedAt: now });
    await ctx.db.patch(outbox.messageId, { deliveryStatus: "pending" });
    return { claimed: true, status: "sending", outbox: await ctx.db.get(outbox._id) };
  },
});

export const markSms = mutation({
  args: {
    serviceKey: v.string(),
    idempotencyKey: v.string(),
    status: v.union(v.literal("sending"), v.literal("accepted"), v.literal("delivered"), v.literal("failed"), v.literal("suppressed")),
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
    retryable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const outbox = await ctx.db.query("messageOutbox").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey)).first();
    if (!outbox) throw new Error("SMS outbox item not found");
    const now = new Date().toISOString();
    if (args.status === "sending") throw new Error("Use claimSms to begin delivery");
    if (["accepted", "failed"].includes(args.status) && outbox.status !== "sending") return outbox;
    await ctx.db.patch(outbox._id, {
      status: args.status,
      providerMessageId: args.providerMessageId || outbox.providerMessageId,
      attempts: outbox.attempts,
      retryable: args.status === "failed" ? Boolean(args.retryable) : undefined,
      lastError: args.error,
      updatedAt: now,
    });
    const deliveryStatus: "accepted" | "delivered" | "failed" | "suppressed" = args.status;
    await ctx.db.patch(outbox.messageId, {
      providerMessageId: args.providerMessageId || undefined,
      deliveryStatus,
    });
    return ctx.db.get(outbox._id);
  },
});

export const applyDeliveryEvent = mutation({
  args: {
    serviceKey: v.string(),
    providerMessageId: v.string(),
    delivered: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const outbox = await ctx.db.query("messageOutbox").withIndex("by_providerMessageId", (q) => q.eq("providerMessageId", args.providerMessageId)).first();
    const message = await ctx.db.query("messages").withIndex("by_providerMessageId", (q) => q.eq("providerMessageId", args.providerMessageId)).first();
    const status = args.delivered ? "delivered" : "failed";
    if (outbox) await ctx.db.patch(outbox._id, { status, lastError: args.error, updatedAt: new Date().toISOString() });
    if (message) await ctx.db.patch(message._id, { deliveryStatus: status });
    return { matched: Boolean(outbox || message) };
  },
});
