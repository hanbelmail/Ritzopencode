import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getAutomationServiceKey, getConvexClient, jsonError } from "@/lib/convex-server";
import { DEFAULT_SETTINGS } from "@/lib/defaults";

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
    const ticket = body?.ticket;

    if (!ticket || typeof ticket !== "object" || Array.isArray(ticket)) {
      return jsonError("Request body must include a ticket object", 400);
    }

    const settings = { ...DEFAULT_SETTINGS, ...((await getConvexClient().query(api.settings.get, { serviceKey: getAutomationServiceKey() })) || {}) };

    if (!settings.webhookEnabled) {
      return NextResponse.json({ skipped: true, reason: "Webhook is disabled" });
    }

    if (!settings.webhookUrl) {
      return jsonError("Webhook URL is not configured", 400);
    }

    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket),
    });

    if (!response.ok) {
      return jsonError(`Webhook returned ${response.status}`, 502);
    }

    return NextResponse.json({ sent: true, status: response.status });
  } catch (error) {
    const message = error.message || "Failed to send quote webhook";
    return jsonError(message, message === "Invalid JSON body" ? 400 : 500);
  }
}
