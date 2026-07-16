export const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

export function normalizePhone(value) {
  return String(value || "").trim();
}

export function isE164Phone(value) {
  return E164_PHONE_PATTERN.test(normalizePhone(value));
}
