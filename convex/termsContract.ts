export const SMS_TERMS_AGREEMENT_TEXT = "I AGREE";
export const SMS_TERMS_ACCEPTANCE_INSTRUCTION = "To accept the Terms, reply that you agree or accept. For example: I AGREE, AGREE, or I ACCEPT.";
export const SMS_TERMS_ACCEPTANCE_CONTRACT = "sms_explicit_acceptance_v3";
export const PRIOR_SMS_TERMS_ACCEPTANCE_CONTRACT = "sms_i_agree_v2";
export const LEGACY_SMS_TERMS_ACCEPTANCE_CONTRACT = "sms_versioned_exact_v1";
export const WEB_TERMS_ACCEPTANCE_CONTRACT = "web_checkbox_v1";

const EXPLICIT_SMS_ACCEPTANCE_PHRASES = new Set([
  "i agree",
  "agree",
  "i accept",
  "accept",
  "i agree to the terms",
  "i accept the terms",
  "yes, i agree",
  "yes, i accept",
]);

export function termsAgreementText(version: string) {
  return `I agree to the Terms (${version}).`;
}

export function normalizeSmsTermsReply(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeExplicitSmsTermsReply(value: string) {
  return normalizeSmsTermsReply(value)
    .replace(/[.,!]+$/g, "")
    .trim();
}

export function isReplyAfterTermsPresentation(inboundCreationTime: number, presentedCreationTime: number) {
  return Number.isFinite(inboundCreationTime) &&
    Number.isFinite(presentedCreationTime) &&
    inboundCreationTime > presentedCreationTime;
}

export function isSmsTermsPresentationSendConfirmed(deliveryStatus: string) {
  return deliveryStatus === "accepted" || deliveryStatus === "delivered";
}

function foldAgreement(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isTermsAgreementNearMiss(actual: string, expected: string) {
  const trimmed = actual.trim();
  return trimmed !== expected && foldAgreement(trimmed) === foldAgreement(expected);
}

function isAcceptanceAttempt(actual: string, legacyAgreement: string) {
  const normalized = normalizeSmsTermsReply(actual);
  return actual.trim() === legacyAgreement ||
    isTermsAgreementNearMiss(actual, legacyAgreement) ||
    foldAgreement(actual) === foldAgreement(SMS_TERMS_AGREEMENT_TEXT) ||
    /^(?:i\s+)?(?:agree|accept)(?:\b|[.!?])/i.test(normalized) ||
    /^(?:yes|agreed)(?:\b|[.!?])/i.test(normalized);
}

export function classifyTermsReply({
  channel,
  actual,
  legacyAgreement,
  acceptanceContract,
}: {
  channel: "web" | "sms";
  actual: string;
  legacyAgreement: string;
  acceptanceContract?: string;
}) {
  if (channel === "web") {
    return isAcceptanceAttempt(actual, legacyAgreement) ? "web_control_required" : "not_applicable";
  }

  if (acceptanceContract === SMS_TERMS_ACCEPTANCE_CONTRACT) {
    if (EXPLICIT_SMS_ACCEPTANCE_PHRASES.has(normalizeExplicitSmsTermsReply(actual))) return "accepted_explicit_sms";
    return isAcceptanceAttempt(actual, legacyAgreement) ? "retry" : "not_applicable";
  }

  if (acceptanceContract === PRIOR_SMS_TERMS_ACCEPTANCE_CONTRACT) {
    if (normalizeSmsTermsReply(actual) === "i agree") return "accepted_normalized_sms";
    return isAcceptanceAttempt(actual, legacyAgreement) ? "retry" : "not_applicable";
  }

  if (acceptanceContract === LEGACY_SMS_TERMS_ACCEPTANCE_CONTRACT) {
    if (actual.trim() === legacyAgreement) return "accepted_legacy_sms";
    return isAcceptanceAttempt(actual, legacyAgreement) ? "retry" : "not_applicable";
  }

  return "not_applicable";
}
