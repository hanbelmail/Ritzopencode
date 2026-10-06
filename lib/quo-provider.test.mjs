import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./quo-provider.js", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { allowJs: true, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const { quoProviderMessageId } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("reads the documented create-message response envelope", () => {
  assert.equal(quoProviderMessageId({ data: { id: "OM0e190d2512d76b6c" } }), "OM0e190d2512d76b6c");
});

test("reads a flattened create-message response", () => {
  assert.equal(quoProviderMessageId({ id: "OM0e190d2512d76b6c" }), "OM0e190d2512d76b6c");
});

test("prefers the nested provider message identifier", () => {
  assert.equal(
    quoProviderMessageId({ data: { id: "OM-nested" }, id: "OM-flat", messageId: "OM-loose", data2: {} }),
    "OM-nested"
  );
});

test("falls back to nested and loose message identifier fields", () => {
  assert.equal(quoProviderMessageId({ data: { messageId: "OM-nested-loose" } }), "OM-nested-loose");
  assert.equal(quoProviderMessageId({ messageId: "OM-loose" }), "OM-loose");
});

test("reads a webhook message resource identifier", () => {
  assert.equal(quoProviderMessageId({ id: "OM-webhook", status: "delivered" }), "OM-webhook");
});

test("trims surrounding whitespace", () => {
  assert.equal(quoProviderMessageId({ data: { id: "  OM-padded  " } }), "OM-padded");
});

test("returns undefined when no usable identifier exists", () => {
  for (const value of [undefined, null, "OM-string", 42, {}, { data: {} }, { data: { id: 42 } }, { id: "   " }]) {
    assert.equal(quoProviderMessageId(value), undefined, `expected undefined for ${JSON.stringify(value)}`);
  }
});

test("ignores non-string identifier candidates without throwing", () => {
  assert.equal(quoProviderMessageId({ id: null, messageId: null, data: { id: null } }), undefined);
});
