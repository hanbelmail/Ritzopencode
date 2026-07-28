import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./saraAvailability.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const { availableRangesForWindow, monthAvailabilityWindow } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("builds a full future calendar-month window", () => {
  assert.deepEqual(monthAvailabilityWindow("2026-12", "2026-07-28"), {
    requestedWindow: { checkIn: "2026-12-01", checkOut: "2027-01-01" },
    evaluatedWindow: { checkIn: "2026-12-01", checkOut: "2027-01-01" },
  });
});

test("clips the current month to today in Hawaii", () => {
  assert.deepEqual(monthAvailabilityWindow("2026-07", "2026-07-28").evaluatedWindow, {
    checkIn: "2026-07-28",
    checkOut: "2026-08-01",
  });
});

test("rejects invalid and entirely past months", () => {
  assert.throws(() => monthAvailabilityWindow("2026-13", "2026-07-28"), /YYYY-MM/);
  assert.throws(() => monthAvailabilityWindow("2026-06", "2026-07-28"), /entirely in the past/);
  assert.throws(() => monthAvailabilityWindow("9999-12", "2026-07-28"), /supported calendar range/);
});

test("returns contiguous available ranges around finalized stays", () => {
  assert.deepEqual(
    availableRangesForWindow(
      { checkIn: "2026-07-28", checkOut: "2026-08-01" },
      [
        { checkIn: "2026-07-29", checkOut: "2026-07-30" },
        { checkIn: "2026-07-30", checkOut: "2026-07-31" },
      ]
    ),
    [
      { checkIn: "2026-07-28", checkOut: "2026-07-29", nights: 1 },
      { checkIn: "2026-07-31", checkOut: "2026-08-01", nights: 1 },
    ]
  );
});

test("clips stays crossing month boundaries and preserves same-day turnover", () => {
  assert.deepEqual(
    availableRangesForWindow(
      { checkIn: "2026-08-01", checkOut: "2026-09-01" },
      [
        { checkIn: "2026-07-20", checkOut: "2026-08-05" },
        { checkIn: "2026-08-10", checkOut: "2026-08-15" },
        { checkIn: "2026-08-31", checkOut: "2026-09-03" },
      ]
    ),
    [
      { checkIn: "2026-08-05", checkOut: "2026-08-10", nights: 5 },
      { checkIn: "2026-08-15", checkOut: "2026-08-31", nights: 16 },
    ]
  );
});

test("fails closed when finalized reservation dates are malformed", () => {
  assert.throws(
    () => availableRangesForWindow(
      { checkIn: "2026-03-01", checkOut: "2026-04-01" },
      [{ checkIn: "2026-02-30", checkOut: "2026-03-05" }]
    ),
    /invalid stay dates/
  );
});
