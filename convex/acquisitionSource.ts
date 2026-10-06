export const ACQUISITION_SOURCES = ["direct", "promoter", "referral"] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

const REFERRER_NAME_SOURCES: ReadonlySet<string> = new Set<string>(["promoter", "referral"]);

const PLACEHOLDER_REFERRER_NAMES: ReadonlySet<string> = new Set([
  "-",
  ".",
  "?",
  "n/a",
  "na",
  "none",
  "no",
  "no name",
  "noname",
  "not provided",
  "not sure",
  "unknown",
  "unk",
  "tbd",
  "anonymous",
  "anon",
  "someone",
  "other",
  "dont know",
  "don't know",
  "i dont know",
  "i don't know",
  "no idea",
  "idk",
]);

export const REFERRER_NAME_REQUIRED_ERROR =
  "A referrer name is required when the acquisition source is promoter or referral. Ask the guest who referred them, then call create_quote_request again with referred_by set to that name. Never record a placeholder such as unknown or n/a; if the guest cannot name the referrer, call handoff_to_staff.";

export function requiresReferrerName(acquisitionSource: any): boolean {
  return REFERRER_NAME_SOURCES.has(String(acquisitionSource ?? "").trim().toLowerCase());
}

export function normalizeReferredBy(value: any): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function assertReferrerName(acquisitionSource: any, referredBy: any): string {
  const name = normalizeReferredBy(referredBy);
  if (!requiresReferrerName(acquisitionSource)) return name;
  if (name.length < 2 || PLACEHOLDER_REFERRER_NAMES.has(name.toLowerCase())) {
    throw new Error(REFERRER_NAME_REQUIRED_ERROR);
  }
  return name;
}
