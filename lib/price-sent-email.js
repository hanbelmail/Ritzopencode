export async function notifyPriceSent(ticketId) {
  const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/notify-price-sent`, {
    method: "POST",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Failed to send price sent email");
  }

  return result;
}
