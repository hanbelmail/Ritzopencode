import { api } from "@/convex/_generated/api";
import { getConvexClient, jsonError } from "@/lib/convex-server";
import { sendBookingConfirmedNotifications } from "@/lib/booking-confirmed-notifications-server";

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export async function POST(request) {
  try {
    const body = await readJsonBody(request);
    const ticketId = String(body?.ticketId || "").trim();

    if (!ticketId) {
      return jsonError("Request body must include ticketId", 400);
    }

    const client = getConvexClient();
    const ticket = await client.query(api.tickets.get, { id: ticketId });

    if (!ticket) {
      return jsonError("Ticket not found", 404);
    }

    const result = await sendBookingConfirmedNotifications({ client, ticket, origin: request.nextUrl.origin });

    return Response.json(result);
  } catch (error) {
    const message = error.message || "Failed to send booking confirmed hotel alert";
    const status = message === "Invalid JSON body" ? 400 : message.includes("Missing required environment variable") ? 500 : 502;
    return jsonError(message, status);
  }
}
