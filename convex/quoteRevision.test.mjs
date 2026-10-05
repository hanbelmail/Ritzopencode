import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./quoteRevision.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const {
  applyRequoteReset,
  expectedQuoteWebhookKey,
  initialQuoteRound,
  isStalePricingCallback,
  nextQuoteRevision,
  quoteInputsChanged,
  quoteRevisionOf,
  quoteWebhookKey,
  shouldRequote,
  STALE_QUOTE_CALLBACK_ERROR,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const priced = {
  id: "ticket-1",
  status: "PRICE SENT",
  checkIn: "2026-10-05",
  checkOut: "2026-10-10",
  nights: 5,
  roomType: "Deluxe Ocean View",
  retailPrice: 3000,
  adjustment: 150,
  discountPct: 10,
  rateOffered: 2850,
  costPerNight: 570,
  quoteExpiresAt: "2026-10-08T00:00:00.000Z",
  retailPriceScreenshotKey: "retail-price-screenshots/ticket-1/a.png",
  termsAcceptedAt: "2026-10-02T00:00:00.000Z",
  termsVersion: "1.0",
  termsAcceptedHash: "abc",
  termsAcceptedText: "I AGREE",
  priceSentEmailSentAt: "2026-10-02T00:00:00.000Z",
  priceSentSmsSentAt: "2026-10-02T00:00:00.000Z",
  priceSentSmsClaimToken: "claim",
  priceSentSmsDeliveryUnknownAt: "2026-10-02T00:00:00.000Z",
  quoteError: "No Deluxe Ocean View member rate was returned for these dates",
  quoteRevision: 0,
  quoteToken: "token-0",
};

test("mints the initial quote round and revision-scoped webhook keys", () => {
  const round = initialQuoteRound("2026-10-01T00:00:00.000Z");
  assert.equal(round.quoteRevision, 0);
  assert.match(round.quoteToken, /^.{8,}$/);
  assert.equal(round.quoteRequestedAt, "2026-10-01T00:00:00.000Z");
  assert.equal(quoteWebhookKey("ticket-1", 0), "quote-created:ticket-1");
  assert.equal(quoteWebhookKey("ticket-1", 2), "quote-requote:ticket-1:2");
  assert.equal(expectedQuoteWebhookKey({ id: "ticket-1" }), "quote-created:ticket-1");
  assert.equal(expectedQuoteWebhookKey({ id: "ticket-1", quoteRevision: 3 }), "quote-requote:ticket-1:3");
});

test("advances the revision and keeps a supplied token deterministic", () => {
  const next = nextQuoteRevision(priced, "2026-10-02T00:00:00.000Z");
  assert.equal(next.quoteRevision, 1);
  assert.notEqual(next.quoteToken, priced.quoteToken);
  assert.equal(quoteRevisionOf({ quoteRevision: "4" }), 4);
  assert.equal(quoteRevisionOf({ quoteRevision: -2 }), 0);
  assert.equal(nextQuoteRevision({}, "now", "fixed").quoteToken, "fixed");
});

test("detects only date and room changes as quote inputs", () => {
  assert.equal(quoteInputsChanged(priced, { checkIn: "2026-10-06" }), true);
  assert.equal(quoteInputsChanged(priced, { roomType: "Ocean Front Suite" }), true);
  assert.equal(quoteInputsChanged(priced, { checkOut: "2026-10-10" }), false);
  assert.equal(quoteInputsChanged(priced, { retailPrice: 4000, adjustment: 0 }), false);
  assert.equal(quoteInputsChanged(priced, { email: "guest@example.com" }), false);
  assert.equal(quoteInputsChanged(priced, null), false);
});

test("re-quote fires only for an unpaid ticket returning to or staying at QUOTE REQUESTED", () => {
  assert.equal(shouldRequote(priced, { checkIn: "2026-10-06" }, "QUOTE REQUESTED", false).requote, true);
  assert.deepEqual(shouldRequote(priced, {}, "QUOTE REQUESTED", false).reasons, ["returned_to_quote_requested"]);
  assert.equal(shouldRequote(priced, { guests: ["Jane Doe"] }, "PRICE SENT", false).requote, false);
  assert.equal(shouldRequote({ status: "QUOTE REQUESTED" }, { email: "a@b.co" }, "QUOTE REQUESTED", false).requote, false);
  assert.equal(shouldRequote(priced, { checkIn: "2026-10-06" }, "QUOTE REQUESTED", true).requote, false);
  assert.equal(shouldRequote({ status: "PAYMENT SUBMITTED" }, {}, "QUOTE REQUESTED", true).requote, false);
});

test("re-quote reset retires the price, Terms, quote error, and delivery stamps but keeps staff adjustment", () => {
  const revision = { quoteRevision: 1, quoteToken: "token-1", quoteRequestedAt: "2026-10-02T00:00:00.000Z" };
  const updated = applyRequoteReset({ ...priced }, revision);

  assert.equal(updated.status, "QUOTE REQUESTED");
  assert.equal(updated.retailPrice, null);
  assert.equal(updated.rateOffered, null);
  assert.equal(updated.costPerNight, null);
  assert.equal(updated.discountPct, 0);
  assert.equal(updated.quoteExpiresAt, null);
  assert.equal(updated.retailPriceScreenshot, null);
  assert.equal(updated.retailPriceScreenshotKey, null);
  assert.equal(updated.quoteError, null);
  assert.equal(updated.requoteNotifiedRevision, null);
  assert.equal(updated.quoteFailureNotifiedRevision, null);
  assert.equal(updated.adjustment, 150);
  assert.equal(updated.quoteRevision, 1);
  assert.equal(updated.quoteToken, "token-1");
  assert.equal(expectedQuoteWebhookKey(updated), "quote-requote:ticket-1:1");

  for (const field of [
    "termsAcceptedAt",
    "termsVersion",
    "termsAcceptedHash",
    "termsAcceptedText",
    "priceSentEmailSentAt",
    "priceSentSmsSentAt",
    "priceSentSmsClaimToken",
    "priceSentSmsDeliveryUnknownAt",
  ]) {
    assert.equal(field in updated, false, `${field} should be cleared`);
  }
});

test("rejects a pricing callback that carries a superseded quote token", () => {
  assert.equal(isStalePricingCallback(priced, "token-0"), false);
  assert.equal(isStalePricingCallback(priced, "token-old"), true);
  assert.equal(isStalePricingCallback(priced, undefined), true);
  assert.equal(isStalePricingCallback(priced, ""), true);
  assert.equal(isStalePricingCallback({ id: "legacy" }, undefined), false);
  assert.match(STALE_QUOTE_CALLBACK_ERROR, /Stale quote callback/);
});
