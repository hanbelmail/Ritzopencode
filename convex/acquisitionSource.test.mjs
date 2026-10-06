import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./acquisitionSource.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const {
  ACQUISITION_SOURCES,
  REFERRER_NAME_REQUIRED_ERROR,
  assertReferrerName,
  normalizeReferredBy,
  requiresReferrerName,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("requires a referrer name only for promoter and referral sources", () => {
  assert.deepEqual([...ACQUISITION_SOURCES], ["direct", "promoter", "referral"]);
  assert.equal(requiresReferrerName("promoter"), true);
  assert.equal(requiresReferrerName("referral"), true);
  assert.equal(requiresReferrerName("direct"), false);
  assert.equal(requiresReferrerName(undefined), false);
});

test("hard-blocks promoter and referral quote creation without a usable name", () => {
  assert.throws(() => assertReferrerName("promoter", null), /referrer name is required/);
  assert.throws(() => assertReferrerName("promoter", undefined), /referrer name is required/);
  assert.throws(() => assertReferrerName("referral", "   "), /referrer name is required/);
  assert.throws(() => assertReferrerName("promoter", "K"), /referrer name is required/);
  assert.equal(
    (() => {
      try {
        assertReferrerName("promoter", "");
        return null;
      } catch (error) {
        return error.message;
      }
    })(),
    REFERRER_NAME_REQUIRED_ERROR
  );
  assert.match(REFERRER_NAME_REQUIRED_ERROR, /call create_quote_request again with referred_by/);
  assert.match(REFERRER_NAME_REQUIRED_ERROR, /call handoff_to_staff/);
});

test("rejects placeholder referrer names", () => {
  for (const placeholder of ["unknown", "N/A", "na", "none", "no name", "tbd", "Anonymous", "-", "?", "not sure", "I don't know"]) {
    assert.throws(() => assertReferrerName("promoter", placeholder), /referrer name is required/, placeholder);
  }
});

test("accepts and normalizes a real referrer name", () => {
  assert.equal(assertReferrerName("promoter", "  Kaipo   Alana  "), "Kaipo Alana");
  assert.equal(assertReferrerName("referral", "Mike"), "Mike");
  assert.equal(normalizeReferredBy("\n  Jane \t Doe \n"), "Jane Doe");
});

test("leaves direct acquisition sources unnamed without blocking", () => {
  assert.equal(assertReferrerName("direct", null), "");
  assert.equal(assertReferrerName("direct", undefined), "");
  assert.equal(assertReferrerName("direct", "  "), "");
  assert.equal(assertReferrerName("direct", "A past guest"), "A past guest");
});
