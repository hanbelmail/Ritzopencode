import { sendPriceSentEmail } from "@/lib/price-sent-email-server";
import { sendPriceSentSms } from "@/lib/price-sent-sms-server";

export async function sendPriceSentNotifications({ client, ticket, origin }) {
  let currentTicket = ticket;
  let email;
  let sms;

  try {
    email = await sendPriceSentEmail({ client, ticket: currentTicket, origin });
    if (email.ticket) currentTicket = email.ticket;
  } catch (error) {
    email = { sent: false, error: error.message || "Failed to send price sent email" };
  }

  try {
    sms = await sendPriceSentSms({ client, ticket: currentTicket, origin });
    if (sms.ticket) currentTicket = sms.ticket;
  } catch (error) {
    sms = { sent: false, error: error.message || "Failed to send price sent SMS" };
  }

  return { ticket: currentTicket, email, sms };
}
