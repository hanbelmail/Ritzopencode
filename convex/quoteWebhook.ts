import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const MAX_ATTEMPTS = 5;
const DELIVERY_LEASE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_DELAYS_MS = [30_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

function deliveryError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Unknown webhook error");
  return message.slice(0, 1000);
}

function webhookUrl(value: unknown) {
  const url = new URL(String(value || "").trim());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Webhook URL must use HTTP or HTTPS");
  return url.toString();
}

export async function queueQuoteWebhook(ctx: any, ticket: any) {
  if (ticket?.status !== "QUOTE REQUESTED" || !ticket?.id) return null;

  const idempotencyKey = `quote-created:${ticket.id}`;
  const existing = await ctx.db
    .query("quoteWebhookDeliveries")
    .withIndex("by_idempotencyKey", (q: any) => q.eq("idempotencyKey", idempotencyKey))
    .first();
  if (existing) return existing._id;

  const now = new Date().toISOString();
  const deliveryId = await ctx.db.insert("quoteWebhookDeliveries", {
    ticketId: ticket.id,
    idempotencyKey,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.quoteWebhook.deliver, { deliveryId });
  return deliveryId;
}

export const claim = internalMutation({
  args: { deliveryId: v.id("quoteWebhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.db.get(deliveryId);
    if (!delivery || !["pending", "failed"].includes(delivery.status)) return { claimed: false as const };
    if (delivery.status === "failed" && delivery.retryable !== true) return { claimed: false as const };
    if (delivery.attempts >= MAX_ATTEMPTS) return { claimed: false as const };

    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const settings = settingsRow?.data || {};
    const now = new Date();
    if (settings.webhookEnabled !== true) {
      await ctx.db.patch(deliveryId, {
        status: "skipped",
        retryable: false,
        lastError: "Webhook is disabled",
        updatedAt: now.toISOString(),
      });
      return { claimed: false as const };
    }

    const ticketRow = await ctx.db
      .query("tickets")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", delivery.ticketId))
      .first();
    if (!ticketRow) {
      await ctx.db.patch(deliveryId, {
        status: "skipped",
        retryable: false,
        lastError: "Ticket no longer exists",
        updatedAt: now.toISOString(),
      });
      return { claimed: false as const };
    }

    const claimToken = crypto.randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + DELIVERY_LEASE_MS).toISOString();
    await ctx.db.patch(deliveryId, {
      status: "sending",
      attempts: delivery.attempts + 1,
      retryable: undefined,
      responseStatus: undefined,
      lastError: undefined,
      claimToken,
      leaseExpiresAt,
      updatedAt: now.toISOString(),
    });
    await ctx.scheduler.runAfter(DELIVERY_LEASE_MS + 1000, internal.quoteWebhook.recoverStale, {
      deliveryId,
      claimToken,
    });

    return {
      claimed: true as const,
      claimToken,
      idempotencyKey: delivery.idempotencyKey,
      ticket: ticketRow.data,
      url: settings.webhookUrl,
    };
  },
});

export const finish = internalMutation({
  args: {
    deliveryId: v.id("quoteWebhookDeliveries"),
    claimToken: v.string(),
    sent: v.boolean(),
    retryable: v.optional(v.boolean()),
    responseStatus: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery || delivery.status !== "sending" || delivery.claimToken !== args.claimToken) return;

    const now = new Date().toISOString();
    if (args.sent) {
      await ctx.db.patch(args.deliveryId, {
        status: "sent",
        retryable: false,
        responseStatus: args.responseStatus,
        lastError: undefined,
        claimToken: undefined,
        leaseExpiresAt: undefined,
        updatedAt: now,
        sentAt: now,
      });
      return;
    }

    const retryable = args.retryable === true && delivery.attempts < MAX_ATTEMPTS;
    await ctx.db.patch(args.deliveryId, {
      status: "failed",
      retryable,
      responseStatus: args.responseStatus,
      lastError: args.error || "Webhook delivery failed",
      claimToken: undefined,
      leaseExpiresAt: undefined,
      updatedAt: now,
    });
    if (retryable) {
      const delay = RETRY_DELAYS_MS[Math.min(delivery.attempts - 1, RETRY_DELAYS_MS.length - 1)];
      await ctx.scheduler.runAfter(delay, internal.quoteWebhook.deliver, { deliveryId: args.deliveryId });
    }
  },
});

export const recoverStale = internalMutation({
  args: { deliveryId: v.id("quoteWebhookDeliveries"), claimToken: v.string() },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    const now = new Date();
    if (
      !delivery ||
      delivery.status !== "sending" ||
      delivery.claimToken !== args.claimToken ||
      !delivery.leaseExpiresAt ||
      delivery.leaseExpiresAt > now.toISOString()
    ) return;

    const retryable = delivery.attempts < MAX_ATTEMPTS;
    await ctx.db.patch(args.deliveryId, {
      status: "failed",
      retryable,
      lastError: "Webhook delivery lease expired",
      claimToken: undefined,
      leaseExpiresAt: undefined,
      updatedAt: now.toISOString(),
    });
    if (retryable) await ctx.scheduler.runAfter(0, internal.quoteWebhook.deliver, { deliveryId: args.deliveryId });
  },
});

export const deliver = internalAction({
  args: { deliveryId: v.id("quoteWebhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const claimed = await ctx.runMutation(internal.quoteWebhook.claim, { deliveryId });
    if (!claimed.claimed) return;

    let url: string;
    try {
      url = webhookUrl(claimed.url);
    } catch (error) {
      await ctx.runMutation(internal.quoteWebhook.finish, {
        deliveryId,
        claimToken: claimed.claimToken,
        sent: false,
        retryable: false,
        error: deliveryError(error),
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": claimed.idempotencyKey,
          "X-Quote-Event-Id": claimed.idempotencyKey,
        },
        body: JSON.stringify(claimed.ticket),
        signal: controller.signal,
      });
      const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
      await ctx.runMutation(internal.quoteWebhook.finish, {
        deliveryId,
        claimToken: claimed.claimToken,
        sent: response.ok,
        retryable: !response.ok && retryable,
        responseStatus: response.status,
        error: response.ok ? undefined : `Webhook returned ${response.status}`,
      });
    } catch (error) {
      await ctx.runMutation(internal.quoteWebhook.finish, {
        deliveryId,
        claimToken: claimed.claimToken,
        sent: false,
        retryable: true,
        error: deliveryError(error),
      });
    } finally {
      clearTimeout(timeout);
    }
  },
});
