import { fmtDate } from "@/lib/calc";

const DATE_FIELDS = ["checkIn", "checkOut"];

function rangeText(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "";
  return `${fmtDate(checkIn)} to ${fmtDate(checkOut)}`;
}

function fieldDate(fields, field, value) {
  const entry = fields.find((entry) => entry.field === field);
  return typeof entry?.[value] === "string" ? entry[value] : "";
}

function stayRange(fields, value) {
  const checkIn = fields.find((field) => field.field === "checkIn");
  const checkOut = fields.find((field) => field.field === "checkOut");
  if (!checkIn && !checkOut) return "";
  return rangeText(fieldDate(fields, "checkIn", value), fieldDate(fields, "checkOut", value));
}

function changedLabels(fields) {
  return fields.map((field) => field.label || field.field).join(", ");
}

function dateChangeLines(fields, current, requested) {
  const currentRange = rangeText(
    current.checkIn || fieldDate(fields, "checkIn", "from"),
    current.checkOut || fieldDate(fields, "checkOut", "from")
  );
  const requestedRange = rangeText(
    requested.checkIn || fieldDate(fields, "checkIn", "to"),
    requested.checkOut || fieldDate(fields, "checkOut", "to")
  );
  return [
    currentRange ? `Current dates: ${currentRange}` : "",
    requestedRange ? `Requested dates: ${requestedRange}` : "",
  ].filter(Boolean);
}

export function buildReservationChangeConfirmation({
  fields = [],
  ticketStatus = "",
  currentCheckIn,
  currentCheckOut,
  requestedCheckIn,
  requestedCheckOut,
}) {
  const dateFields = fields.filter((field) => DATE_FIELDS.includes(field.field));
  if (dateFields.length) {
    const dateLines = dateChangeLines(
      fields,
      { checkIn: currentCheckIn, checkOut: currentCheckOut },
      { checkIn: requestedCheckIn, checkOut: requestedCheckOut }
    );
    return [
      "You asked to change your reservation dates.",
      ...(dateLines.length ? dateLines : [`Requested change: ${changedLabels(dateFields)}.`]),
      "This replaces your current quote and your Terms acceptance, and a new quote for the requested dates is prepared for you.",
      ticketStatus === "PRICE SENT"
        ? "Reply YES to make this change, or NO to keep your current reservation."
        : "Reply YES to make this change, or NO to leave it as it is.",
    ].join("\n\n");
  }
  return [
    `Please confirm this change to your reservation: ${changedLabels(fields)}.`,
    "Reply YES to apply it, or NO to leave your reservation as it is.",
  ].join("\n\n");
}

export function buildReservationChangeApplied({ fields = [], requote = false, checkIn, checkOut, nights }) {
  if (!requote) {
    return `Done. I updated your reservation details: ${changedLabels(fields)}. Everything else stays the same.`;
  }
  const range = checkIn && checkOut ? ` ${fmtDate(checkIn)} to ${fmtDate(checkOut)}` : "";
  const stay = nights ? `${range} (${nights} night${nights === 1 ? "" : "s"})` : range;
  return [
    `Done. Your reservation request is now${stay}.`,
    "The previous quote no longer applies. A new quote for these dates is being prepared and will follow shortly.",
  ].join("\n\n");
}

export function buildReservationChangeCancelled({ fields = [] }) {
  const current = fields.some((field) => DATE_FIELDS.includes(field.field)) ? stayRange(fields, "from") : "";
  return current
    ? `No changes were made. Your reservation keeps its current dates: ${current}.`
    : "No changes were made. Your reservation stays as it is.";
}

export function buildReservationChangeExpired() {
  return "That change request expired, so nothing was updated. Tell me the new dates or details again and I will start a fresh request.";
}

export function buildReservationChangeUnconfirmed() {
  return "I could not verify my change request message. Please ask me to send the change details again.";
}

export function buildReservationChangeStale() {
  return "Your reservation changed while that request was waiting for your reply, so I did not apply it. Please tell me the change again.";
}

export function buildReservationChangeInvalid({ reason = "" }) {
  const detail = String(reason || "").trim();
  return `I could not apply that change${detail ? `: ${detail}` : ""}. A human reservations specialist can help you with it.`;
}

export function buildReservationChangeReply(result) {
  switch (result?.status) {
    case "applied":
      return buildReservationChangeApplied(result);
    case "cancelled":
      return buildReservationChangeCancelled(result);
    case "expired":
      return buildReservationChangeExpired();
    case "presentation_unconfirmed":
      return buildReservationChangeUnconfirmed();
    case "stale":
      return buildReservationChangeStale();
    case "invalid":
      return buildReservationChangeInvalid(result);
    default:
      return "";
  }
}

export function buildQuoteFailureMessage({ checkIn, checkOut }) {
  const stay = checkIn && checkOut ? ` ${fmtDate(checkIn)} to ${fmtDate(checkOut)}` : "";
  return `I wasn't able to complete an automatic quote for${stay || " those dates"}. Please ask me about other dates, or I can bring in a human reservations specialist to price this stay.`;
}
