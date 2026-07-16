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

export function getPriceSentNotificationFeedback(result) {
  const notifications = [
    ["Email", result.email],
    ["SMS", result.sms],
  ].filter(([, notification]) => notification);
  const sent = notifications.filter(([, notification]) => notification.sent);
  const summary = notifications.map(([label, notification]) => {
    if (notification.sent) return `${label} sent`;
    if (notification.error) return `${label} failed: ${notification.error}`;
    return `${label} skipped: ${notification.reason || "not configured"}`;
  }).join(". ");

  return {
    title: sent.length ? "Price notifications sent" : "Price notifications skipped",
    description: summary || "No price notifications were configured.",
    variant: sent.length ? "success" : "destructive",
  };
}
