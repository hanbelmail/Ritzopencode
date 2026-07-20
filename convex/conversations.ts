import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireServiceKey, requireStaff } from "./security";
import { getSmsConsent } from "./smsConsent";

const conversationStatus = v.union(
  v.literal("open"),
  v.literal("waiting_for_guest"),
  v.literal("waiting_for_staff"),
  v.literal("human_required"),
  v.literal("closed")
);

const conversationStage = v.union(
  v.literal("new"),
  v.literal("qualifying"),
  v.literal("quote_requested"),
  v.literal("price_sent"),
  v.literal("terms_sent"),
  v.literal("terms_accepted"),
  v.literal("payment_submitted"),
  v.literal("payment_verified"),
  v.literal("booking_confirmed"),
  v.literal("handoff")
);

const channel = v.union(v.literal("web"), v.literal("sms"));

async function findByPublicId(ctx: any, publicId: string) {
  return ctx.db.query("conversations").withIndex("by_publicId", (q: any) => q.eq("publicId", publicId)).first();
}

async function conversationBundle(ctx: any, conversation: any, messageLimit = 40) {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation_createdAt", (q: any) => q.eq("conversationId", conversation._id))
    .order("desc")
    .take(messageLimit);
  const contact = conversation.contactId ? await ctx.db.get(conversation.contactId) : null;
  const ticket = conversation.ticketId
    ? await ctx.db.query("tickets").withIndex("by_ticketId", (q: any) => q.eq("ticketId", conversation.ticketId)).first()
    : null;
  const smsConsent = conversation.channel === "sms" && conversation.externalParticipant
    ? await getSmsConsent(ctx, conversation.externalParticipant)
    : null;
  return {
    conversation,
    messages: messages.reverse(),
    contact,
    ticket: ticket?.data || null,
    smsConsent: smsConsent ? { optedOut: smsConsent.optedOut, version: smsConsent.version } : null,
  };
}

export const openWeb = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    accessTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const existing = await findByPublicId(ctx, args.publicId);
    if (existing) {
      if (existing.channel !== "web" || existing.accessTokenHash !== args.accessTokenHash) {
        throw new Error("Conversation access denied");
      }
      return existing;
    }

    const now = new Date().toISOString();
    const id = await ctx.db.insert("conversations", {
      publicId: args.publicId,
      accessTokenHash: args.accessTokenHash,
      channel: "web",
      status: "open",
      stage: "new",
      aiEnabled: true,
      smsOptOut: false,
      controlVersion: 0,
      collected: {},
      lastMessageAt: now,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return ctx.db.get(id);
  },
});

export const openSms = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    externalConversationId: v.optional(v.string()),
    externalParticipant: v.string(),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const consent = await getSmsConsent(ctx, args.externalParticipant);
    let existing = args.externalConversationId
      ? await ctx.db
          .query("conversations")
          .withIndex("by_externalConversationId", (q) => q.eq("externalConversationId", args.externalConversationId))
          .first()
      : null;
    if (!existing) {
      existing = await ctx.db
        .query("conversations")
        .withIndex("by_externalParticipant", (q) => q.eq("externalParticipant", args.externalParticipant))
        .filter((q) => q.eq(q.field("channel"), "sms"))
        .first();
    }

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, {
        externalConversationId: args.externalConversationId || existing.externalConversationId,
        phoneNumberId: args.phoneNumberId || existing.phoneNumberId,
        ...(consent.optedOut ? {
          smsOptOut: true,
          aiEnabled: false,
          status: "closed",
        } : {}),
        updatedAt: now,
      });
      return ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("conversations", {
      publicId: args.publicId,
      channel: "sms",
      status: consent.optedOut ? "closed" : "open",
      stage: "new",
      aiEnabled: !consent.optedOut,
      smsOptOut: consent.optedOut,
      controlVersion: 0,
      externalConversationId: args.externalConversationId,
      externalParticipant: args.externalParticipant,
      phoneNumberId: args.phoneNumberId,
      collected: { phone: args.externalParticipant },
      lastMessageAt: now,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return ctx.db.get(id);
  },
});

export const getContext = query({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    accessTokenHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await findByPublicId(ctx, args.publicId);
    if (!conversation) return null;
    if (conversation.channel === "web" && conversation.accessTokenHash !== args.accessTokenHash) {
      throw new Error("Conversation access denied");
    }
    return conversationBundle(ctx, conversation);
  },
});

export const appendInbound = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    accessTokenHash: v.optional(v.string()),
    messageId: v.string(),
    content: v.string(),
    providerEventId: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await findByPublicId(ctx, args.publicId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.channel === "web" && conversation.accessTokenHash !== args.accessTokenHash) {
      throw new Error("Conversation access denied");
    }

    const content = args.content.trim();
    if (!content || content.length > 2000) throw new Error("Message must be between 1 and 2000 characters");
    const smsConsent = conversation.channel === "sms" && conversation.externalParticipant
      ? await getSmsConsent(ctx, conversation.externalParticipant)
      : null;
    const shouldRespond = !smsConsent?.optedOut && conversation.aiEnabled && !["human_required", "closed"].includes(conversation.status);

    const duplicate = await ctx.db
      .query("messages")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.messageId))
      .first();
    if (duplicate) return { message: duplicate, duplicate: true, shouldRespond };

    if (args.providerEventId) {
      const providerDuplicate = await ctx.db
        .query("messages")
        .withIndex("by_providerEventId", (q) => q.eq("providerEventId", args.providerEventId))
        .first();
      if (providerDuplicate) return { message: providerDuplicate, duplicate: true, shouldRespond };
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const messageLimit = Math.min(100, Math.max(5, Number(settingsRow?.data?.saraMaxMessagesPerHour) || 30));
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_createdAt", (q) => q.eq("conversationId", conversation._id).gte("createdAt", oneHourAgo))
      .take(101);
    if (recentMessages.filter((message) => message.direction === "inbound").length >= messageLimit) {
      throw new Error("Message limit reached. Please try again later.");
    }

    const now = new Date().toISOString();
    const id = await ctx.db.insert("messages", {
      conversationId: conversation._id,
      messageId: args.messageId,
      direction: "inbound",
      authorType: "guest",
      channel: conversation.channel,
      content,
      providerEventId: args.providerEventId,
      providerMessageId: args.providerMessageId,
      deliveryStatus: "received",
      idempotencyKey: args.messageId,
      createdAt: now,
    });
    await ctx.db.patch(conversation._id, {
      lastMessageAt: now,
      lastInboundAt: now,
      messageCount: conversation.messageCount + 1,
      status: !smsConsent?.optedOut && conversation.status === "waiting_for_guest" ? "open" : conversation.status,
      updatedAt: now,
    });
    const message = await ctx.db.get(id);
    return {
      message,
      duplicate: false,
      shouldRespond,
    };
  },
});

export const appendOutbound = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    messageId: v.string(),
    content: v.string(),
    authorType: v.union(v.literal("assistant"), v.literal("staff"), v.literal("system")),
    replyToMessageId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    expectedControlVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await findByPublicId(ctx, args.publicId);
    if (!conversation) throw new Error("Conversation not found");
    const duplicate = await ctx.db
      .query("messages")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.messageId))
      .first();
    if (duplicate) {
      if (duplicate.conversationId !== conversation._id || duplicate.authorType !== args.authorType || duplicate.content !== args.content.trim()) {
        throw new Error("Outbound message ID is already in use");
      }
      return duplicate;
    }
    if (["assistant", "system"].includes(args.authorType)) {
      if (args.expectedControlVersion === undefined || args.expectedControlVersion !== (conversation.controlVersion || 0)) {
        throw new Error("Sara was paused while this reply was being generated");
      }
      if (conversation.channel === "sms" && conversation.externalParticipant && (await getSmsConsent(ctx, conversation.externalParticipant)).optedOut) {
        throw new Error("SMS recipient opted out");
      }
    }
    const now = new Date().toISOString();
    const id = await ctx.db.insert("messages", {
      conversationId: conversation._id,
      messageId: args.messageId,
      direction: "outbound",
      authorType: args.authorType,
      channel: conversation.channel,
      content: args.content.trim(),
      deliveryStatus: conversation.channel === "web" ? "delivered" : "pending",
      idempotencyKey: args.messageId,
      metadata: { ...args.metadata, replyToMessageId: args.replyToMessageId, controlVersion: conversation.controlVersion || 0 },
      createdAt: now,
    });
    await ctx.db.patch(conversation._id, {
      lastMessageAt: now,
      lastAgentReplyAt: args.authorType === "assistant" ? now : conversation.lastAgentReplyAt,
      messageCount: conversation.messageCount + 1,
      status: conversation.status === "open" ? "waiting_for_guest" : conversation.status,
      updatedAt: now,
    });
    return ctx.db.get(id);
  },
});

export const updateState = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    status: v.optional(conversationStatus),
    stage: v.optional(conversationStage),
    aiEnabled: v.optional(v.boolean()),
    contactId: v.optional(v.id("contacts")),
    ticketId: v.optional(v.string()),
    summary: v.optional(v.string()),
    collected: v.optional(v.object({
      checkIn: v.optional(v.string()),
      checkOut: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      guests: v.optional(v.array(v.string())),
      referredBy: v.optional(v.string()),
      acquisitionSource: v.optional(v.union(v.literal("direct"), v.literal("promoter"), v.literal("referral"))),
    })),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await findByPublicId(ctx, args.publicId);
    if (!conversation) throw new Error("Conversation not found");
    const patch: any = { updatedAt: new Date().toISOString() };
    for (const key of ["status", "stage", "aiEnabled", "contactId", "ticketId", "summary"] as const) {
      if (args[key] !== undefined) patch[key] = args[key];
    }
    if (args.collected) patch.collected = { ...conversation.collected, ...args.collected };
    await ctx.db.patch(conversation._id, patch);
    return ctx.db.get(conversation._id);
  },
});

export const startRun = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    inboundMessageId: v.string(),
    model: v.string(),
    promptVersion: v.string(),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await findByPublicId(ctx, args.publicId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.aiEnabled || ["human_required", "closed"].includes(conversation.status)) throw new Error("Sara is paused for this conversation");
    if (conversation.channel === "sms" && conversation.externalParticipant && (await getSmsConsent(ctx, conversation.externalParticipant)).optedOut) {
      throw new Error("SMS recipient opted out");
    }
    const existing = await ctx.db.query("agentRuns").withIndex("by_inboundMessageId", (q) => q.eq("inboundMessageId", args.inboundMessageId)).first();
    if (existing && ["completed", "handoff"].includes(existing.status)) return existing;
    const sameRunIsFresh = existing?.status === "running" && conversation.activeRunMessageId === args.inboundMessageId &&
      conversation.activeRunStartedAt && conversation.activeRunStartedAt > new Date(Date.now() - 600_000).toISOString();
    if (sameRunIsFresh) throw new Error("Sara is already processing this message");
    const activeIsFresh = conversation.activeRunMessageId && conversation.activeRunMessageId !== args.inboundMessageId &&
      conversation.activeRunStartedAt && conversation.activeRunStartedAt > new Date(Date.now() - 600_000).toISOString();
    if (activeIsFresh) throw new Error("Sara is already processing another message in this conversation");
    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { status: "running", toolCalls: [], error: undefined, completedAt: undefined, controlVersion: conversation.controlVersion || 0 });
      await ctx.db.patch(conversation._id, { activeRunMessageId: args.inboundMessageId, activeRunStartedAt: now, updatedAt: now });
      return ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert("agentRuns", {
      conversationId: conversation._id,
      inboundMessageId: args.inboundMessageId,
      status: "running",
      model: args.model,
      promptVersion: args.promptVersion,
      toolCalls: [],
      controlVersion: conversation.controlVersion || 0,
      createdAt: now,
    });
    await ctx.db.patch(conversation._id, { activeRunMessageId: args.inboundMessageId, activeRunStartedAt: now, updatedAt: now });
    return ctx.db.get(id);
  },
});

export const finishRun = mutation({
  args: {
    serviceKey: v.string(),
    runId: v.id("agentRuns"),
    status: v.union(v.literal("completed"), v.literal("failed"), v.literal("handoff")),
    toolCalls: v.array(v.any()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error("Agent run not found");
    await ctx.db.patch(args.runId, {
      status: args.status,
      toolCalls: args.toolCalls,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      error: args.error,
      completedAt: new Date().toISOString(),
    });
    const conversation = await ctx.db.get(run.conversationId);
    if (conversation?.activeRunMessageId === run.inboundMessageId) {
      await ctx.db.patch(conversation._id, { activeRunMessageId: undefined, activeRunStartedAt: undefined, updatedAt: new Date().toISOString() });
    }
  },
});

export const consumeWebRateLimit = mutation({
  args: { serviceKey: v.string(), key: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const now = new Date().toISOString();
    const windowFloor = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const row = await ctx.db.query("saraRateLimits").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    const limit = Math.min(100, Math.max(5, Math.round(args.limit)));
    if (!row || row.windowStartedAt < windowFloor) {
      if (row) await ctx.db.patch(row._id, { windowStartedAt: now, count: 1, updatedAt: now });
      else await ctx.db.insert("saraRateLimits", { key: args.key, windowStartedAt: now, count: 1, updatedAt: now });
      return { allowed: true, remaining: limit - 1 };
    }
    if (row.count >= limit) return { allowed: false, remaining: 0 };
    await ctx.db.patch(row._id, { count: row.count + 1, updatedAt: now });
    return { allowed: true, remaining: limit - row.count - 1 };
  },
});

export const listForStaff = query({
  args: { status: v.optional(conversationStatus) },
  handler: async (ctx, { status }) => {
    await requireStaff(ctx);
    const rows = status
      ? await ctx.db.query("conversations").withIndex("by_status_lastMessageAt", (q) => q.eq("status", status)).order("desc").take(100)
      : await ctx.db.query("conversations").withIndex("by_lastMessageAt").order("desc").take(100);
    return Promise.all(rows.map(async (conversation) => {
      const messages = await ctx.db.query("messages").withIndex("by_conversation_createdAt", (q) => q.eq("conversationId", conversation._id)).order("desc").take(1);
      const contact = conversation.contactId ? await ctx.db.get(conversation.contactId) : null;
      const consent = conversation.channel === "sms" && conversation.externalParticipant
        ? await getSmsConsent(ctx, conversation.externalParticipant)
        : null;
      return { conversation, contact, lastMessage: messages[0] || null, smsConsent: consent ? { optedOut: consent.optedOut, version: consent.version } : null };
    }));
  },
});

export const getForStaff = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    await requireStaff(ctx);
    const conversation = await findByPublicId(ctx, publicId);
    return conversation ? conversationBundle(ctx, conversation, 200) : null;
  },
});

export const deleteForStaff = mutation({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    await requireStaff(ctx);
    const conversation = await findByPublicId(ctx, publicId);
    if (!conversation) throw new Error("Conversation not found");

    const [messages, runs] = await Promise.all([
      ctx.db.query("messages").withIndex("by_conversation_createdAt", (q) => q.eq("conversationId", conversation._id)).collect(),
      ctx.db.query("agentRuns").withIndex("by_conversation_createdAt", (q) => q.eq("conversationId", conversation._id)).collect(),
    ]);
    const outboxes = (await Promise.all(
      messages.map((message) => ctx.db.query("messageOutbox").withIndex("by_messageId", (q) => q.eq("messageId", message._id)).collect())
    )).flat();

    if (conversation.ticketId) {
      const ticket = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", conversation.ticketId)).first();
      if (ticket?.data?.conversationId === publicId) {
        const { conversationId: _conversationId, ...data } = ticket.data;
        await ctx.db.patch(ticket._id, { data, updatedAt: new Date().toISOString() });
      }
    }

    for (const outbox of outboxes) await ctx.db.delete(outbox._id);
    for (const message of messages) await ctx.db.delete(message._id);
    for (const run of runs) await ctx.db.delete(run._id);
    await ctx.db.delete(conversation._id);

    return { deleted: true };
  },
});

export const setStaffControl = mutation({
  args: {
    publicId: v.string(),
    aiEnabled: v.boolean(),
    status: conversationStatus,
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const conversation = await findByPublicId(ctx, args.publicId);
    if (!conversation) throw new Error("Conversation not found");
    const consent = conversation.channel === "sms" && conversation.externalParticipant
      ? await getSmsConsent(ctx, conversation.externalParticipant)
      : null;
    if (consent?.optedOut && (args.aiEnabled || args.status !== "closed")) throw new Error("This contact opted out of SMS");
    let stage = conversation.stage;
    if (args.aiEnabled && stage === "handoff") {
      const ticket = conversation.ticketId
        ? await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", conversation.ticketId)).first()
        : null;
      const stages: Record<string, any> = {
        "QUOTE REQUESTED": "quote_requested",
        "PRICE SENT": "price_sent",
        "PAYMENT SUBMITTED": "payment_submitted",
        "PAYMENT VERIFIED": "payment_verified",
        "BOOKING CONFIRMED": "booking_confirmed",
      };
      stage = stages[ticket?.data?.status] || "qualifying";
    }
    await ctx.db.patch(conversation._id, {
      aiEnabled: args.aiEnabled,
      status: args.status,
      stage: args.status === "human_required" ? "handoff" : stage,
      controlVersion: (conversation.controlVersion || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
    return ctx.db.get(conversation._id);
  },
});

export const addStaffReply = mutation({
  args: { publicId: v.string(), messageId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireStaff(ctx);
    const conversation = await findByPublicId(ctx, args.publicId);
    if (!conversation) throw new Error("Conversation not found");
    const content = args.content.trim();
    if (!content || content.length > 2000) throw new Error("Reply must be between 1 and 2000 characters");
    const duplicate = await ctx.db.query("messages").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.messageId)).first();
    if (duplicate) {
      if (duplicate.conversationId !== conversation._id || duplicate.authorType !== "staff" || duplicate.content !== content) throw new Error("Staff reply ID is already in use");
      return duplicate;
    }
    if (conversation.channel === "sms" && conversation.externalParticipant && (await getSmsConsent(ctx, conversation.externalParticipant)).optedOut) {
      throw new Error("This contact opted out of SMS");
    }
    const now = new Date().toISOString();
    const controlVersion = (conversation.controlVersion || 0) + 1;
    const id = await ctx.db.insert("messages", {
      conversationId: conversation._id,
      messageId: args.messageId,
      direction: "outbound",
      authorType: "staff",
      channel: conversation.channel,
      content,
      deliveryStatus: conversation.channel === "web" ? "delivered" : "pending",
      idempotencyKey: args.messageId,
      metadata: { actorUserId: String(userId), controlVersion },
      createdAt: now,
    });
    await ctx.db.patch(conversation._id, {
      aiEnabled: false,
      status: "waiting_for_guest",
      stage: "handoff",
      controlVersion,
      lastMessageAt: now,
      messageCount: conversation.messageCount + 1,
      updatedAt: now,
    });
    return ctx.db.get(id);
  },
});

export const channelValidator = channel;
