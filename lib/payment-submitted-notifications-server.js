import { sendPaymentSubmittedAlertEmail } from "@/lib/payment-submitted-alert-email-server";
import { sendTicketStatusSms } from "@/lib/ticket-status-sms-server";

export async function sendPaymentSubmittedNotifications({ client, ticket, origin }) {
  let currentTicket = ticket;
  let email;
  let sms;

  try {
    email = await sendPaymentSubmittedAlertEmail({ client, ticket: currentTicket, origin });
    if (email.ticket) currentTicket = email.ticket;
  } catch (error) {
    email = { sent: false, error: error.message || "Failed to send payment submitted staff alert" };
  }
  try {
    sms = await sendTicketStatusSms({ client, ticket: currentTicket, origin, event: "paymentSubmitted" });
    if (sms.ticket) currentTicket = sms.ticket;
  } catch (error) {
    sms = { sent: false, error: error.message || "Failed to send payment submitted guest SMS" };
  }

  return { ticket: currentTicket, email, sms, sent: Boolean(email.sent || sms.sent), reason: email.reason || sms.reason };
}
