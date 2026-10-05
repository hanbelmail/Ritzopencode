export const STALE_QUOTE_CALLBACK_ERROR =
  "Stale quote callback; a newer quote request superseded this pricing run";

const TERMS_ACCEPTANCE_FIELDS = [
  "termsAcceptedAt",
  "termsVersion",
  "termsAcceptedText",
  "termsAcceptedHash",
  "termsAcceptedMessageId",
  "termsAcceptanceSource",
  "termsAcceptanceAction",
  "termsAcceptanceContract",
  "termsAcceptedNormalizedText",
];

const PRICE_SENT_NOTIFICATION_FIELDS = [
  "priceSentEmailSentAt",
  "priceSentStaffEmailSentAt",
  "priceSentSmsSentAt",
  "priceSentSmsMessageId",
  "priceSentSmsClaimedAt",
  "priceSentSmsClaimToken",
  "priceSentSmsSettingsUpdatedAt",
  "priceSentSmsConsentVersion",
  "priceSentSmsError",
  "priceSentSmsDeliveryUnknownAt",
];

const QUOTE_INPUT_FIELDS = ["checkIn", "checkOut", "roomType"];

export function quoteDateStamp(value: any) {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function isQuoteInputField(field: string) {
  return QUOTE_INPUT_FIELDS.includes(field);
}

export function quoteInputsChanged(current: any, patch: any) {
  if (!patch || typeof patch !== "object") return false;
  return QUOTE_INPUT_FIELDS.some((field) => {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) return false;
    if (field === "roomType") return String(patch[field] || "") !== String(current?.[field] || "");
    return quoteDateStamp(patch[field]) !== quoteDateStamp(current?.[field]);
  });
}

export function quoteRevisionOf(ticket: any) {
  const revision = Number(ticket?.quoteRevision);
  return Number.isFinite(revision) && revision > 0 ? Math.floor(revision) : 0;
}

export function initialQuoteRound(now: string, token?: string) {
  return {
    quoteRevision: 0,
    quoteToken: String(token || "").trim() || crypto.randomUUID(),
    quoteRequestedAt: now,
  };
}

export function nextQuoteRevision(ticket: any, now: string, token?: string) {
  const quoteRevision = quoteRevisionOf(ticket) + 1;
  return {
    quoteRevision,
    quoteToken: String(token || "").trim() || crypto.randomUUID(),
    quoteRequestedAt: now,
  };
}

export function quoteWebhookKey(ticketId: string, revision: number) {
  return revision <= 0 ? `quote-created:${ticketId}` : `quote-requote:${ticketId}:${revision}`;
}

export function expectedQuoteWebhookKey(ticket: any) {
  return quoteWebhookKey(String(ticket?.id || ""), quoteRevisionOf(ticket));
}

export function isStalePricingCallback(ticket: any, incomingToken?: any) {
  const expected = String(ticket?.quoteToken || "");
  if (!expected) return false;
  return String(incomingToken ?? "") !== expected;
}

export function applyRequoteReset(ticket: any, revision: { quoteRevision: number; quoteToken: string; quoteRequestedAt: string }) {
  const updated: any = {
    ...ticket,
    status: "QUOTE REQUESTED",
    retailPrice: null,
    rateOffered: null,
    costPerNight: null,
    discountPct: 0,
    quoteExpiresAt: null,
    retailPriceScreenshot: null,
    retailPriceScreenshotKey: null,
    quoteError: null,
    requoteNotifiedRevision: null,
    quoteFailureNotifiedRevision: null,
    ...revision,
  };
  for (const field of [...TERMS_ACCEPTANCE_FIELDS, ...PRICE_SENT_NOTIFICATION_FIELDS]) delete updated[field];
  return updated;
}

export function requoteReasons(current: any, patch: any, targetStatus: string) {
  const reasons: string[] = [];
  if (quoteInputsChanged(current, patch)) reasons.push("quote_inputs_changed");
  if (String(current?.status || "") !== "QUOTE REQUESTED" && targetStatus === "QUOTE REQUESTED") reasons.push("returned_to_quote_requested");
  return reasons;
}

export function shouldRequote(current: any, patch: any, targetStatus: string, paymentBlocking: boolean) {
  if (paymentBlocking) return { requote: false, reasons: [] as string[] };
  if (targetStatus !== "QUOTE REQUESTED") return { requote: false, reasons: [] as string[] };
  const reasons = requoteReasons(current, patch, targetStatus);
  return { requote: reasons.length > 0, reasons };
}
