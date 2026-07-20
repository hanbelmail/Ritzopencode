import { sendTicketStatusSms } from "@/lib/ticket-status-sms-server";

export function sendPriceSentSms(options) {
  return sendTicketStatusSms({ ...options, event: "priceSent" });
}
