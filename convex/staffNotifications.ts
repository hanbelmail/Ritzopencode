import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { requireStaff, requireStaffOrAutomation } from "./security";
import { activeStaffEmails, buildStaffAlertEmail, canRetryStaffAlert, QUOTE_STALLED_MS, retryableEmailStatus, STAFF_ALERT_LEASE_MS, STAFF_ALERT_RETRY_DELAYS, staffAlertSkipReason, staffAlertTitle } from "./staffNotificationPolicy";

type AlertInput = {
  key: string;
  kind: "newQuote" | "quoteFailure" | "quoteStalled" | "quoteWebhookFailure" | "handoff" | "deliveryFailure";
  ticketId?: string;
  conversationId?: string;
  quoteRevision?: number;
  reason?: string;
};

export async function queueStaffAlert(ctx: any, input: AlertInput) {
  const existing = await ctx.db.query("staffNotifications").withIndex("by_key", (q: any) => q.eq("key", input.key)).first();
  if (existing) {
    if (input.kind === "deliveryFailure" && existing.resolvedAt) await ctx.db.patch(existing._id, { resolvedAt: undefined, reason: input.reason, updatedAt: new Date().toISOString() });
    return existing._id;
  }
  const now = new Date().toISOString();
  const id = await ctx.db.insert("staffNotifications", { ...input, status: "pending", attempts: 0, createdAt: now, updatedAt: now });
  await ctx.scheduler.runAfter(0, internal.staffNotifications.deliver, { id });
  return id;
}

export async function queueNewQuoteAlert(ctx: any, ticket: any) {
  if (ticket.status !== "QUOTE REQUESTED") return;
  await queueStaffAlert(ctx, { key: `new-quote:${ticket.id}`, kind: "newQuote", ticketId: ticket.id });
}

export async function queueQuoteProblem(ctx: any, ticket: any, kind: "quoteFailure" | "quoteStalled" | "quoteWebhookFailure", reason: string) {
  if (!["QUOTE REQUESTED", "QUOTE"].includes(ticket.status)) return;
  const revision = ticket.quoteRevision || 0;
  return queueStaffAlert(ctx, { key: `${kind}:${ticket.id}:${revision}`, kind, ticketId: ticket.id, quoteRevision: revision, reason: reason.slice(0, 1000) });
}

export const checkStalledQuote = internalMutation({
  args: { ticketId: v.string(), quoteRevision: v.number() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId)).first();
    if (!row || (row.data.quoteRevision || 0) !== args.quoteRevision || row.data.quoteError) return;
    await queueQuoteProblem(ctx, row.data, "quoteStalled", "No price has been saved after 10 minutes. Review the quote automation or prepare the quote manually.");
  },
});

// Compatibility/manual recovery endpoint. Historical tickets are never bulk-replayed.
export const requestNewQuoteAlert = mutation({
  args: { ticketId: v.string(), serviceKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireStaffOrAutomation(ctx, args.serviceKey);
    const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId)).first();
    if (!row) throw new Error("Ticket not found");
    return queueStaffAlert(ctx, { key: `new-quote:${args.ticketId}`, kind: "newQuote", ticketId: args.ticketId });
  },
});

async function contextFor(ctx: any, row: any) {
  const ticket = row.ticketId ? await ctx.db.query("tickets").withIndex("by_ticketId", (q: any) => q.eq("ticketId", row.ticketId)).first() : null;
  const conversation = row.conversationId ? await ctx.db.query("conversations").withIndex("by_publicId", (q: any) => q.eq("publicId", row.conversationId)).first() : null;
  const settings = await ctx.db.query("settings").withIndex("by_key", (q: any) => q.eq("key", "main")).first();
  return { ticket, conversation, settings: settings?.data || {} };
}

export const claim = internalMutation({
  args: { id: v.id("staffNotifications") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row || row.status !== "pending") return null;
    const now = Date.now();
    const context = await contextFor(ctx, row);
    const skip = staffAlertSkipReason(row, context.ticket?.data, context.conversation, context.settings);
    if (skip) {
      await ctx.db.patch(id, { status: "skipped", lastError: skip, updatedAt: new Date(now).toISOString() });
      return null;
    }
    if (!canRetryStaffAlert(row, now)) {
      await ctx.db.patch(id, { status: "failed", lastError: "Automatic retry limit reached; check provider history before sending manually", updatedAt: new Date(now).toISOString() });
      return null;
    }
    let payload = row.payload;
    try {
      if (!payload) {
        const from = process.env.AUTH_RESEND_FROM;
        const appUrl = process.env.PUBLIC_APP_URL || process.env.SITE_URL;
        if (!from || !appUrl || !process.env.AUTH_RESEND_KEY) throw new Error("Configure AUTH_RESEND_KEY, AUTH_RESEND_FROM and PUBLIC_APP_URL (or SITE_URL) in Convex");
        payload = { from, to: activeStaffEmails(context.settings), ...buildStaffAlertEmail(row, context.ticket?.data, context.conversation, appUrl) };
      } else if (payload.to.some((email: string) => !activeStaffEmails(context.settings).includes(email))) {
        // A frozen payload is required by provider idempotency. Never resend it to a removed recipient.
        await ctx.db.patch(id, { status: "skipped", lastError: "Staff recipients changed; check provider history before sending manually", updatedAt: new Date(now).toISOString() });
        return null;
      }
    } catch (error) {
      await ctx.db.patch(id, { status: "failed", lastError: error instanceof Error ? error.message : "Email configuration is invalid", updatedAt: new Date(now).toISOString() });
      return null;
    }
    const claimToken = crypto.randomUUID();
    const attempt = row.attempts + 1;
    await ctx.db.patch(id, { payload, status: "sending", attempts: attempt, claimToken, firstAttemptAt: row.firstAttemptAt || new Date(now).toISOString(), lastError: undefined, updatedAt: new Date(now).toISOString() });
    await ctx.db.insert("staffNotificationAttempts", { notificationId: id, attempt, status: "sending", createdAt: new Date(now).toISOString() });
    await ctx.scheduler.runAfter(STAFF_ALERT_LEASE_MS, internal.staffNotifications.recover, { id, claimToken });
    return { id, claimToken, payload };
  },
});

async function finishAttempt(ctx: any, row: any, status: string, error?: string, providerMessageId?: string) {
  const attempt = await ctx.db.query("staffNotificationAttempts").withIndex("by_notification_attempt", (q: any) => q.eq("notificationId", row._id).eq("attempt", row.attempts)).first();
  if (attempt) await ctx.db.patch(attempt._id, { status, error, providerMessageId, completedAt: new Date().toISOString() });
}

async function failAttempt(ctx: any, row: any, error: string, retryable: boolean) {
  const retry = retryable && canRetryStaffAlert(row, Date.now());
  await finishAttempt(ctx, row, "failed", error);
  await ctx.db.patch(row._id, { status: retry ? "pending" : "failed", claimToken: undefined, lastError: error, updatedAt: new Date().toISOString() });
  if (retry) await ctx.scheduler.runAfter(STAFF_ALERT_RETRY_DELAYS[Math.min(row.attempts - 1, STAFF_ALERT_RETRY_DELAYS.length - 1)], internal.staffNotifications.deliver, { id: row._id });
  // No recursive email about a failing staff email transport. The attention view remains available.
}

export const finish = internalMutation({
  args: { id: v.id("staffNotifications"), claimToken: v.string(), providerMessageId: v.optional(v.string()), error: v.optional(v.string()), retryable: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.status !== "sending" || row.claimToken !== args.claimToken) return;
    if (!args.providerMessageId) return failAttempt(ctx, row, args.error || "Email delivery failed", args.retryable === true);
    const now = new Date().toISOString();
    await finishAttempt(ctx, row, "accepted", undefined, args.providerMessageId);
    await ctx.db.patch(row._id, { status: "accepted", providerMessageId: args.providerMessageId, acceptedAt: now, claimToken: undefined, lastError: undefined, updatedAt: now });
    if (row.kind === "newQuote" && row.ticketId) {
      const ticket = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", row.ticketId!)).first();
      // Do not move ticket.updatedAt: it fences an in-flight lifecycle SMS claim.
      if (ticket) await ctx.db.patch(ticket._id, { data: { ...ticket.data, quoteAlertEmailSentAt: now } });
    }
  },
});

export const recover = internalMutation({
  args: { id: v.id("staffNotifications"), claimToken: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (row?.status === "sending" && row.claimToken === args.claimToken) await failAttempt(ctx, row, "Email attempt timed out; retrying with the same provider idempotency key", true);
  },
});

export const deliver = internalAction({
  args: { id: v.id("staffNotifications") },
  handler: async (ctx, args): Promise<void> => {
    const claimed = await ctx.runMutation(internal.staffNotifications.claim, args);
    if (!claimed) return;
    const result: { providerMessageId?: string; error?: string; retryable?: boolean } = {};
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `staff-alert/${args.id}` },
        body: JSON.stringify(claimed.payload),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (response.ok && typeof body?.id === "string" && body.id) result.providerMessageId = body.id;
      else {
        result.error = `Resend HTTP ${response.status}${response.ok ? ": missing message ID" : ""}`;
        result.retryable = response.ok || retryableEmailStatus(response.status);
      }
    } catch {
      result.error = "Email provider connection failed or timed out";
      result.retryable = true;
    } finally {
      clearTimeout(timeout);
    }
    await ctx.runMutation(internal.staffNotifications.finish, { id: args.id, claimToken: claimed.claimToken, ...result });
  },
});

export const retry = mutation({
  args: { id: v.id("staffNotifications") },
  handler: async (ctx, { id }) => {
    await requireStaff(ctx);
    const row = await ctx.db.get(id);
    if (!row || !["failed", "skipped"].includes(row.status)) throw new Error("This notification cannot be retried");
    if (!canRetryStaffAlert(row, Date.now())) throw new Error("Retry limit reached. Check Resend history before sending manually.");
    await ctx.db.patch(id, { status: "pending", lastError: undefined, updatedAt: new Date().toISOString() });
    await ctx.scheduler.runAfter(0, internal.staffNotifications.deliver, { id });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("staffNotifications").withIndex("by_createdAt").order("desc").take(100);
    return rows.map(({ payload, claimToken, ...row }) => ({ ...row, title: staffAlertTitle(row.kind), recipientCount: payload?.to.length || 0, canRetry: ["failed", "skipped"].includes(row.status) && canRetryStaffAlert(row, Date.now()) }));
  },
});

export const attempts = query({
  args: { id: v.id("staffNotifications") },
  handler: async (ctx, { id }) => {
    await requireStaff(ctx);
    return ctx.db.query("staffNotificationAttempts").withIndex("by_notification_attempt", (q) => q.eq("notificationId", id)).order("desc").take(10);
  },
});

export const needsAttention = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const [tickets, conversations, failures, deliveryFailures, quoteProblems, stalledAlerts] = await Promise.all([
      ctx.db.query("tickets").withIndex("by_status_createdAt", (q) => q.eq("status", "QUOTE REQUESTED")).order("desc").take(201),
      ctx.db.query("conversations").withIndex("by_status_lastMessageAt", (q) => q.eq("status", "human_required")).order("desc").take(201),
      ctx.db.query("staffNotifications").withIndex("by_status_createdAt", (q) => q.eq("status", "failed")).order("desc").take(201),
      ctx.db.query("staffNotifications").withIndex("by_kind_createdAt", (q) => q.eq("kind", "deliveryFailure")).order("desc").take(201),
      ctx.db.query("staffNotifications").withIndex("by_kind_createdAt", (q) => q.eq("kind", "quoteWebhookFailure")).order("desc").take(201),
      ctx.db.query("staffNotifications").withIndex("by_kind_createdAt", (q) => q.eq("kind", "quoteStalled")).order("desc").take(201),
    ]);
    const items: any[] = [];
    for (const row of tickets.slice(0, 200)) {
      const ticket = row.data;
      const requestedAt = ticket.quoteRequestedAt || ticket.createdAt;
      if (!ticket.quoteError && Date.now() - Date.parse(requestedAt) < QUOTE_STALLED_MS) continue;
      items.push({ key: `quote:${row._id}`, title: ticket.quoteError ? "Quote lookup failed" : "Quote awaiting price for over 10 minutes", reason: ticket.quoteError || "Review automation or prepare the quote manually.", ticketId: ticket.id, createdAt: requestedAt });
    }
    for (const row of conversations.slice(0, 200)) items.push({ key: `conversation:${row._id}`, title: "Sona needs human assistance", reason: `${row.channel.toUpperCase()} conversation`, conversationId: row.publicId, ticketId: row.ticketId, createdAt: row.updatedAt });
    for (const row of [...quoteProblems.slice(0, 200), ...stalledAlerts.slice(0, 200)]) {
      if (!row.ticketId) continue;
      const ticket = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", row.ticketId!)).first();
      if (!ticket || ticket.data.status !== "QUOTE REQUESTED" || (ticket.data.quoteRevision || 0) !== row.quoteRevision) continue;
      if (items.some((item) => item.key === `quote:${ticket._id}`)) continue;
      items.push({ key: `quote:${ticket._id}`, title: staffAlertTitle(row.kind), reason: row.reason, ticketId: row.ticketId, createdAt: row.createdAt });
    }
    for (const row of failures.slice(0, 200)) {
      if (row.resolvedAt) continue;
      items.push({ key: `alert:${row._id}`, title: `${staffAlertTitle(row.kind)} — email failed`, reason: row.lastError, ticketId: row.ticketId, notificationId: row._id, canRetry: canRetryStaffAlert(row, Date.now()), createdAt: row.updatedAt });
    }
    for (const row of deliveryFailures.slice(0, 200)) {
      if (row.resolvedAt) continue;
      if (row.ticketId) {
        const ticket = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", row.ticketId!)).first();
        if (!ticket || ticket.data.status === "CANCELLED" || (row.quoteRevision !== undefined && (ticket.data.quoteRevision || 0) !== row.quoteRevision)) continue;
      }
      items.push({ key: `delivery:${row._id}`, title: "Notification delivery needs review", reason: row.reason, ticketId: row.ticketId, conversationId: row.conversationId, notificationId: row._id, resolvable: true, createdAt: row.createdAt });
    }
    return { items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), limited: [tickets, conversations, failures, deliveryFailures, quoteProblems, stalledAlerts].some((rows) => rows.length > 200) };
  },
});

export const recordDeliveryResult = mutation({
  args: { serviceKey: v.string(), ticketId: v.string(), event: v.string(), quoteRevision: v.number(), error: v.optional(v.string()), accepted: v.boolean() },
  handler: async (ctx, args) => {
    await requireStaffOrAutomation(ctx, args.serviceKey);
    if (!/^(priceSent|paymentSubmitted|paymentVerified|bookingConfirmed):(email|sms|staffEmail)$/.test(args.event)) throw new Error("Invalid notification event");
    const ticket = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.ticketId)).first();
    if (!ticket || (ticket.data.quoteRevision || 0) !== args.quoteRevision) return;
    const key = `delivery:${args.ticketId}:${args.quoteRevision}:${args.event}`;
    const existing = await ctx.db.query("staffNotifications").withIndex("by_key", (q) => q.eq("key", key)).first();
    if (args.accepted) {
      if (existing) await ctx.db.patch(existing._id, { resolvedAt: new Date().toISOString() });
    } else if (args.error) {
      await queueStaffAlert(ctx, { key, kind: "deliveryFailure", ticketId: args.ticketId, quoteRevision: args.quoteRevision, reason: `${args.event}: ${args.error.slice(0, 700)}` });
    }
  },
});

export const resolveDeliveryIssue = mutation({
  args: { id: v.id("staffNotifications") },
  handler: async (ctx, { id }) => {
    await requireStaff(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.kind !== "deliveryFailure") throw new Error("Only delivery issues can be marked reviewed");
    await ctx.db.patch(id, { resolvedAt: new Date().toISOString() });
  },
});
