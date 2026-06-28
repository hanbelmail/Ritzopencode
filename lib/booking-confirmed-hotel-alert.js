export async function notifyBookingConfirmedHotel(ticketId) {
  const response = await fetch("/api/booking-confirmed-hotel-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Failed to send booking confirmed hotel alert");
  }

  return result;
}
