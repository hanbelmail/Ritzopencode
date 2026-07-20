import { sendBookingConfirmedHotelAlertEmail } from "@/lib/booking-confirmed-hotel-alert-email-server";
import { sendTicketStatusSms } from "@/lib/ticket-status-sms-server";

export async function sendBookingConfirmedNotifications({ client, ticket, origin }) {
  let currentTicket = ticket;
  let email;
  let sms;

  try {
    email = await sendBookingConfirmedHotelAlertEmail({ client, ticket: currentTicket });
    if (email.ticket) currentTicket = email.ticket;
  } catch (error) {
    email = { sent: false, error: error.message || "Failed to send booking confirmed hotel alert" };
  }
  try {
    sms = await sendTicketStatusSms({ client, ticket: currentTicket, origin, event: "bookingConfirmed" });
    if (sms.ticket) currentTicket = sms.ticket;
  } catch (error) {
    sms = { sent: false, error: error.message || "Failed to send booking confirmed guest SMS" };
  }

  return { ticket: currentTicket, email, sms, sent: Boolean(email.sent || sms.sent), reason: email.reason || sms.reason };
}
