export async function notifyPaymentSubmitted(ticketId) {
  const response = await fetch("/api/payment-submitted-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Failed to send payment submitted alert");
  }

  return result;
}
