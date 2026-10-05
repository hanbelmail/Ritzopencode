import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = (await readFile(new URL("./sara-prompt.js", import.meta.url), "utf8"))
  .replace('import { honoluluToday } from "@/lib/sara-date-resolver";', 'const honoluluToday = () => "2026-08-02";');
const compiled = ts.transpileModule(source, {
  compilerOptions: { allowJs: true, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const { buildSaraInstructions, SARA_PROMPT_VERSION } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

function instructions(channel, messages = [], overrides = {}) {
  return buildSaraInstructions({
    settings: {
      saraAgentName: "Sona",
      saraInitialMessage: "Exact website opener",
      saraQuoteValidityDays: 3,
    },
    conversation: { channel, status: "open", stage: "new", collected: {}, ...(overrides.conversation || {}) },
    ticket: overrides.ticket ?? null,
    contact: overrides.contact ?? null,
    messages,
  });
}

test("identifies Sona as Mike's AI assistant and preserves independent-service limits", () => {
  const prompt = instructions("web");
  assert.equal(SARA_PROMPT_VERSION, "sara-v1.8");
  assert.match(prompt, /You are Sona, Mike's AI reservations assistant for his privately owned Ritz-Carlton condo in Waikiki/);
  assert.match(prompt, /not the official Ritz-Carlton hotel reservations desk/);
  assert.match(prompt, /Exact website opener/);
});

test("allows reservation edits only through update_reservation and never invents the new price", () => {
  const prompt = instructions("web");
  assert.match(prompt, /update_reservation/);
  assert.match(prompt, /Changing dates retires the current quote and the recorded Terms acceptance and starts an automatic new quote round/);
  assert.match(prompt, /Never state, estimate, or promise that new price/);
  assert.match(prompt, /Paid, submitted, confirmed, or cancelled reservations cannot be edited/);
  assert.match(prompt, /Changing the mobile number during an SMS conversation is not supported/);
  assert.match(prompt, /Report only the exact status, dates, nights, offered price, and quote expiry returned by get_ticket_status/);
  assert.doesNotMatch(prompt, /hand off instead of treating the old price as valid/);
});

test("surfaces a pending reservation change awaiting guest confirmation", () => {
  const prompt = instructions("sms", [], {
    conversation: {
      pendingReservationChange: {
        changeId: "abc",
        requestedAt: "2026-08-02T00:00:00.000Z",
        expectedControlVersion: 1,
        quoteInvalidating: true,
        fields: [{ field: "checkIn", from: "2026-10-05", to: "2026-10-06" }],
      },
    },
    ticket: { id: "t1", status: "PRICE SENT", checkIn: "2026-10-05", checkOut: "2026-10-10" },
  });
  assert.match(prompt, /"pendingReservationChange":\{"awaitingConfirmation":true,"quoteInvalidating":true,"fields":\["checkIn"\]\}/);
});

test("makes the website opener non-repeating and the first SMS response adaptive", () => {
  const webPrompt = instructions("web");
  assert.match(webPrompt, /On web, do not repeat that introduction/);

  const smsPrompt = instructions("sms");
  assert.match(smsPrompt, /Use dates or other details already present/);
});
