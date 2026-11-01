import { api } from "@/convex/_generated/api";
import { getAutomationServiceKey } from "@/lib/convex-server";

export async function recordNotificationResults({ client, ticket, event, email, sms }) {
  for (const [channel, result] of Object.entries({ email, sms, staffEmail: email?.staffEmail })) {
    if (!result?.error && !result?.sent) continue;
    try {
      await client.mutation(api.staffNotifications.recordDeliveryResult, {
        serviceKey: getAutomationServiceKey(),
        ticketId: ticket.id,
        quoteRevision: ticket.quoteRevision || 0,
        event: `${event}:${channel}`,
        accepted: Boolean(result.sent),
        ...(result.error ? { error: String(result.error).slice(0, 700) } : {}),
      });
    } catch {
      console.error("Could not record lifecycle notification outcome", { event, channel, ticketId: ticket.id });
    }
  }
}
