export function termsAgreementText(version: string) {
  return `I agree to the Terms (${version}).`;
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
