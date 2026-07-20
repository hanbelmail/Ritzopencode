import { sendBookingRequestHotelAlertEmail } from "@/lib/booking-request-hotel-alert-email-server";
import { sendTicketStatusSms } from "@/lib/ticket-status-sms-server";

export async function sendPaymentVerifiedNotifications({ client, ticket, origin }) {
  let currentTicket = ticket;
  let email;
  let sms;

  try {
    email = await sendBookingRequestHotelAlertEmail({ client, ticket: currentTicket });
    if (email.ticket) currentTicket = email.ticket;
  } catch (error) {
    email = { sent: false, error: error.message || "Failed to send booking request hotel alert" };
  }
  try {
    sms = await sendTicketStatusSms({ client, ticket: currentTicket, origin, event: "paymentVerified" });
    if (sms.ticket) currentTicket = sms.ticket;
  } catch (error) {
    sms = { sent: false, error: error.message || "Failed to send payment verified guest SMS" };
  }

  return { ticket: currentTicket, email, sms, sent: Boolean(email.sent || sms.sent), reason: email.reason || sms.reason };
}
