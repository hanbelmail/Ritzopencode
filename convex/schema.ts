import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  tickets: defineTable({
    ticketId: v.string(),
    data: v.any(),
    createdAt: v.string(),
    updatedAt: v.string(),
    status: v.optional(v.string()),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    searchText: v.optional(v.string()),
  })
    .index("by_ticketId", ["ticketId"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["status"],
    }),
  settings: defineTable({
    key: v.string(),
    data: v.any(),
    updatedAt: v.string(),
  }).index("by_key", ["key"]),
  dashboardPreferences: defineTable({
    userId: v.id("users"),
    data: v.any(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),
  contacts: defineTable({
    displayName: v.string(),
    normalizedPhone: v.optional(v.string()),
    normalizedEmail: v.optional(v.string()),
    relationship: v.union(v.literal("new"), v.literal("repeat")),
    acquisitionSource: v.union(v.literal("direct"), v.literal("promoter"), v.literal("referral")),
    referredBy: v.optional(v.string()),
    smsOptOut: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_phone", ["normalizedPhone"])
    .index("by_email", ["normalizedEmail"]),
  conversations: defineTable({
    publicId: v.string(),
    accessTokenHash: v.optional(v.string()),
    channel: v.union(v.literal("web"), v.literal("sms")),
    status: v.union(
      v.literal("open"),
      v.literal("waiting_for_guest"),
      v.literal("waiting_for_staff"),
      v.literal("human_required"),
      v.literal("closed")
    ),
    stage: v.union(
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
    ),
    aiEnabled: v.boolean(),
    smsOptOut: v.optional(v.boolean()),
    smsOptOutPreviousAiEnabled: v.optional(v.boolean()),
    smsOptOutPreviousStatus: v.optional(v.union(
      v.literal("open"),
      v.literal("waiting_for_guest"),
      v.literal("waiting_for_staff"),
      v.literal("human_required"),
      v.literal("closed")
    )),
    controlVersion: v.optional(v.number()),
    contactId: v.optional(v.id("contacts")),
    ticketId: v.optional(v.string()),
    externalConversationId: v.optional(v.string()),
    externalParticipant: v.optional(v.string()),
    phoneNumberId: v.optional(v.string()),
    summary: v.optional(v.string()),
    collected: v.object({
      checkIn: v.optional(v.string()),
      checkOut: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      guests: v.optional(v.array(v.string())),
      referredBy: v.optional(v.string()),
      acquisitionSource: v.optional(v.union(v.literal("direct"), v.literal("promoter"), v.literal("referral"))),
    }),
    termsVersion: v.optional(v.string()),
    termsPresentedVersion: v.optional(v.string()),
    termsPresentedAt: v.optional(v.string()),
    termsPresentedMessageId: v.optional(v.string()),
    termsPresentedHash: v.optional(v.string()),
    termsAcceptedAt: v.optional(v.string()),
    termsAcceptedMessageId: v.optional(v.string()),
    activeRunMessageId: v.optional(v.string()),
    activeRunStartedAt: v.optional(v.string()),
    lastMessageAt: v.string(),
    lastInboundAt: v.optional(v.string()),
    lastAgentReplyAt: v.optional(v.string()),
    messageCount: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_publicId", ["publicId"])
    .index("by_externalConversationId", ["externalConversationId"])
    .index("by_externalParticipant", ["externalParticipant"])
    .index("by_status_lastMessageAt", ["status", "lastMessageAt"])
    .index("by_lastMessageAt", ["lastMessageAt"]),
  messages: defineTable({
    conversationId: v.id("conversations"),
    messageId: v.string(),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    authorType: v.union(v.literal("guest"), v.literal("assistant"), v.literal("staff"), v.literal("system")),
    channel: v.union(v.literal("web"), v.literal("sms")),
    content: v.string(),
    providerMessageId: v.optional(v.string()),
    providerEventId: v.optional(v.string()),
    deliveryStatus: v.union(
      v.literal("received"),
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("suppressed")
    ),
    idempotencyKey: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
  })
    .index("by_conversation_createdAt", ["conversationId", "createdAt"])
    .index("by_providerMessageId", ["providerMessageId"])
    .index("by_providerEventId", ["providerEventId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),
  knowledgeEntries: defineTable({
    slug: v.string(),
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("archived")),
    audience: v.union(v.literal("guest"), v.literal("staff")),
    version: v.number(),
    source: v.optional(v.string()),
    effectiveAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    searchText: v.string(),
    createdBy: v.optional(v.id("users")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["status", "audience"],
    }),
  reservationEvents: defineTable({
    ticketId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    type: v.string(),
    actorType: v.union(v.literal("guest"), v.literal("staff"), v.literal("assistant"), v.literal("automation"), v.literal("system")),
    actorUserId: v.optional(v.id("users")),
    idempotencyKey: v.optional(v.string()),
    payload: v.optional(v.any()),
    createdAt: v.string(),
  })
    .index("by_ticket_createdAt", ["ticketId", "createdAt"])
    .index("by_idempotencyKey", ["idempotencyKey"]),
  agentRuns: defineTable({
    conversationId: v.id("conversations"),
    inboundMessageId: v.string(),
    status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed"), v.literal("handoff")),
    model: v.string(),
    promptVersion: v.string(),
    toolCalls: v.array(v.any()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.string(),
    completedAt: v.optional(v.string()),
    controlVersion: v.optional(v.number()),
  })
    .index("by_conversation_createdAt", ["conversationId", "createdAt"])
    .index("by_inboundMessageId", ["inboundMessageId"]),
  messageOutbox: defineTable({
    idempotencyKey: v.string(),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    channel: v.literal("sms"),
    from: v.string(),
    to: v.string(),
    content: v.string(),
    status: v.union(v.literal("pending"), v.literal("sending"), v.literal("accepted"), v.literal("delivered"), v.literal("failed"), v.literal("suppressed")),
    providerMessageId: v.optional(v.string()),
    attempts: v.number(),
    consentVersion: v.optional(v.number()),
    controlVersion: v.optional(v.number()),
    retryable: v.optional(v.boolean()),
    lastError: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_messageId", ["messageId"])
    .index("by_status", ["status"])
    .index("by_providerMessageId", ["providerMessageId"]),
  webhookEvents: defineTable({
    provider: v.literal("quo"),
    eventId: v.string(),
    type: v.string(),
    payloadHash: v.string(),
    status: v.union(v.literal("received"), v.literal("processing"), v.literal("processed"), v.literal("ignored"), v.literal("failed")),
    error: v.optional(v.string()),
    claimedAt: v.optional(v.string()),
    claimToken: v.optional(v.string()),
    leaseExpiresAt: v.optional(v.string()),
    attempts: v.optional(v.number()),
    createdAt: v.string(),
    processedAt: v.optional(v.string()),
  }).index("by_provider_eventId", ["provider", "eventId"]),
  smsConsents: defineTable({
    normalizedPhone: v.string(),
    optedOut: v.boolean(),
    version: v.number(),
    sourceEventId: v.optional(v.string()),
    sourceTimestamp: v.optional(v.string()),
    optedOutAt: v.optional(v.string()),
    optedInAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_phone", ["normalizedPhone"]),
  termsVersions: defineTable({
    version: v.string(),
    content: v.string(),
    contentHash: v.string(),
    publishedBy: v.id("users"),
    publishedAt: v.string(),
  }).index("by_version", ["version"]),
  paymentUploadReceipts: defineTable({
    ticketId: v.string(),
    key: v.string(),
    contentType: v.optional(v.string()),
    issuedAt: v.string(),
    expiresAt: v.optional(v.string()),
    uploadedAt: v.optional(v.string()),
    size: v.optional(v.number()),
    etag: v.optional(v.string()),
    consumedAt: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_ticketId", ["ticketId"]),
  saraRateLimits: defineTable({
    key: v.string(),
    windowStartedAt: v.string(),
    count: v.number(),
    updatedAt: v.string(),
  }).index("by_key", ["key"]),
});
