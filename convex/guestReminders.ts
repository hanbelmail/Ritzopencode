import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, query } from "./_generated/server";
import { requireStaff } from "./security";
import { getSmsConsent, normalizeSmsPhone } from "./smsConsent";
import { queueStaffAlert } from "./staffNotifications";
import { reminderHawaiiDate, reminderPlan, reminderSettings, REMINDER_LEASE_MS, REMINDER_MAX_ATTEMPTS, renderReminder, sameReminderPlan, type ReminderKind } from "./guestReminderPolicy";
import { getQuoFrom, sendQuoText } from "../lib/quo-server.js";

const kindValidator = v.union(v.literal("quoteReminder"), v.literal("checkoutReminder"));

async function settingsRow(ctx: any) {
  return ctx.db.query("settings").withIndex("by_key", (q: any) => q.eq("key", "main")).first();
}

export async function syncGuestReminders(ctx: any, ticket: any, configured?: any) {
  const settings = configured ?? (await settingsRow(ctx))?.data ?? {};
  const now = Date.now();
  const existing = (await ctx.db.query("guestReminders").withIndex("by_ticketId", (q: any) => q.eq("ticketId", ticket.id)).collect()).map((row: any) => ({ ...row }));
  for (const kind of ["quoteReminder", "checkoutReminder"] as const) {
    const plan = reminderPlan(ticket, kind, settings);
    const enabled = reminderSettings(settings)[`${kind}SmsEnabled`];
    for (const row of existing.filter((row: any) => row.kind === kind)) {
      if (!["scheduled", "preparing"].includes(row.status)) continue;
      if (!enabled || !plan || plan.key !== row.key || plan.deadline <= now || !sameReminderPlan(row, plan)) {
        const cancelled = { status: "cancelled", generation: row.generation + 1, claimToken: undefined, reason: "Reservation or reminder settings changed", updatedAt: new Date(now).toISOString() };
        await ctx.db.patch(row._id, cancelled);
        Object.assign(row, cancelled);
      }
    }
    if (!enabled || !plan || plan.deadline <= now) continue;
    const row = existing.find((row: any) => row.key === plan.key);
    if (row && !["cancelled", "scheduled"].includes(row.status)) continue;
    if (row?.status === "scheduled" && sameReminderPlan(row, plan)) continue;
    const generation = (row?.generation || 0) + 1;
    const patch = { ...plan, kind, ticketId: ticket.id, status: "scheduled", generation, reason: undefined, claimToken: undefined, updatedAt: new Date(now).toISOString() };
    const id = row?._id || await ctx.db.insert("guestReminders", { ...patch, attempts: 0, createdAt: new Date(now).toISOString() });
    if (row) await ctx.db.patch(id, patch);
    await ctx.scheduler.runAfter(Math.max(0, plan.dueAt - now), internal.guestReminders.deliver, { id, generation });
  }
}

// Bounded reconciliation covers settings changes and existing active tickets; no expired reminders are replayed.
export const reconcile = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const settings = (await settingsRow(ctx))?.data || {};
    const page = await ctx.db.query("tickets").withIndex("by_createdAt").paginate({ cursor: args.cursor || null, numItems: 100 });
    for (const row of page.page) await syncGuestReminders(ctx, row.data, settings);
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.guestReminders.reconcile, { cursor: page.continueCursor });
  },
});

async function eligibility(ctx: any, row: any) {
  const ticketRow = await ctx.db.query("tickets").withIndex("by_ticketId", (q: any) => q.eq("ticketId", row.ticketId)).first();
  const configured = await settingsRow(ctx);
  const settings = configured?.data || {};
  const ticket = ticketRow?.data;
  const plan = ticket ? reminderPlan(ticket, row.kind, settings) : null;
  let reason = "";
  if (!plan || !sameReminderPlan(row, plan)) reason = "Reservation changed or is no longer eligible";
  else if (!reminderSettings(settings)[`${row.kind as ReminderKind}SmsEnabled`]) reason = "Reminder disabled";
  else if (Date.now() < row.dueAt) reason = "Reminder is not due";
  else if (Date.now() >= row.deadline) reason = "Reminder window ended";
  const phone = normalizeSmsPhone(ticket?.phone || "");
  if (!reason && !/^\+[1-9]\d{1,14}$/.test(phone)) reason = "Guest phone must use E.164 format";
  const consent = await getSmsConsent(ctx, phone);
  if (!reason && consent.optedOut) reason = "Guest opted out of SMS";
  const allowed = (settings.saraSmsAllowlist || []).some((value: string) => normalizeSmsPhone(value) === phone);
  if (!reason && settings.saraSmsTestMode !== false && !allowed) reason = "Guest is not on the SMS test allowlist";
  const conversation = ticket?.conversationId ? await ctx.db.query("conversations").withIndex("by_publicId", (q: any) => q.eq("publicId", ticket.conversationId)).first() : null;
  if (!reason && conversation && (!conversation.aiEnabled || ["human_required", "closed"].includes(conversation.status) || conversation.pendingReservationChange)) reason = "Conversation is under staff control, closed, or awaiting a reservation change";
  if (!reason && row.kind === "quoteReminder") {
    const conflicts = await ctx.db.query("tickets").collect();
    if (conflicts.some((other: any) => other.data.id !== row.ticketId && ["PAYMENT SUBMITTED", "PAYMENT VERIFIED", "BOOKING CONFIRMED"].includes(other.data.status) && ticket.checkIn < other.data.checkOut && ticket.checkOut > other.data.checkIn)) reason = "Quote dates are no longer available for payment";
    if (!reason && ticket.checkIn < reminderHawaiiDate()) reason = "Check-in is in the past";
  }
  return { reason, ticket, phone, ticketVersion: ticketRow?.updatedAt || "", settingsVersion: configured?.updatedAt || "", consentVersion: consent.version, controlVersion: conversation?.controlVersion || 0 };
}

async function attention(ctx: any, row: any, reason: string) {
  await queueStaffAlert(ctx, { key: `reminder-failure:${row._id}`, kind: "deliveryFailure", ticketId: row.ticketId, reason: `${row.kind}: ${reason}` });
}

export const claim = internalMutation({
  args: { id: v.id("guestReminders"), generation: v.number() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.generation !== args.generation || row.status !== "scheduled") return null;
    if (Date.now() < row.dueAt) return null;
    const current = await eligibility(ctx, row);
    if (current.reason) {
      await ctx.db.patch(row._id, { status: "skipped", reason: current.reason, updatedAt: new Date().toISOString() });
      return null;
    }
    if (row.attempts >= REMINDER_MAX_ATTEMPTS) return null;
    const claimToken = crypto.randomUUID();
    const settings = (await settingsRow(ctx))?.data || {};
    let content: string;
    try {
      const url = process.env.PUBLIC_APP_URL || process.env.SITE_URL;
      if (!url) throw new Error("Configure PUBLIC_APP_URL or SITE_URL in Convex");
      if (!process.env.QUO_API_KEY) throw new Error("Configure QUO_API_KEY in Convex");
      content = renderReminder(row.kind, current.ticket, settings, url);
      getQuoFrom();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Invalid reminder configuration";
      await ctx.db.patch(row._id, { status: "failed", reason, updatedAt: new Date().toISOString() });
      await attention(ctx, row, reason);
      return null;
    }
    const snapshot = { phone: current.phone, ticketVersion: current.ticketVersion, settingsVersion: current.settingsVersion, consentVersion: current.consentVersion, controlVersion: current.controlVersion };
    await ctx.db.patch(row._id, { status: "preparing", claimToken, content, ...snapshot, updatedAt: new Date().toISOString() });
    await ctx.scheduler.runAfter(REMINDER_LEASE_MS, internal.guestReminders.recover, { id: row._id, claimToken, phase: "preparing" });
    return { claimToken, content, phone: current.phone };
  },
});

export const confirm = internalMutation({
  args: { id: v.id("guestReminders"), claimToken: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.status !== "preparing" || row.claimToken !== args.claimToken) return false;
    const current = await eligibility(ctx, row);
    const changed = ["phone", "ticketVersion", "settingsVersion", "consentVersion", "controlVersion"].some((key) => row[key as keyof typeof row] !== current[key as keyof typeof current]);
    if (current.reason || changed) {
      await ctx.db.patch(row._id, { status: "skipped", claimToken: undefined, reason: current.reason || "Reservation, consent, settings, or staff control changed before delivery", updatedAt: new Date().toISOString() });
      return false;
    }
    await ctx.db.patch(row._id, { status: "sending", attempts: row.attempts + 1, updatedAt: new Date().toISOString() });
    await ctx.scheduler.runAfter(REMINDER_LEASE_MS, internal.guestReminders.recover, { ...args, phase: "sending" });
    return true;
  },
});

export const finish = internalMutation({
  args: { id: v.id("guestReminders"), claimToken: v.string(), providerMessageId: v.optional(v.string()), error: v.optional(v.string()), rejected: v.optional(v.boolean()), retryable: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;
    const now = new Date().toISOString();
    if (args.providerMessageId) {
      const receipt = await ctx.db.query("ticketSmsReceipts").withIndex("by_providerMessageId", (q) => q.eq("providerMessageId", args.providerMessageId!)).first();
      if (!receipt) await ctx.db.insert("ticketSmsReceipts", { ticketId: row.ticketId, event: row.kind, reminderId: row._id, providerMessageId: args.providerMessageId, status: "accepted", createdAt: now, updatedAt: now });
      // A late provider acceptance still wins over an unknown lease; never send this key again.
      if (!["delivered", "delivery_failed"].includes(row.status)) await ctx.db.patch(row._id, { status: "accepted", acceptedAt: now, providerMessageId: args.providerMessageId, claimToken: undefined, reason: undefined, updatedAt: now });
      const alert = await ctx.db.query("staffNotifications").withIndex("by_key", (q) => q.eq("key", `reminder-failure:${row._id}`)).first();
      if (alert) await ctx.db.patch(alert._id, { resolvedAt: now });
      return;
    }
    if (row.status !== "sending" || row.claimToken !== args.claimToken) return;
    const retry = args.rejected === true && args.retryable === true && row.attempts < REMINDER_MAX_ATTEMPTS && Date.now() + 60_000 < row.deadline;
    const reason = args.error || "Quo result is unknown; check provider history before sending manually";
    await ctx.db.patch(row._id, { status: retry ? "scheduled" : args.rejected ? "failed" : "unknown", claimToken: undefined, reason, updatedAt: now });
    if (retry) await ctx.scheduler.runAfter(60_000, internal.guestReminders.deliver, { id: row._id, generation: row.generation });
    else await attention(ctx, row, reason);
  },
});

export const recover = internalMutation({
  args: { id: v.id("guestReminders"), claimToken: v.string(), phase: v.union(v.literal("preparing"), v.literal("sending")) },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.claimToken !== args.claimToken || row.status !== args.phase) return;
    if (row.status === "preparing") {
      await ctx.db.patch(row._id, { status: "scheduled", claimToken: undefined, updatedAt: new Date().toISOString() });
      await ctx.scheduler.runAfter(0, internal.guestReminders.deliver, { id: row._id, generation: row.generation });
    } else if (row.status === "sending") {
      const reason = "SMS worker ended without a confirmed result. Do not resend without checking Quo history.";
      await ctx.db.patch(row._id, { status: "unknown", claimToken: undefined, reason, updatedAt: new Date().toISOString() });
      await attention(ctx, row, reason);
    }
  },
});

export const deliver = internalAction({
  args: { id: v.id("guestReminders"), generation: v.number() },
  handler: async (ctx, args): Promise<void> => {
    const claim = await ctx.runMutation(internal.guestReminders.claim, args);
    if (!claim) return;
    if (!await ctx.runMutation(internal.guestReminders.confirm, { id: args.id, claimToken: claim.claimToken })) return;
    let result: { providerMessageId?: string; error?: string; rejected?: boolean; retryable?: boolean };
    try {
      const message = await sendQuoText({ to: claim.phone, content: claim.content });
      result = message.providerMessageId ? { providerMessageId: message.providerMessageId } : { error: "Quo accepted the request without a usable message ID; review provider history" };
    } catch (error: any) {
      // 5xx, timeout and network failures may already have sent the SMS. Only explicit rejections are safe to retry.
      result = { error: `Quo SMS failed${Number.isInteger(error.status) ? ` (HTTP ${error.status})` : ""}; review reminder and provider history`, rejected: error.ambiguous === false && error.status >= 400 && error.status < 500, retryable: [425, 429].includes(error.status) };
    }
    await ctx.runMutation(internal.guestReminders.finish, { id: args.id, claimToken: claim.claimToken, ...result });
  },
});

export const list = query({
  args: { kind: v.optional(kindValidator) },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const rows = args.kind ? await ctx.db.query("guestReminders").withIndex("by_kind_createdAt", (q) => q.eq("kind", args.kind!)).order("desc").take(100) : await ctx.db.query("guestReminders").withIndex("by_createdAt").order("desc").take(100);
    return rows.map(({ content, claimToken, phone, ticketVersion, settingsVersion, consentVersion, controlVersion, ...row }) => row);
  },
});
