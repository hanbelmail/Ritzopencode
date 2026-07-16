import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient, jsonError } from "@/lib/convex-server";
import { createRetailPriceScreenshotViewUrl, isRetailPriceScreenshotKeyForTicket } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const ticketId = String(id || "").trim();
    const ticket = await getConvexClient().query(api.tickets.get, { id: ticketId });

    if (!ticket) return jsonError("Ticket not found", 404);
    if (!ticket.retailPriceScreenshotKey || !isRetailPriceScreenshotKeyForTicket(ticket.retailPriceScreenshotKey, ticketId)) {
      return jsonError("Retail price screenshot not found for ticket", 404);
    }

    const viewUrl = await createRetailPriceScreenshotViewUrl(ticket.retailPriceScreenshotKey);
    const response = NextResponse.redirect(viewUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return jsonError(error.message || "Failed to open retail price screenshot");
  }
}
