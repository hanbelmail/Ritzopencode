export const RESERVATION_CHANGE_CONFIRMATION_CONTRACT = "reservation_change_confirmation_v1";
export const RESERVATION_CHANGE_TTL_MS = 30 * 60_000;

const AFFIRMATIVE_REPLIES = new Set([
  "yes",
  "y",
  "yep",
  "yeah",
  "yes please",
  "yes, please",
  "please",
  "please do",
  "ok",
  "okay",
  "sure",
  "correct",
  "thats right",
  "that's right",
  "confirm",
  "confirmed",
  "confirmation",
  "i confirm",
  "go ahead",
  "proceed",
  "do it",
  "make the change",
  "change it",
  "update it",
  "yes change it",
  "yes, change it",
  "yes update it",
  "yes, update it",
]);

const NEGATIVE_REPLIES = new Set([
  "no",
  "n",
  "nope",
  "no thanks",
  "no thank you",
  "not now",
  "cancel",
  "cancelled",
  "canceled",
  "stop",
  "never mind",
  "nevermind",
  "forget it",
  "leave it",
  "keep it",
  "keep them",
  "keep the old dates",
  "keep my dates",
  "dont change it",
  "don't change it",
  "do not change it",
  "no change",
  "scratch that",
  "wait",
  "hold on",
]);

export function normalizeChangeReply(value: any) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,!]+$/g, "")
    .trim();
}

export function classifyChangeReply(value: any): "confirmed" | "cancelled" | "unrecognized" {
  const normalized = normalizeChangeReply(value);
  if (!normalized) return "unrecognized";
  if (AFFIRMATIVE_REPLIES.has(normalized)) return "confirmed";
  if (NEGATIVE_REPLIES.has(normalized)) return "cancelled";
  return "unrecognized";
}

export const RESERVATION_CHANGE_FIELD_LABELS: Record<string, string> = {
  checkIn: "check-in",
  checkOut: "check-out",
  guests: "guest names",
  email: "email",
  phone: "phone",
};

export function isQuoteInvalidatingField(field: string) {
  return ["checkIn", "checkOut", "roomType"].includes(field);
}

export function changeSummaryFields(change: any) {
  const fields = Array.isArray(change?.fields) ? change.fields : [];
  return fields
    .filter((field: any) => field && RESERVATION_CHANGE_FIELD_LABELS[String(field.field)])
    .map((field: any) => ({
      field: String(field.field),
      label: RESERVATION_CHANGE_FIELD_LABELS[String(field.field)],
      from: field.from,
      to: field.to,
    }));
}

export function isQuoteInvalidatingChange(change: any) {
  return changeSummaryFields(change).some((field: any) => isQuoteInvalidatingField(field.field));
}

export function changeSnapshotFields(change: any) {
  const fields = changeSummaryFields(change);
  return fields
    .map((field: any) => `${field.field}:${Array.isArray(field.to) ? field.to.join("|") : String(field.to ?? "")}`)
    .join(",");
}

export function isReservationChangeExpired(change: any, now = Date.now()) {
  const requestedAt = Date.parse(String(change?.requestedAt || ""));
  if (!Number.isFinite(requestedAt)) return true;
  return now - requestedAt > RESERVATION_CHANGE_TTL_MS;
}
