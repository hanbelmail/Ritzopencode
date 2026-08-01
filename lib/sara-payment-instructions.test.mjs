import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./sara-payment-instructions.js", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const { buildSaraPaymentInstructionsReply } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("builds a deterministic payment reply with every configured instruction and secure link", () => {
  const reply = buildSaraPaymentInstructionsReply({
    methods: [
      { name: "Zelle", instructions: "Send to reservations@example.com with your Ticket ID." },
      { name: "Venmo", instructions: "Send to @waikiki-secret and include the guest name." },
    ],
    proofUploadUrl: "https://example.com/ticket/TKT-123",
  });

  assert.match(reply, /^Terms accepted\./);
  assert.ok(reply.includes("Zelle\nSend to reservations@example.com with your Ticket ID."));
  assert.ok(reply.includes("Venmo\nSend to @waikiki-secret and include the guest name."));
  assert.ok(reply.includes("https://example.com/ticket/TKT-123"));
  assert.match(reply, /Payment remains unverified until the reservations team reviews it\.$/);
});

test("does not truncate configured SMS payment instructions", () => {
  const instructions = `Reference ${"A".repeat(700)}`;
  const reply = buildSaraPaymentInstructionsReply({
    methods: [{ name: "Zelle", instructions }],
    proofUploadUrl: "https://example.com/ticket/TKT-456",
  });

  assert.ok(reply.includes(instructions));
  assert.ok(reply.includes("https://example.com/ticket/TKT-456"));
});
