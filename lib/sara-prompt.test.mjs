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

function instructions(channel, messages = []) {
  return buildSaraInstructions({
    settings: {
      saraAgentName: "Sona",
      saraInitialMessage: "Exact website opener",
      saraQuoteValidityDays: 3,
    },
    conversation: { channel, status: "open", stage: "new", collected: {} },
    ticket: null,
    contact: null,
    messages,
  });
}

test("identifies Sona as Mike's AI assistant and preserves independent-service limits", () => {
  const prompt = instructions("web");
  assert.equal(SARA_PROMPT_VERSION, "sara-v1.7");
  assert.match(prompt, /You are Sona, Mike's AI reservations assistant for his privately owned Ritz-Carlton condo in Waikiki/);
  assert.match(prompt, /not the official Ritz-Carlton hotel reservations desk/);
  assert.match(prompt, /Exact website opener/);
});

test("makes the website opener non-repeating and the first SMS response adaptive", () => {
  const webPrompt = instructions("web");
  assert.match(webPrompt, /On web, do not repeat that introduction/);

  const smsPrompt = instructions("sms");
  assert.match(smsPrompt, /Use dates or other details already present/);
});
