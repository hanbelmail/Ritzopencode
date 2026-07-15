import { NextResponse } from "next/server";
import { jsonError } from "@/lib/convex-server";
import {
  assertPdfContentType,
  createBookingConfirmedHotelAlertAttachmentKey,
  createBookingConfirmedHotelAlertAttachmentUploadUrl,
} from "@/lib/r2";

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
    const fileName = String(body?.fileName || "booking-confirmed-attachment.pdf").trim();
    const contentType = String(body?.contentType || "");

    assertPdfContentType(contentType, "Booking confirmed alert attachment");
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      throw new Error("Booking confirmed alert attachment must be a PDF");
    }

    const key = createBookingConfirmedHotelAlertAttachmentKey(fileName);
    const uploadUrl = await createBookingConfirmedHotelAlertAttachmentUploadUrl({ key, contentType });
    return NextResponse.json({ key, uploadUrl });
  } catch (error) {
    const message = error.message || "Failed to create upload URL";
    const status = message === "Invalid JSON body" || message.includes("PDF") ? 400 : 500;
    return jsonError(message, status);
  }
}
