import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

export function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }

  return new ConvexHttpClient(convexUrl);
}

export function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
