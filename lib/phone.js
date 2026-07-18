export const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

export function normalizePhone(value) {
  const phone = String(value || "").trim();
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+") && digits) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return phone;
}

export function isE164Phone(value) {
  return E164_PHONE_PATTERN.test(normalizePhone(value));
}
