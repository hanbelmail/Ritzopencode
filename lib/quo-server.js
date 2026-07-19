import { isE164Phone, normalizePhone } from "@/lib/phone";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

export function getQuoFrom() {
  const configured = requireEnv("QUO_FROM");
  if (/^PN\S+$/.test(configured)) return configured;
  const normalized = normalizePhone(configured);
  if (!isE164Phone(normalized)) throw new Error("QUO_FROM must be an E.164 phone number or Quo PN identifier");
  return normalized;
}

export async function sendQuoText({ content, to, from = getQuoFrom() }) {
  const apiKey = requireEnv("QUO_API_KEY");
  const recipient = normalizePhone(to);
  if (!isE164Phone(recipient)) throw new Error("Quo recipient must use E.164 format");
  const text = String(content || "").trim();
  if (!text || text.length > 1600) throw new Error("Quo content must be between 1 and 1600 characters");

  let response;
  try {
    response = await fetch("https://api.quo.com/v1/messages", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: text, from, to: [recipient] }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (cause) {
    const error = new Error("Quo delivery result is unknown after a network failure", { cause });
    error.ambiguous = true;
    error.retryable = false;
    throw error;
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || result.description || `Quo failed with status ${response.status}`);
    error.status = response.status;
    error.ambiguous = response.status >= 500 || response.status === 408;
    error.retryable = response.status >= 400 && response.status < 500 && response.status !== 408;
    throw error;
  }
  return result;
}
