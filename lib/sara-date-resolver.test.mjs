import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./sara-date-resolver.js", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { allowJs: true, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const { resolveAvailabilityMonth, resolveStayDates } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

function guest(content) {
  return { direction: "inbound", authorType: "guest", content };
}

test("preserves the guest's explicit 2026 year when the model proposes 2024", () => {
  assert.deepEqual(
    resolveStayDates({
      checkIn: "2024-07-30",
      checkOut: "2024-07-31",
      messages: [guest("from 28 jul to 29 jul 2026"), guest("from 30 jul to 31 jul")],
      today: "2026-07-28",
    }),
    { checkIn: "2026-07-30", checkOut: "2026-07-31", nights: 1, yearSource: "explicit" }
  );
});

test("uses the next non-past occurrence when the guest omits the year", () => {
  assert.equal(resolveStayDates({
    checkIn: "2024-07-30",
    checkOut: "2024-07-31",
    messages: [guest("July 30 to July 31")],
    today: "2026-07-28",
  }).checkIn, "2026-07-30");

  assert.equal(resolveStayDates({
    checkIn: "2024-07-01",
    checkOut: "2024-07-02",
    messages: [guest("July 1 to July 2")],
    today: "2026-07-28",
  }).checkIn, "2027-07-01");
});

test("rolls a yearless December-to-January stay into the following year", () => {
  assert.deepEqual(
    resolveStayDates({
      checkIn: "2024-12-30",
      checkOut: "2024-01-02",
      messages: [guest("December 30 to January 2")],
      today: "2026-07-28",
    }),
    { checkIn: "2026-12-30", checkOut: "2027-01-02", nights: 3, yearSource: "inferred" }
  );
});

test("combines explicit years from separate check-in and checkout messages", () => {
  assert.deepEqual(
    resolveStayDates({
      checkIn: "2027-12-30",
      checkOut: "2027-01-02",
      messages: [guest("check in December 30, 2026"), guest("check out January 2, 2027")],
      today: "2026-07-28",
    }),
    { checkIn: "2026-12-30", checkOut: "2027-01-02", nights: 3, yearSource: "explicit" }
  );
});

test("supports explicit numeric and ISO December-to-January ranges", () => {
  for (const content of [
    "12/30/2026 to 1/2/2027",
    "2026-12-30 - 2027-01-02",
    "check in December 30, 2026 and check out January 2, 2027",
  ]) {
    assert.deepEqual(
      resolveStayDates({
        checkIn: "2024-12-30",
        checkOut: "2024-01-02",
        messages: [guest(content)],
        today: "2026-07-28",
      }),
      { checkIn: "2026-12-30", checkOut: "2027-01-02", nights: 3, yearSource: "explicit" }
    );
  }
});

test("does not carry an old cross-year checkout year into a new request", () => {
  assert.deepEqual(
    resolveStayDates({
      checkIn: "2024-07-30",
      checkOut: "2024-07-31",
      messages: [
        guest("December 30 2026 to January 2 2027"),
        guest("July 30 to July 31"),
      ],
      today: "2026-07-28",
    }),
    { checkIn: "2026-07-30", checkOut: "2026-07-31", nights: 1, yearSource: "explicit" }
  );
});

test("rejects reversed dates instead of creating a year-long stay", () => {
  assert.throws(() => resolveStayDates({
    checkIn: "2026-07-30",
    checkOut: "2026-07-29",
    messages: [guest("July 30 to July 29, 2026")],
    today: "2026-07-28",
  }), /only a December-to-January stay/);

  assert.throws(() => resolveStayDates({
    checkIn: "2026-12-30",
    checkOut: "2026-01-02",
    messages: [guest("December 30 2026 to January 2 2026")],
    today: "2026-07-28",
  }), /not valid in the guest's specified year/);
});

test("rejects explicitly past and impossible dates without changing the year", () => {
  assert.throws(() => resolveStayDates({
    checkIn: "2026-07-01",
    checkOut: "2026-07-02",
    messages: [guest("July 1 to July 2, 2026")],
    today: "2026-07-28",
  }), /explicitly requested check-in is in the past/);

  assert.throws(() => resolveStayDates({
    checkIn: "2026-02-30",
    checkOut: "2026-03-01",
    messages: [guest("February 30 to March 1")],
    today: "2026-01-01",
  }), /valid calendar dates/);
});

test("finds the next valid leap day when no year was supplied", () => {
  assert.deepEqual(
    resolveStayDates({
      checkIn: "2026-02-29",
      checkOut: "2026-03-01",
      messages: [guest("February 29 to March 1")],
      today: "2026-07-28",
    }),
    { checkIn: "2028-02-29", checkOut: "2028-03-01", nights: 1, yearSource: "inferred" }
  );

  assert.deepEqual(
    resolveStayDates({
      checkIn: "2026-02-28",
      checkOut: "2026-02-29",
      messages: [guest("February 28 to February 29")],
      today: "2026-07-28",
    }),
    { checkIn: "2028-02-28", checkOut: "2028-02-29", nights: 1, yearSource: "inferred" }
  );
});

test("resolves calendar months without asking for a year", () => {
  assert.equal(resolveAvailabilityMonth({
    month: "2024-07",
    messages: [guest("what is available this month?")],
    today: "2026-07-28",
  }).month, "2026-07");

  assert.equal(resolveAvailabilityMonth({
    month: "2024-06",
    messages: [guest("what is available in June?")],
    today: "2026-07-28",
  }).month, "2027-06");

  assert.equal(resolveAvailabilityMonth({
    month: "2024-01",
    messages: [guest("July 2028"), guest("what about next month?")],
    today: "2026-12-15",
  }).month, "2027-01");

  assert.equal(resolveAvailabilityMonth({
    month: "2024-05",
    messages: [guest("what is available this month?")],
    today: "2026-07-28",
  }).month, "2026-07");

  assert.equal(resolveAvailabilityMonth({
    month: "2024-05",
    messages: [guest("I stayed in July 2024; what is available this month?")],
    today: "2026-07-28",
  }).month, "2026-07");
});

test("relative month wording corrects the model month for an exact stay", () => {
  assert.deepEqual(
    resolveStayDates({
      checkIn: "2024-05-30",
      checkOut: "2024-05-31",
      messages: [guest("the 30th to the 31st this month")],
      today: "2026-07-28",
    }),
    { checkIn: "2026-07-30", checkOut: "2026-07-31", nights: 1, yearSource: "relative" }
  );
});

test("uses current booking intent instead of historical or duration years", () => {
  assert.equal(resolveStayDates({
    checkIn: "2024-07-30",
    checkOut: "2024-07-31",
    messages: [guest("I stayed in 2024 and want July 30 to 31, 2027")],
    today: "2026-07-28",
  }).checkIn, "2027-07-30");

  assert.equal(resolveStayDates({
    checkIn: "2024-07-30",
    checkOut: "2024-07-31",
    messages: [guest("I stayed last year and would like July 30 to 31, 2027")],
    today: "2026-07-28",
  }).checkIn, "2027-07-30");

  assert.equal(resolveStayDates({
    checkIn: "2024-07-30",
    checkOut: "2024-07-31",
    messages: [guest("I stayed in 2024 and would like July 30 to 31, 2027")],
    today: "2026-07-28",
  }).checkIn, "2027-07-30");

  assert.equal(resolveStayDates({
    checkIn: "2024-07-30",
    checkOut: "2024-07-31",
    messages: [guest("We are celebrating 2 years and want July 30 to 31")],
    today: "2026-07-28",
  }).checkIn, "2026-07-30");
});

test("accepts a qualified standalone year clarification", () => {
  assert.equal(resolveStayDates({
    checkIn: "2024-07-30",
    checkOut: "2024-07-31",
    messages: [guest("July 30 to July 31"), guest("2027 please")],
    today: "2026-07-28",
  }).checkIn, "2027-07-30");
});

test("requires clarification only for conflicting explicit years", () => {
  assert.throws(() => resolveStayDates({
    checkIn: "2026-07-30",
    checkOut: "2026-07-31",
    messages: [guest("July 30 in 2026 or 2028")],
    today: "2026-07-28",
  }), /conflicting years/);

  assert.throws(() => resolveAvailabilityMonth({
    month: "2026-07",
    messages: [guest("compare July 2026 and July 2027")],
    today: "2026-07-28",
  }), /conflicting years/);
});
