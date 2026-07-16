import { api } from "@/convex/_generated/api";
import { getConvexClient, jsonError } from "@/lib/convex-server";
import { sendPriceSentNotifications } from "@/lib/price-sent-notifications-server";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const client = getConvexClient();
    const ticket = await client.query(api.tickets.get, { id });

    if (!ticket) return jsonError("Ticket not found", 404);

    const result = await sendPriceSentNotifications({
      client,
      ticket,
      origin: request.nextUrl.origin,
    });

    return Response.json(result);
  } catch (error) {
    const message = error.message || "Failed to send price sent notifications";
    const status = message.includes("not found") ? 404 : message.includes("Missing required environment variable") ? 500 : 502;
    return jsonError(message, status);
  }
}
