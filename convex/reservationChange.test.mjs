import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./reservationChange.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const {
  changeSummaryFields,
  classifyChangeReply,
  isQuoteInvalidatingChange,
  isReservationChangeExpired,
  isSameTicketSnapshot,
  normalizeChangeReply,
  normalizeTicketSnapshot,
  RESERVATION_CHANGE_CONFIRMATION_CONTRACT,
  RESERVATION_CHANGE_TTL_MS,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("normalizes confirmation replies for case, whitespace, and safe trailing punctuation", () => {
  assert.equal(RESERVATION_CHANGE_CONFIRMATION_CONTRACT, "reservation_change_confirmation_v1");
  assert.equal(normalizeChangeReply("  YES,   Please.  "), "yes, please");
  assert.equal(normalizeChangeReply("No\u2019thanks!!"), "no'thanks");
  assert.equal(normalizeChangeReply(null), "");
});

test("classifies explicit confirmations and cancellations deterministically", () => {
  for (const reply of ["yes", "YES", "Yes.", "yep", "confirm", "go ahead", "please do", "ok", "okay", "make the change", "sure", "yes, please"]) {
    assert.equal(classifyChangeReply(reply), "confirmed", reply);
  }
  for (const reply of ["no", "No!", "nope", "cancel", "never mind", "forget it", "don't change it", "keep it", "stop", "no thanks"]) {
    assert.equal(classifyChangeReply(reply), "cancelled", reply);
  }
});

test("leaves ambiguous, questioning, and unrelated replies for the assistant", () => {
  for (const reply of ["maybe", "what do you think?", "is parking free", "not sure", "yes but can you also add a crib", "", "   ", "tell me more"]) {
    assert.equal(classifyChangeReply(reply), "unrecognized", reply);
  }
});

test("labels changed fields and flags quote-invalidating changes", () => {
  const fields = changeSummaryFields({
    fields: [
      { field: "checkIn", from: "2026-10-05", to: "2026-10-06" },
      { field: "guests", from: ["Ann Lee"], to: ["Ann Lee", "Ben Lee"] },
      { field: "unknownField", from: "a", to: "b" },
    ],
  });
  assert.deepEqual(fields.map((field) => field.label), ["check-in", "guest names"]);
  assert.equal(isQuoteInvalidatingChange({ fields }), true);
  assert.equal(isQuoteInvalidatingChange({ fields: [{ field: "email", from: "a@b.co", to: "c@d.co" }] }), false);
});

test("expires a pending change after the confirmation window", () => {
  const now = Date.parse("2026-10-02T12:00:00.000Z");
  assert.equal(isReservationChangeExpired({ requestedAt: "2026-10-02T11:59:00.000Z" }, now), false);
  assert.equal(isReservationChangeExpired({ requestedAt: new Date(now - RESERVATION_CHANGE_TTL_MS - 1000).toISOString() }, now), true);
  assert.equal(isReservationChangeExpired({}, now), true);
});

const stagedSnapshot = {
  status: "PRICE SENT",
  quoteRevision: 0,
  checkIn: "2026-10-25",
  checkOut: "2026-10-30",
  email: "eee@gmail.com",
  phone: "+17867002222",
  guests: ["Walid Sdfd", "Sara Diidou"],
};

const convexPersisted = (snapshot) =>
  Object.fromEntries(Object.entries(snapshot).sort(([left], [right]) => (left === right ? 0 : left < right ? -1 : 1)));

test("matches a staged ticket snapshot that Convex returned with sorted keys", () => {
  const persisted = convexPersisted(stagedSnapshot);
  assert.notEqual(JSON.stringify(persisted), JSON.stringify(stagedSnapshot));
  assert.equal(
    JSON.stringify(persisted),
    '{"checkIn":"2026-10-25","checkOut":"2026-10-30","email":"eee@gmail.com","guests":["Walid Sdfd","Sara Diidou"],"phone":"+17867002222","quoteRevision":0,"status":"PRICE SENT"}'
  );
  assert.equal(isSameTicketSnapshot(persisted, stagedSnapshot), true);
  assert.equal(isSameTicketSnapshot(stagedSnapshot, persisted), true);
});

test("still reports a reservation that moved while a change was pending", () => {
  assert.equal(isSameTicketSnapshot({ ...stagedSnapshot, quoteRevision: 1 }, stagedSnapshot), false);
  assert.equal(isSameTicketSnapshot({ ...stagedSnapshot, status: "QUOTE REQUESTED" }, stagedSnapshot), false);
  assert.equal(isSameTicketSnapshot({ ...stagedSnapshot, checkIn: "2026-10-28" }, stagedSnapshot), false);
  assert.equal(isSameTicketSnapshot({ ...stagedSnapshot, checkOut: "2026-11-02" }, stagedSnapshot), false);
  assert.equal(isSameTicketSnapshot({ ...stagedSnapshot, email: "other@example.com" }, stagedSnapshot), false);
  assert.equal(isSameTicketSnapshot({ ...stagedSnapshot, phone: "+17867000000" }, stagedSnapshot), false);
  assert.equal(isSameTicketSnapshot({ ...stagedSnapshot, guests: ["Sara Diidou", "Walid Sdfd"] }, stagedSnapshot), false);
  assert.equal(isSameTicketSnapshot({ ...stagedSnapshot, guests: ["Walid Sdfd"] }, stagedSnapshot), false);
});

test("normalizes missing and malformed ticket snapshot values before comparing", () => {
  assert.deepEqual(normalizeTicketSnapshot(undefined), {
    status: "",
    quoteRevision: 0,
    checkIn: "",
    checkOut: "",
    email: "",
    phone: "",
    guests: [],
  });
  assert.equal(normalizeTicketSnapshot({ quoteRevision: "2" }).quoteRevision, 2);
  assert.equal(normalizeTicketSnapshot({ quoteRevision: null }).quoteRevision, 0);
  assert.equal(normalizeTicketSnapshot({ quoteRevision: -1 }).quoteRevision, 0);
  assert.deepEqual(normalizeTicketSnapshot({ guests: "not-an-array" }).guests, []);
  assert.equal(isSameTicketSnapshot({}, { quoteRevision: 0, guests: [] }), true);
});
