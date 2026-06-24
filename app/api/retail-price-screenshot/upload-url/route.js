import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient, jsonError } from "@/lib/convex-server";
import { assertImageContentType, createRetailPriceScreenshotKey, createRetailPriceScreenshotUploadUrl } from "@/lib/r2";

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
    const fileName = String(body?.fileName || "retail-price-screenshot");
    const contentType = String(body?.contentType || "");

    if (!ticketId) {
      return jsonError("ticketId is required", 400);
    }

    assertImageContentType(contentType, "Retail price screenshot");

    const ticket = await getConvexClient().query(api.tickets.get, { id: ticketId });
    if (!ticket) {
      return jsonError("Ticket not found", 404);
    }

    const key = createRetailPriceScreenshotKey(ticketId, fileName);
    const uploadUrl = await createRetailPriceScreenshotUploadUrl({ key, contentType });

    return NextResponse.json({ key, uploadUrl });
  } catch (error) {
    const message = error.message || "Failed to create upload URL";
    const status = message === "Invalid JSON body" || message.includes("image") ? 400 : 500;
    return jsonError(message, status);
  }
}
