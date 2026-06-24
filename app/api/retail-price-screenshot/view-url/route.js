import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient, jsonError } from "@/lib/convex-server";
import { createRetailPriceScreenshotViewUrl, isRetailPriceScreenshotKeyForTicket } from "@/lib/r2";

export const runtime = "nodejs";

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
    const key = String(body?.key || "").trim();

    if (!ticketId || !key) {
      return jsonError("ticketId and key are required", 400);
    }

    if (!isRetailPriceScreenshotKeyForTicket(key, ticketId)) {
      return jsonError("Invalid retail price screenshot key", 400);
    }

    const ticket = await getConvexClient().query(api.tickets.get, { id: ticketId });
    if (!ticket) {
      return jsonError("Ticket not found", 404);
    }

    if (ticket.retailPriceScreenshotKey !== key) {
      return jsonError("Retail price screenshot not found for ticket", 404);
    }

    const viewUrl = await createRetailPriceScreenshotViewUrl(key);
    return NextResponse.json({ viewUrl });
  } catch (error) {
    const message = error.message || "Failed to create view URL";
    const status = message === "Invalid JSON body" || message.includes("required") || message.includes("Invalid") ? 400 : 500;
    return jsonError(message, status);
  }
}
