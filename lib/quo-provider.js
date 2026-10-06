export function quoProviderMessageId(result) {
  if (!result || typeof result !== "object") return undefined;
  const candidates = [result.data?.id, result.id, result.data?.messageId, result.messageId];
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : "";
    if (value) return value;
  }
  return undefined;
}
