import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./defaults.js", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { allowJs: true, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const {
  DEFAULT_SETTINGS,
  SONA_AGENT_NAME,
  SONA_INITIAL_MESSAGE,
  buildSmsInitialDisclosure,
  normalizeSaraBranding,
  withDefaultSettings,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const expectedInitialMessage = "Aloha! I’m Sona, Mike’s AI reservations assistant for his privately owned Ritz-Carlton condo in Waikiki. I can help you check availability and receive a private, discounted quote based on current retail rates. Dates are not held until payment is verified. What are your check-in and check-out dates?";
test("uses the exact Sona name and website opening message", () => {
  assert.equal(SONA_AGENT_NAME, "Sona");
  assert.equal(SONA_INITIAL_MESSAGE, expectedInitialMessage);
  assert.equal(DEFAULT_SETTINGS.saraAgentName, "Sona");
  assert.equal(DEFAULT_SETTINGS.saraInitialMessage, expectedInitialMessage);
});

test("enforces the approved Sona branding over persisted values", () => {
  assert.deepEqual(normalizeSaraBranding({
    saraAgentName: "Sara",
    saraInitialMessage: "Old greeting",
    saraWebEnabled: true,
  }), {
    saraAgentName: "Sona",
    saraInitialMessage: expectedInitialMessage,
    saraWebEnabled: true,
  });

  assert.deepEqual(normalizeSaraBranding({
    saraAgentName: "Custom agent",
    saraInitialMessage: "Custom greeting",
  }), {
    saraAgentName: "Sona",
    saraInitialMessage: expectedInitialMessage,
  });
  assert.equal(withDefaultSettings({ saraAgentName: "Sara" }).saraAgentName, "Sona");
});

test("builds the deterministic adaptive-SMS identity disclosure", () => {
  assert.equal(
    buildSmsInitialDisclosure(),
    "Aloha! I’m Sona, Mike’s AI reservations assistant for his privately owned Ritz-Carlton condo in Waikiki. This is an independent private reservation service, not the official hotel reservations desk."
  );
});
