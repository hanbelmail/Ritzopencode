import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./ticketConfirmation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2021 },
}).outputText;
const {
  ensureBookingConfirmationSequence,
  normalizeReservationConfirmationNumberPatch,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("requires a separately persisted confirmation number before booking confirmation", () => {
  assert.throws(
    () => ensureBookingConfirmationSequence(
      { status: "PAYMENT VERIFIED", reservationConfirmationNumber: "" },
      { status: "BOOKING CONFIRMED", reservationConfirmationNumber: "RC-123456" }
    ),
    /Save the reservation confirmation number/
  );
  assert.throws(
    () => ensureBookingConfirmationSequence(
      { status: "PAYMENT VERIFIED", reservationConfirmationNumber: "   " },
      { status: "BOOKING CONFIRMED", reservationConfirmationNumber: "   " }
    ),
    /Save the reservation confirmation number/
  );
});

test("allows booking confirmation after the same number was already persisted", () => {
  assert.doesNotThrow(() => ensureBookingConfirmationSequence(
    { status: "PAYMENT VERIFIED", reservationConfirmationNumber: "RC-123456" },
    { status: "BOOKING CONFIRMED", reservationConfirmationNumber: "RC-123456" }
  ));
});

test("rejects resubmitting the saved number with the booking-confirmed transition", () => {
  assert.throws(
    () => ensureBookingConfirmationSequence(
      { status: "PAYMENT VERIFIED", reservationConfirmationNumber: "RC-123456" },
      { status: "BOOKING CONFIRMED", reservationConfirmationNumber: "RC-123456" },
      false,
      true
    ),
    /Save the reservation confirmation number/
  );
});

test("rejects direct creation as booking confirmed", () => {
  assert.throws(
    () => ensureBookingConfirmationSequence(null, {
      status: "BOOKING CONFIRMED",
      reservationConfirmationNumber: "RC-123456",
    }, true),
    /Save the reservation confirmation number/
  );
});

test("prevents clearing a confirmed booking number", () => {
  assert.throws(
    () => ensureBookingConfirmationSequence(
      { status: "BOOKING CONFIRMED", reservationConfirmationNumber: "RC-123456" },
      { status: "BOOKING CONFIRMED", reservationConfirmationNumber: "" }
    ),
    /must keep its reservation confirmation number/
  );
});

test("allows repairing an already-confirmed legacy record without a number", () => {
  assert.doesNotThrow(() => ensureBookingConfirmationSequence(
    { status: "BOOKING CONFIRMED" },
    { status: "BOOKING CONFIRMED", reservationConfirmationNumber: "RC-123456" }
  ));
  assert.throws(
    () => ensureBookingConfirmationSequence(
      { status: "BOOKING CONFIRMED" },
      { status: "BOOKING CONFIRMED" }
    ),
    /Save the reservation confirmation number/
  );
});

test("trims confirmation-number patches and rejects non-string values", () => {
  assert.deepEqual(
    normalizeReservationConfirmationNumberPatch({ reservationConfirmationNumber: "  RC-123456  " }),
    { reservationConfirmationNumber: "RC-123456" }
  );
  assert.throws(
    () => normalizeReservationConfirmationNumberPatch({ reservationConfirmationNumber: 123456 }),
    /must be a string/
  );
});
