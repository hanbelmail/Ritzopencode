import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { anyApi, getFunctionName } from "convex/server";

// Exercise the production mutation/action handlers against an in-memory DB and scheduler.
// Only the Convex runtime boundary and authentication are replaced; no live messages are sent.
const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const modules = new Map();
const staff = async (ctx) => { if (!ctx.staff) throw new Error("Authentication required"); return "staff"; };
function load(name) {
  const file = resolve(root, `${name}.ts`);
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = (id) => {
    if (id === "./_generated/api") return { api: anyApi, internal: anyApi };
    if (id === "./_generated/server") return Object.fromEntries(["mutation", "query", "internalMutation", "internalAction"].map((key) => [key, (config) => config]));
    if (id === "./security") return { requireStaff: staff, isStaff: async (ctx) => Boolean(ctx.staff), isAutomationKey: (key) => key === "automation", requireServiceKey: (key) => { if (key !== "sona") throw new Error("Invalid service credential"); }, requireStaffOrAutomation: async (ctx, key) => { if (key !== "automation") await staff(ctx); } };
    return id.startsWith("./") ? load(id.slice(2)) : require(id);
  };
  new Function("require", "module", "exports", code)(localRequire, module, module.exports);
  return module.exports;
}
const alerts = load("staffNotifications");
const policy = load("staffNotificationPolicy");
const tickets = load("tickets");
const sona = load("sara");
const webhook = load("quoteWebhook");

function context() {
  let sequence = 0;
  const tables = new Map();
  const rows = (table) => { if (!tables.has(table)) tables.set(table, []); return tables.get(table); };
  const get = (id) => [...tables.values()].flat().find((row) => row._id === id) || null;
  const ctx = {
    staff: true, scheduled: [], rows,
    db: {
      async insert(table, data) { const id = `${table}:${++sequence}`; rows(table).push({ ...structuredClone(data), _id: id }); return id; },
      async get(id) { return get(id); },
      async patch(id, patch) { assert.ok(get(id), `Missing row ${id}`); Object.assign(get(id), structuredClone(patch)); },
      query(table) {
        const filters = [];
        let descending = false;
        const all = () => { const result = rows(table).filter((row) => filters.every(([key, value]) => row[key] === value)); return descending ? result.toReversed() : result; };
        return {
          withIndex(_name, callback) { if (callback) { const q = { eq(key, value) { filters.push([key, value]); return q; } }; callback(q); } return this; },
          order(direction) { descending = direction === "desc"; return this; },
          async first() { return all()[0] || null; }, async collect() { return all(); }, async take(count) { return all().slice(0, count); },
        };
      },
    },
    scheduler: { async runAfter(delay, fn, args) { ctx.scheduled.push({ delay, fn: getFunctionName(fn), args }); } },
    async runMutation(fn, args) { const [name, method] = getFunctionName(fn).split(":"); return load(name)[method].handler(ctx, args); },
  };
  return ctx;
}
const settings = { emailAlertsEnabled: true, quoteAlertEnabled: true, staffEmailRecipients: [{ email: "staff@example.com", active: true }], roomTypes: [{ name: "Residence" }] };
const input = { guests: ["Test Guest"], email: "guest@example.com", phone: "+12025550123", checkIn: "2099-05-01", checkOut: "2099-05-05", roomType: "Residence", status: "QUOTE REQUESTED" };
async function setup(isStaff = true) {
  const ctx = context();
  ctx.staff = isStaff;
  await ctx.db.insert("settings", { key: "main", data: structuredClone(settings) });
  await ctx.db.insert("smsConsents", { normalizedPhone: input.phone, optedOut: false, version: 0 });
  return ctx;
}
async function newTicket(ctx) {
  return tickets.create.handler(ctx, { data: structuredClone(input) });
}
process.env.AUTH_RESEND_KEY = "test-only";
process.env.AUTH_RESEND_FROM = "Reservations <reservations@example.com>";
process.env.PUBLIC_APP_URL = "https://crm.example.com";

test("public and staff inquiry creation each atomically queue one staff alert", async () => {
  for (const isStaff of [false, true]) {
    const ctx = await setup(isStaff);
    const ticket = await newTicket(ctx);
    assert.equal(ctx.rows("staffNotifications").length, 1);
    assert.equal(ctx.rows("staffNotifications")[0].key, `new-quote:${ticket.id}`);
    assert.equal(ctx.rows("quoteWebhookDeliveries").length, 1);
    assert.ok(ctx.scheduled.some((job) => job.fn === "staffNotifications:checkStalledQuote"));
    await alerts.queueNewQuoteAlert(ctx, ticket);
    assert.equal(ctx.rows("staffNotifications").length, 1);
  }
});

test("Sona web and SMS inquiries queue alerts and duplicate tool calls do not replay", async () => {
  for (const channel of ["web", "sms"]) {
    const ctx = await setup(false);
    await ctx.db.insert("conversations", { publicId: "conversation-1", channel, externalParticipant: input.phone, controlVersion: 0, aiEnabled: true, collected: {} });
    const args = { ...input, serviceKey: "sona", publicId: "conversation-1", expectedControlVersion: 0, idempotencyKey: "request-1", acquisitionSource: "direct" };
    const first = await sona.createQuoteRequest.handler(ctx, args);
    const duplicate = await sona.createQuoteRequest.handler(ctx, args);
    assert.equal(duplicate.ticket.id, first.ticket.id);
    assert.equal(ctx.rows("staffNotifications").length, 1);
  }
});

test("legacy import does not replay inquiry emails", async () => {
  const ctx = await setup();
  await tickets.importLegacy.handler(ctx, { tickets: [{ ...input, id: "legacy", createdAt: "2020-01-01T00:00:00Z" }] });
  assert.equal(ctx.rows("staffNotifications").length, 0);
});

test("fast pricing cannot suppress an inquiry alert and its stamp preserves the SMS concurrency fence", async () => {
  const ctx = await setup();
  await newTicket(ctx);
  const ticket = ctx.rows("tickets")[0];
  ticket.data.status = "PRICE SENT";
  ticket.updatedAt = "sms-claim-fence";
  const id = ctx.rows("staffNotifications")[0]._id;
  const claim = await alerts.claim.handler(ctx, { id });
  assert.ok(claim);
  assert.equal(await alerts.claim.handler(ctx, { id }), null);
  await alerts.finish.handler(ctx, { id, claimToken: "wrong", providerMessageId: "ignored" });
  assert.equal(ctx.rows("staffNotifications")[0].status, "sending");
  await alerts.finish.handler(ctx, { id, claimToken: claim.claimToken, providerMessageId: "email-123" });
  assert.ok(ticket.data.quoteAlertEmailSentAt);
  assert.equal(ticket.updatedAt, "sms-claim-fence");
  assert.equal(ctx.rows("staffNotificationAttempts")[0].status, "accepted");
});

test("provider retries reuse the exact payload and idempotency key", async () => {
  const ctx = await setup();
  await newTicket(ctx);
  const id = ctx.rows("staffNotifications")[0]._id;
  const calls = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    calls.push(options);
    return calls.length === 1 ? new Response("{}", { status: 429 }) : Response.json({ id: "email-success" });
  };
  try {
    await alerts.deliver.handler(ctx, { id });
    assert.equal(ctx.rows("staffNotifications")[0].status, "pending");
    ctx.rows("tickets")[0].data.status = "PRICE SENT";
    await alerts.deliver.handler(ctx, { id });
    assert.equal(calls[0].body, calls[1].body);
    assert.equal(calls[0].headers["Idempotency-Key"], calls[1].headers["Idempotency-Key"]);
    assert.equal(ctx.rows("staffNotifications")[0].providerMessageId, "email-success");
    assert.equal(ctx.rows("staffNotificationAttempts").length, 2);
  } finally { globalThis.fetch = oldFetch; }
});

test("lease recovery retries safely and refuses a late obsolete completion", async () => {
  const ctx = await setup();
  await newTicket(ctx);
  const id = ctx.rows("staffNotifications")[0]._id;
  const first = await alerts.claim.handler(ctx, { id });
  await alerts.recover.handler(ctx, { id, claimToken: first.claimToken });
  const second = await alerts.claim.handler(ctx, { id });
  await alerts.finish.handler(ctx, { id, claimToken: first.claimToken, providerMessageId: "late-result" });
  assert.equal(ctx.rows("staffNotifications")[0].status, "sending");
  await alerts.finish.handler(ctx, { id, claimToken: second.claimToken, providerMessageId: "same-provider-result" });
  assert.equal(ctx.rows("staffNotifications")[0].status, "accepted");
});

test("disabled alerts, removed recipients, cancellation and missing config are visible without a send", async () => {
  for (const scenario of ["disabled", "recipients", "cancelled", "configuration"]) {
    const ctx = await setup();
    await newTicket(ctx);
    if (scenario === "disabled") ctx.rows("settings")[0].data.emailAlertsEnabled = false;
    if (scenario === "recipients") ctx.rows("settings")[0].data.staffEmailRecipients = [];
    if (scenario === "cancelled") ctx.rows("tickets")[0].data.status = "CANCELLED";
    if (scenario === "configuration") process.env.AUTH_RESEND_FROM = "";
    try {
      assert.equal(await alerts.claim.handler(ctx, { id: ctx.rows("staffNotifications")[0]._id }), null);
      assert.equal(ctx.rows("staffNotifications")[0].status, scenario === "configuration" ? "failed" : "skipped");
      assert.equal(ctx.rows("staffNotificationAttempts").length, 0);
    } finally { process.env.AUTH_RESEND_FROM = "Reservations <reservations@example.com>"; }
  }
});

test("frozen retries never send to a recipient staff removed", async () => {
  const ctx = await setup();
  await newTicket(ctx);
  const id = ctx.rows("staffNotifications")[0]._id;
  const claim = await alerts.claim.handler(ctx, { id });
  await alerts.finish.handler(ctx, { id, claimToken: claim.claimToken, error: "timeout", retryable: true });
  ctx.rows("settings")[0].data.staffEmailRecipients = ["different@example.com"];
  assert.equal(await alerts.claim.handler(ctx, { id }), null);
  assert.match(ctx.rows("staffNotifications")[0].lastError, /recipients changed/);
});

test("retry limit and provider idempotency window prevent indefinite replay", () => {
  const now = Date.now();
  assert.equal(policy.canRetryStaffAlert({ attempts: 5 }, now), false);
  assert.equal(policy.canRetryStaffAlert({ attempts: 1, firstAttemptAt: new Date(now - 24 * 60 * 60_000).toISOString() }, now), false);
  assert.equal(policy.retryableEmailStatus(401), false);
  assert.equal(policy.retryableEmailStatus(503), true);
});

test("stalled checks ignore superseded and completed quotes; terminal webhook failures alert once", async () => {
  const ctx = await setup();
  const ticket = await newTicket(ctx);
  await alerts.checkStalledQuote.handler(ctx, { ticketId: ticket.id, quoteRevision: 99 });
  assert.equal(ctx.rows("staffNotifications").length, 1);
  const delivery = ctx.rows("quoteWebhookDeliveries")[0];
  Object.assign(delivery, { status: "sending", claimToken: "claim", attempts: 5 });
  await webhook.finish.handler(ctx, { deliveryId: delivery._id, claimToken: "claim", sent: false, retryable: true, error: "HTTP 503" });
  assert.equal(ctx.rows("staffNotifications")[1].kind, "quoteWebhookFailure");
  ctx.rows("tickets")[0].data.status = "PRICE SENT";
  await alerts.checkStalledQuote.handler(ctx, { ticketId: ticket.id, quoteRevision: 0 });
  assert.equal(ctx.rows("staffNotifications").length, 2);
  assert.equal(await alerts.claim.handler(ctx, { id: ctx.rows("staffNotifications")[1]._id }), null);
});

test("handoff alerts are deduplicated and suppressed after staff resolves the conversation", async () => {
  const ctx = await setup();
  await ctx.db.insert("conversations", { publicId: "conversation-1", channel: "web", controlVersion: 0, aiEnabled: true, collected: {} });
  const args = { serviceKey: "sona", publicId: "conversation-1", expectedControlVersion: 0, reason: "Guest requests staff" };
  await sona.handoff.handler(ctx, args);
  await sona.handoff.handler(ctx, args);
  assert.equal(ctx.rows("staffNotifications").length, 1);
  ctx.rows("conversations")[0].status = "waiting_for_guest";
  assert.equal(await alerts.claim.handler(ctx, { id: ctx.rows("staffNotifications")[0]._id }), null);
});

test("staff history and recovery require authentication; automation cannot impersonate staff", async () => {
  const ctx = await setup(false);
  await assert.rejects(alerts.list.handler(ctx), /Authentication/);
  await assert.rejects(alerts.needsAttention.handler(ctx), /Authentication/);
  await assert.rejects(alerts.retry.handler(ctx, { id: "unknown", serviceKey: "automation" }), /Authentication/);
});

test("email content escapes guest HTML and uses trusted CRM URLs", () => {
  const email = policy.buildStaffAlertEmail({ kind: "newQuote", ticketId: "a&b" }, { id: "a&b", guests: ["<script>bad</script>"], status: "PRICE SENT" }, null, "https://crm.example.com/");
  assert.ok(!email.html.includes("<script>"));
  assert.match(email.text, /https:\/\/crm.example.com\/new\?id=a%26b/);
});

test("lifecycle delivery failures are deduplicated, visible, and cleared by a successful send", async () => {
  const ctx = await setup();
  const ticket = await newTicket(ctx);
  const args = { serviceKey: "automation", ticketId: ticket.id, quoteRevision: 0, event: "priceSent:sms", accepted: false, error: "Provider timeout" };
  await alerts.recordDeliveryResult.handler(ctx, args);
  await alerts.recordDeliveryResult.handler(ctx, args);
  assert.equal(ctx.rows("staffNotifications").filter((row) => row.kind === "deliveryFailure").length, 1);
  assert.ok((await alerts.needsAttention.handler(ctx)).items.some((row) => row.key.startsWith("delivery:")));
  await alerts.recordDeliveryResult.handler(ctx, { ...args, accepted: true, error: undefined });
  assert.ok(!(await alerts.needsAttention.handler(ctx)).items.some((row) => row.key.startsWith("delivery:")));
  const alert = ctx.rows("staffNotifications").find((row) => row.kind === "deliveryFailure");
  assert.equal(await alerts.claim.handler(ctx, { id: alert._id }), null);
});

test("a delayed failure alert for an old quote round is suppressed", async () => {
  const ctx = await setup();
  const ticket = await newTicket(ctx);
  await alerts.recordDeliveryResult.handler(ctx, { serviceKey: "automation", ticketId: ticket.id, quoteRevision: 0, event: "priceSent:email", accepted: false, error: "Failed email" });
  ctx.rows("tickets")[0].data.quoteRevision = 1;
  const alert = ctx.rows("staffNotifications").find((row) => row.kind === "deliveryFailure");
  assert.equal(await alerts.claim.handler(ctx, { id: alert._id }), null);
  assert.match(alert.lastError, /Superseded/);
});
