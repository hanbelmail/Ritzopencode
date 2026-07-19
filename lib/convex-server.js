import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

export function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }

  return new ConvexHttpClient(convexUrl);
}

export function getConvexServiceKey() {
  const serviceKey = process.env.SARA_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("SARA_SERVICE_KEY must be configured in Next.js and Convex");
  }
  return serviceKey;
}

export function getAutomationServiceKey() {
  const automationKey = process.env.N8N_API_KEY;
  if (!automationKey) {
    throw new Error("N8N_API_KEY must be configured in Next.js and Convex");
  }
  return automationKey;
}

export function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
