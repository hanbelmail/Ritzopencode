import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getAutomationServiceKey, getConvexClient, jsonError } from "@/lib/convex-server";
import { inspectPaymentProofObject, isPaymentProofKeyForTicket } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const ticketId = String(body?.ticketId || "").trim();
    const key = String(body?.key || "").trim();
    if (!ticketId || !isPaymentProofKeyForTicket(key, ticketId)) return jsonError("Valid ticketId and payment proof key are required", 400);
    const proof = await inspectPaymentProofObject(key);
    await getConvexClient().mutation(api.tickets.confirmPaymentProofUpload, {
      id: ticketId,
      key,
      contentType: proof.contentType,
      size: proof.size,
      ...(proof.etag ? { etag: proof.etag } : {}),
      serviceKey: getAutomationServiceKey(),
    });
    return NextResponse.json({ confirmed: true });
  } catch (error) {
    const message = error.message || "Failed to confirm payment proof upload";
    return jsonError(message, /required|invalid|expired|image|empty|large|changed/i.test(message) ? 400 : 500);
  }
}
