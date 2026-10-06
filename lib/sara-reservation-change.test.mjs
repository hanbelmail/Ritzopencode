import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const calcStub = [
  "const fmtMoney = (n) => (n === null || n === undefined || n === '' || isNaN(n) ? '-' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }));",
  "const fmtDate = (d) => { if (!d) return '-'; const [y, m, day] = String(d).split('T')[0].split('-'); return m + '/' + day + '/' + y; };",
].join("\n");

const source = (await readFile(new URL("./sara-reservation-change.js", import.meta.url), "utf8"))
  .replace('import { fmtDate } from "@/lib/calc";', () => calcStub);
const compiled = ts.transpileModule(source, {
  compilerOptions: { allowJs: true, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const {
  buildQuoteFailureMessage,
  buildReservationChangeApplied,
  buildReservationChangeCancelled,
  buildReservationChangeConfirmation,
  buildReservationChangeExpired,
  buildReservationChangeInvalid,
  buildReservationChangeReply,
  buildReservationChangeStale,
  buildReservationChangeUnconfirmed,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const dateFields = [
  { field: "checkIn", label: "check-in", from: "2026-10-05", to: "2026-10-06" },
  { field: "checkOut", label: "check-out", from: "2026-10-10", to: "2026-10-11" },
];
const checkInOnlyFields = [
  { field: "checkIn", label: "check-in", from: "2026-10-25", to: "2026-10-28" },
];
const contactFields = [
  { field: "email", label: "email", from: "old@example.com", to: "new@example.com" },
  { field: "guests", label: "guest names", from: ["Ann Lee"], to: ["Ann Lee", "Ben Lee"] },
];

test("asks for an explicit yes or no before a date change retires the quote", () => {
  const confirmation = buildReservationChangeConfirmation({ fields: dateFields, ticketStatus: "PRICE SENT" });
  assert.match(confirmation, /You asked to change your reservation dates\./);
  assert.match(confirmation, /Current dates: 10\/05\/2026 to 10\/10\/2026/);
  assert.match(confirmation, /Requested dates: 10\/06\/2026 to 10\/11\/2026/);
  assert.match(confirmation, /Reply YES to make this change, or NO to keep your current reservation\./);
  assert.doesNotMatch(confirmation, /\$/);
});

test("states the full current and requested stay when only one date changes", () => {
  const confirmation = buildReservationChangeConfirmation({
    fields: checkInOnlyFields,
    ticketStatus: "PRICE SENT",
    currentCheckIn: "2026-10-25",
    currentCheckOut: "2026-10-30",
    requestedCheckIn: "2026-10-28",
    requestedCheckOut: "2026-10-30",
  });
  assert.match(confirmation, /You asked to change your reservation dates\./);
  assert.match(confirmation, /Current dates: 10\/25\/2026 to 10\/30\/2026/);
  assert.match(confirmation, /Requested dates: 10\/28\/2026 to 10\/30\/2026/);
  assert.match(confirmation, /Reply YES to make this change, or NO to keep your current reservation\./);
  assert.doesNotMatch(confirmation, /\$/);
});

test("never asks a guest to confirm a date change with blank dates", () => {
  const degraded = buildReservationChangeConfirmation({ fields: checkInOnlyFields, ticketStatus: "PRICE SENT" });
  assert.doesNotMatch(degraded, /Requested dates:\s*\n/);
  assert.doesNotMatch(degraded, /Current dates:\s*\n/);
  assert.match(degraded, /Requested change: check-in\./);

  for (const confirmation of [
    buildReservationChangeConfirmation({ fields: dateFields, ticketStatus: "QUOTE REQUESTED" }),
    buildReservationChangeConfirmation({
      fields: checkInOnlyFields,
      ticketStatus: "PRICE SENT",
      currentCheckIn: "2026-10-25",
      currentCheckOut: "2026-10-30",
      requestedCheckIn: "2026-10-28",
      requestedCheckOut: "2026-10-30",
    }),
  ]) {
    assert.doesNotMatch(confirmation, /dates:\s*\n/);
    assert.doesNotMatch(confirmation, /-\s+to\s+-/);
  }
});

test("prefers the ticket and proposed stay over the changed-field list", () => {
  const confirmation = buildReservationChangeConfirmation({
    fields: dateFields,
    ticketStatus: "PRICE SENT",
    currentCheckIn: "2026-11-01",
    currentCheckOut: "2026-11-06",
    requestedCheckIn: "2026-11-02",
    requestedCheckOut: "2026-11-06",
  });
  assert.match(confirmation, /Current dates: 11\/01\/2026 to 11\/06\/2026/);
  assert.match(confirmation, /Requested dates: 11\/02\/2026 to 11\/06\/2026/);
});

test("applies contact-only changes without implying a new price", () => {
  const applied = buildReservationChangeApplied({ fields: contactFields, requote: false });
  assert.match(applied, /I updated your reservation details: email, guest names/);
  assert.doesNotMatch(applied, /quote is being prepared/);
});

test("states that a new quote is being prepared after a date change and never promises a price", () => {
  const applied = buildReservationChangeApplied({ fields: dateFields, requote: true, checkIn: "2026-10-06", checkOut: "2026-10-11", nights: 5 });
  assert.match(applied, /Your reservation request is now 10\/06\/2026 to 10\/11\/2026 \(5 nights\)\./);
  assert.match(applied, /The previous quote no longer applies\. A new quote for these dates is being prepared/);
  assert.doesNotMatch(applied, /\$/);
});

test("keeps decline, expiry, and failure replies factual", () => {
  assert.match(buildReservationChangeCancelled({ fields: dateFields }), /keeps its current dates: 10\/05\/2026 to 10\/10\/2026/);
  assert.match(buildReservationChangeCancelled({ fields: contactFields }), /stays as it is/);
  assert.match(buildReservationChangeExpired(), /expired, so nothing was updated/);
  assert.match(buildReservationChangeUnconfirmed(), /could not verify my change request message/);
  assert.match(buildReservationChangeStale(), /I did not apply it/);
  assert.match(buildReservationChangeInvalid({ reason: "Those dates are no longer available" }), /Those dates are no longer available.*human reservations specialist/s);
});

test("routes deterministic replies by change status", () => {
  assert.match(buildReservationChangeReply({ status: "cancelled", fields: contactFields }), /No changes were made/);
  assert.equal(buildReservationChangeReply({ status: "not_applicable" }), "");
});

test("reports an automatic quote failure without a price promise", () => {
  const failure = buildQuoteFailureMessage({ checkIn: "2026-10-06", checkOut: "2026-10-11" });
  assert.match(failure, /wasn't able to complete an automatic quote for 10\/06\/2026 to 10\/11\/2026/);
  assert.match(failure, /ask me about other dates/);
  assert.match(failure, /human reservations specialist/);
  assert.doesNotMatch(failure, /\$/);
  assert.doesNotMatch(failure, /member rate|StayAPI|Rate lookup/i);
});
