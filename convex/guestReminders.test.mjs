import assert from "node:assert/strict";
import test from "node:test";
import { context, load } from "../lib/convex-test-runtime.mjs";

const reminders = load("guestReminders");
const policy = load("guestReminderPolicy");
const tickets = load("tickets");
const settingsModule = load("settings");
const NOW = Date.parse("2099-05-03T20:00:00Z"); // 10:00 AM Hawaii, May 3.
const base = {
  id: "ticket-1", status: "PRICE SENT", guests: ["Alex"], phone: "+12025550123", email: "alex@example.com",
  checkIn: "2099-05-03", checkOut: "2099-05-04", rateOffered: 2000,
  quoteExpiresAt: new Date(NOW + 12 * 60 * 60_000).toISOString(), quoteRevision: 0, quoteToken: "quote-0",
};
const settings = { quoteReminderSmsEnabled: true, checkoutReminderSmsEnabled: true, checkoutReminderTime: "10:00", saraSmsTestMode: true, saraSmsAllowlist: [base.phone], emailAlertsEnabled: true, staffEmailRecipients: ["staff@example.com"] };
process.env.PUBLIC_APP_URL = "https://crm.example.com";
process.env.QUO_API_KEY = "test-only";
process.env.QUO_FROM = "+18085550123";

async function setup(t, kind = "quoteReminder") {
  t.mock.method(Date, "now", () => NOW);
  const ctx = context();
  await ctx.db.insert("settings", { key: "main", data: structuredClone(settings), updatedAt: "settings-v1" });
  const ticket = { ...base, ...(kind === "checkoutReminder" ? { status: "BOOKING CONFIRMED", reservationConfirmationNumber: "CONF-1" } : {}) };
  await ctx.db.insert("tickets", { ticketId: ticket.id, data: ticket, updatedAt: "ticket-v1" });
  await ctx.db.insert("smsConsents", { normalizedPhone: base.phone, optedOut: false, version: 0 });
  await reminders.syncGuestReminders(ctx, ticket);
  return { ctx, ticket: ctx.rows("tickets")[0].data, job: ctx.rows("guestReminders")[0] };
}
const args = (job) => ({ id: job._id, generation: job.generation });
async function begin(ctx, job) {
  const claim = await reminders.claim.handler(ctx, args(job));
  assert.ok(claim);
  assert.equal(await reminders.confirm.handler(ctx, { id: job._id, claimToken: claim.claimToken }), true);
  return claim;
}

test("day-3 timing uses the final 24 hours of the current immutable expiration", () => {
  const quote = { ...base, quoteExpiresAt: "2099-05-06T08:00:00Z" };
  const plan = policy.reminderPlan(quote, "quoteReminder", settings);
  assert.equal(plan.dueAt, Date.parse("2099-05-05T08:00:00Z"));
  assert.equal(plan.deadline, Date.parse(quote.quoteExpiresAt));
  assert.equal(policy.reminderSettings({}).quoteReminderSmsEnabled, false);
});

test("checkout scheduling uses the previous Hawaii calendar date across year and leap-day boundaries", () => {
  const cases = [["2100-01-01", "2099-12-31T20:00:00Z"], ["2096-03-01", "2096-02-29T20:00:00Z"], ["2099-03-01", "2099-02-28T20:00:00Z"]];
  for (const [checkOut, expected] of cases) {
    const plan = policy.reminderPlan({ ...base, status: "BOOKING CONFIRMED", reservationConfirmationNumber: "C-1", checkIn: "2095-01-01", checkOut }, "checkoutReminder", settings);
    assert.equal(plan.dueAt, Date.parse(expected));
    assert.equal(plan.deadline, Date.parse(`${checkOut}T00:00:00-10:00`));
  }
  const plan = policy.reminderPlan({ ...base, status: "BOOKING CONFIRMED", reservationConfirmationNumber: "C-1" }, "checkoutReminder", { ...settings, checkoutReminderTime: "08:30" });
  assert.equal(plan.dueAt, Date.parse("2099-05-03T18:30:00Z"));
});

test("only valid priced unpaid quotes and confirmed stays can schedule reminders", () => {
  for (const status of ["QUOTE REQUESTED", "PAYMENT SUBMITTED", "PAYMENT VERIFIED", "BOOKING CONFIRMED", "CANCELLED"]) assert.equal(policy.reminderPlan({ ...base, status }, "quoteReminder", settings), null);
  for (const quoteExpiresAt of ["", "garbage"]) assert.equal(policy.reminderPlan({ ...base, quoteExpiresAt }, "quoteReminder", settings), null);
  assert.equal(policy.reminderPlan({ ...base, rateOffered: 0 }, "quoteReminder", settings), null);
  assert.equal(policy.reminderPlan({ ...base, checkOut: "2099-02-30" }, "quoteReminder", settings), null);
  assert.equal(policy.reminderPlan({ ...base, status: "PAYMENT VERIFIED", reservationConfirmationNumber: "C" }, "checkoutReminder", settings), null);
  assert.equal(policy.reminderPlan({ ...base, status: "BOOKING CONFIRMED" }, "checkoutReminder", settings), null);
});

test("templates retain the secure quote link, exact expiration, and requested housekeeping checklist", () => {
  const quote = policy.renderReminder("quoteReminder", base, settings, "https://crm.example.com");
  assert.match(quote, /https:\/\/crm.example.com\/ticket\/ticket-1/);
  assert.match(quote, /May 3, 2099, 10:00 PM/);
  const checkout = policy.renderReminder("checkoutReminder", base, settings, "https://crm.example.com");
  for (const term of ["opened food", "fridge", "trash", "personal belongings", "housekeeping will not dispose"]) assert.ok(checkout.includes(term));
  assert.throws(() => policy.validateReminderSettings({ checkoutReminderTime: "25:00" }), /time/);
  assert.throws(() => policy.validateReminderSettings({ quoteReminderSmsTemplate: "Pay now" }), /must include/);
  assert.throws(() => policy.validateReminderSettings({ checkoutReminderSmsTemplate: "{unknown}" }), /Unsupported/);
});

test("reservation create and pricing update schedule reminders without browser callbacks", async (t) => {
  const { ctx } = await setup(t);
  const created = await tickets.create.handler(ctx, { data: { ...base, roomType: "Residence", status: "PRICE SENT" }, serviceKey: "automation" });
  assert.ok(ctx.rows("guestReminders").some((job) => job.ticketId === created.id));
  const pending = await tickets.create.handler(ctx, { data: { ...base, roomType: "Residence", status: "QUOTE REQUESTED" }, serviceKey: "automation" });
  assert.ok(!ctx.rows("guestReminders").some((job) => job.ticketId === pending.id));
  await tickets.update.handler(ctx, { id: pending.id, data: { status: "PRICE SENT", rateOffered: 2000, quoteExpiresAt: base.quoteExpiresAt, quoteToken: pending.quoteToken }, serviceKey: "automation" });
  assert.ok(ctx.rows("guestReminders").some((job) => job.ticketId === pending.id));
});

test("scheduling and repeated jobs are idempotent; provider acceptance prevents all later replays", async (t) => {
  const { ctx, ticket, job } = await setup(t);
  await reminders.syncGuestReminders(ctx, ticket);
  assert.equal(ctx.rows("guestReminders").length, 1);
  const claim = await begin(ctx, job);
  assert.equal(await reminders.claim.handler(ctx, args(job)), null);
  await reminders.finish.handler(ctx, { id: job._id, claimToken: claim.claimToken, providerMessageId: "quo-1" });
  assert.equal(job.status, "accepted");
  assert.equal(ctx.rows("tickets")[0].updatedAt, "ticket-v1");
  assert.equal(ctx.rows("ticketSmsReceipts")[0].reminderId, job._id);
  await reminders.syncGuestReminders(ctx, ticket);
  assert.equal(await reminders.claim.handler(ctx, args(job)), null);
});

test("checkout edits reschedule before sending and never resend after acceptance", async (t) => {
  const { ctx, ticket, job } = await setup(t, "checkoutReminder");
  const old = args(job);
  ticket.checkOut = "2099-05-05";
  await reminders.syncGuestReminders(ctx, ticket);
  assert.equal(job.status, "scheduled");
  assert.equal(job.checkOut, "2099-05-05");
  assert.equal(await reminders.claim.handler(ctx, old), null);
  assert.equal(job.dueAt, Date.parse("2099-05-04T20:00:00Z"));
  // Return to a due checkout date and accept it once.
  ticket.checkOut = "2099-05-04";
  await reminders.syncGuestReminders(ctx, ticket);
  const claim = await begin(ctx, job);
  await reminders.finish.handler(ctx, { id: job._id, claimToken: claim.claimToken, providerMessageId: "checkout-1" });
  ticket.checkOut = "2099-05-06";
  await reminders.syncGuestReminders(ctx, ticket);
  assert.equal(ctx.rows("guestReminders").length, 1);
  assert.equal(job.status, "accepted");
});

test("requotes cancel obsolete jobs and create only the new revision's reminder", async (t) => {
  const { ctx, ticket, job } = await setup(t);
  const old = args(job);
  Object.assign(ticket, { status: "QUOTE REQUESTED", quoteRevision: 1, quoteToken: "quote-1" });
  await reminders.syncGuestReminders(ctx, ticket);
  assert.equal(job.status, "cancelled");
  ticket.status = "PRICE SENT";
  await reminders.syncGuestReminders(ctx, ticket);
  assert.equal(ctx.rows("guestReminders").length, 2);
  assert.equal(await reminders.claim.handler(ctx, old), null);
  assert.equal(ctx.rows("guestReminders")[1].quoteRevision, 1);
});

test("payment, cancellation, STOP, allowlist removal, disabled switch and staff takeover suppress due sends", async (t) => {
  for (const scenario of ["payment", "cancelled", "stop", "allowlist", "disabled", "staff", "pending-change", "conflict", "expired", "deleted"]) {
    const { ctx, ticket, job } = await setup(t);
    if (scenario === "payment") ticket.status = "PAYMENT SUBMITTED";
    if (scenario === "cancelled") ticket.status = "CANCELLED";
    if (scenario === "stop") ctx.rows("smsConsents")[0].optedOut = true;
    if (scenario === "allowlist") ctx.rows("settings")[0].data.saraSmsAllowlist = [];
    if (scenario === "disabled") ctx.rows("settings")[0].data.quoteReminderSmsEnabled = false;
    if (["staff", "pending-change"].includes(scenario)) {
      ticket.conversationId = "conv-1";
      await ctx.db.insert("conversations", { publicId: "conv-1", channel: "web", aiEnabled: scenario !== "staff", status: "open", ...(scenario === "pending-change" ? { pendingReservationChange: {} } : {}) });
    }
    if (scenario === "conflict") await ctx.db.insert("tickets", { ticketId: "other", data: { ...base, id: "other", status: "PAYMENT SUBMITTED" } });
    if (scenario === "expired") ticket.quoteExpiresAt = new Date(NOW - 1).toISOString();
    if (scenario === "deleted") ctx.rows("tickets").splice(0, 1);
    assert.equal(await reminders.claim.handler(ctx, args(job)), null, scenario);
    assert.equal(job.status, "skipped", scenario);
  }
});

test("final claim fences STOP/START versions, edits, configuration changes and staff controls", async (t) => {
  for (const scenario of ["phone", "version", "consent-version", "settings", "control"]) {
    const { ctx, ticket, job } = await setup(t);
    ticket.conversationId = "conv-1";
    const convId = await ctx.db.insert("conversations", { publicId: "conv-1", channel: "web", status: "open", aiEnabled: true, controlVersion: 0 });
    const claim = await reminders.claim.handler(ctx, args(job));
    if (scenario === "phone") ticket.phone = "+12025550124";
    if (scenario === "version") ctx.rows("tickets")[0].updatedAt = "ticket-v2";
    if (scenario === "consent-version") ctx.rows("smsConsents")[0].version++;
    if (scenario === "settings") ctx.rows("settings")[0].updatedAt = "settings-v2";
    if (scenario === "control") await ctx.db.patch(convId, { controlVersion: 1 });
    assert.equal(await reminders.confirm.handler(ctx, { id: job._id, claimToken: claim.claimToken }), false, scenario);
    assert.equal(job.attempts, 0);
  }
});

test("known provider rate-limit rejections retry at most three calls; ambiguous outcomes never retry", async (t) => {
  for (const status of [429, 400, 503, 408, "network", "missing-id"]) {
    const { ctx, job } = await setup(t);
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      if (status === "network") throw new Error("connection lost");
      return Response.json(status === "missing-id" ? {} : { message: "Provider error" }, { status: typeof status === "number" ? status : 200 });
    });
    await reminders.deliver.handler(ctx, args(job));
    if (status === 429) {
      assert.equal(job.status, "scheduled");
      await reminders.deliver.handler(ctx, args(job));
      await reminders.deliver.handler(ctx, args(job));
      assert.equal(job.status, "failed");
      assert.equal(calls, 3);
    } else {
      assert.equal(job.status, status === 400 ? "failed" : "unknown", String(status));
      await reminders.deliver.handler(ctx, args(job));
      assert.equal(calls, 1);
    }
    assert.equal(ctx.rows("staffNotifications").filter((row) => row.kind === "deliveryFailure").length, 1);
  }
});

test("pre-send lease recovery is safe; post-send recovery requires manual review and late acceptance is retained", async (t) => {
  const { ctx, job } = await setup(t);
  const first = await reminders.claim.handler(ctx, args(job));
  await reminders.recover.handler(ctx, { id: job._id, claimToken: first.claimToken, phase: "preparing" });
  assert.equal(job.status, "scheduled");
  const claim = await begin(ctx, job);
  await reminders.recover.handler(ctx, { id: job._id, claimToken: claim.claimToken, phase: "preparing" });
  assert.equal(job.status, "sending");
  await reminders.recover.handler(ctx, { id: job._id, claimToken: claim.claimToken, phase: "sending" });
  assert.equal(job.status, "unknown");
  await reminders.syncGuestReminders(ctx, ctx.rows("tickets")[0].data);
  assert.equal(job.status, "unknown");
  await reminders.finish.handler(ctx, { id: job._id, claimToken: claim.claimToken, providerMessageId: "late-provider-id" });
  assert.equal(job.status, "accepted");
  assert.ok(ctx.rows("staffNotifications")[0].resolvedAt);
});

test("reminder receipts update delivery history without changing the reservation's SMS fence", async (t) => {
  const { ctx, job } = await setup(t, "checkoutReminder");
  const claim = await begin(ctx, job);
  await reminders.finish.handler(ctx, { id: job._id, claimToken: claim.claimToken, providerMessageId: "receipt-1" });
  await tickets.applySmsDeliveryReceipt.handler(ctx, { serviceKey: "sona", providerMessageId: "receipt-1", delivered: false });
  assert.equal(job.status, "delivery_failed");
  assert.equal(ctx.rows("tickets")[0].updatedAt, "ticket-v1");
  await tickets.applySmsDeliveryReceipt.handler(ctx, { serviceKey: "sona", providerMessageId: "receipt-1", delivered: true });
  assert.equal(job.status, "delivered");
});

test("settings save and paginated reconciliation schedule existing eligible stays, never expired history", async (t) => {
  const { ctx, ticket } = await setup(t);
  ctx.rows("guestReminders").splice(0);
  await ctx.db.insert("tickets", { ticketId: "expired", data: { ...base, id: "expired", quoteExpiresAt: new Date(NOW - 1).toISOString() } });
  await settingsModule.save.handler(ctx, { settings });
  assert.ok(ctx.scheduled.some((job) => job.fn === "guestReminders:reconcile"));
  await reminders.reconcile.handler(ctx, {});
  assert.equal(ctx.rows("guestReminders").length, 1);
  assert.equal(ctx.rows("guestReminders")[0].ticketId, ticket.id);
  ctx.staff = false;
  await assert.rejects(reminders.list.handler(ctx, {}), /Authentication/);
});

test("successful action uses the existing Quo transport and preserves the nested provider ID", async (t) => {
  const { ctx, job } = await setup(t);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return Response.json({ data: { id: "nested-quo-id" } }); });
  await reminders.deliver.handler(ctx, args(job));
  assert.equal(calls[0].url, "https://api.quo.com/v1/messages");
  assert.deepEqual(calls[0].body.to, [base.phone]);
  assert.match(calls[0].body.content, /ticket\/ticket-1/);
  assert.equal(job.providerMessageId, "nested-quo-id");
  await reminders.deliver.handler(ctx, args(job));
  assert.equal(calls.length, 1);
});

test("future jobs stay scheduled; disabled defaults never schedule paid sends", async (t) => {
  const { ctx, ticket, job } = await setup(t);
  ticket.quoteExpiresAt = new Date(NOW + 3 * 86_400_000).toISOString();
  await reminders.syncGuestReminders(ctx, ticket);
  assert.equal(job.dueAt, NOW + 2 * 86_400_000);
  assert.equal(await reminders.claim.handler(ctx, args(job)), null);
  assert.equal(job.status, "scheduled");
  await reminders.syncGuestReminders(ctx, ticket, {});
  assert.equal(job.status, "cancelled");
});

test("a payment transition cancels queued quote reminders immediately", async (t) => {
  const { ctx, ticket, job } = await setup(t);
  await tickets.update.handler(ctx, { id: ticket.id, data: { status: "PAYMENT SUBMITTED" }, serviceKey: "automation" });
  assert.equal(job.status, "cancelled");
  assert.equal(await reminders.claim.handler(ctx, args(job)), null);
});

test("a preparing reminder can be rescheduled safely while its old worker is fenced", async (t) => {
  const { ctx, ticket, job } = await setup(t, "checkoutReminder");
  const claim = await reminders.claim.handler(ctx, args(job));
  ticket.checkOut = "2099-05-05";
  await reminders.syncGuestReminders(ctx, ticket);
  assert.equal(job.status, "scheduled");
  assert.equal(job.checkOut, ticket.checkOut);
  assert.equal(await reminders.confirm.handler(ctx, { id: job._id, claimToken: claim.claimToken }), false);
});

test("missing Convex credentials fail visibly without making a provider call", async (t) => {
  const { ctx, job } = await setup(t);
  const key = process.env.QUO_API_KEY;
  process.env.QUO_API_KEY = "";
  try {
    assert.equal(await reminders.claim.handler(ctx, args(job)), null);
    assert.equal(job.status, "failed");
    assert.equal(job.attempts, 0);
    assert.match(job.reason, /QUO_API_KEY/);
    assert.equal(ctx.rows("staffNotifications")[0].kind, "deliveryFailure");
  } finally { process.env.QUO_API_KEY = key; }
});

test("a skipped opt-out job never revives during automatic reconciliation", async (t) => {
  const { ctx, job } = await setup(t);
  ctx.rows("smsConsents")[0].optedOut = true;
  assert.equal(await reminders.claim.handler(ctx, args(job)), null);
  ctx.rows("smsConsents")[0].optedOut = false;
  ctx.rows("smsConsents")[0].version++;
  await reminders.reconcile.handler(ctx, {});
  assert.equal(job.status, "skipped");
});

test("history omits recipients, bodies and claim secrets", async (t) => {
  const { ctx, job } = await setup(t);
  await reminders.claim.handler(ctx, args(job));
  const history = await reminders.list.handler(ctx, {});
  for (const field of ["phone", "content", "claimToken", "consentVersion", "settingsVersion", "controlVersion"]) assert.ok(!(field in history[0]));
});

test("reconciliation is paginated and continues without replaying expired tickets", async (t) => {
  const { ctx } = await setup(t);
  for (let i = 0; i < 100; i++) await ctx.db.insert("tickets", { ticketId: `old-${i}`, data: { ...base, id: `old-${i}`, quoteExpiresAt: new Date(NOW - 1).toISOString() } });
  await reminders.reconcile.handler(ctx, {});
  assert.ok(ctx.scheduled.some((job) => job.fn === "guestReminders:reconcile" && job.args.cursor === "100"));
  await reminders.reconcile.handler(ctx, { cursor: "100" });
  assert.equal(ctx.rows("guestReminders").length, 1);
});
