import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient, getConvexServiceKey, jsonError } from "@/lib/convex-server";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { runSaraAgent } from "@/lib/sara-agent-server";

export const runtime = "nodejs";

const COOKIE_NAME = "sara_conversation";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readSession(request) {
  const value = request.cookies.get(COOKIE_NAME)?.value || "";
  const separator = value.indexOf(".");
  if (separator < 1) return null;
  const publicId = value.slice(0, separator);
  const token = value.slice(separator + 1);
  return publicId && token ? { publicId, token, accessTokenHash: tokenHash(token) } : null;
}

function newSession() {
  const publicId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  return { publicId, token, accessTokenHash: tokenHash(token) };
}

function setSessionCookie(response, session) {
  response.cookies.set(COOKIE_NAME, `${session.publicId}.${session.token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

function safeMessages(messages) {
  return messages.map((message) => ({
    id: message.messageId,
    role: message.direction === "inbound" ? "guest" : message.authorType,
    content: message.content,
    createdAt: message.createdAt,
    deliveryStatus: message.deliveryStatus,
  }));
}

function allowedOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return ["same-origin", "same-site"].includes(request.headers.get("sec-fetch-site") || "");
  const allowed = new Set([request.nextUrl.origin]);
  if (process.env.PUBLIC_APP_URL) {
    try {
      allowed.add(new URL(process.env.PUBLIC_APP_URL).origin);
    } catch {
      return false;
    }
  }
  return allowed.has(origin);
}

function publicOrigin(request) {
  if (!process.env.PUBLIC_APP_URL) return request.nextUrl.origin;
  return new URL(process.env.PUBLIC_APP_URL).origin;
}

function requestRateKey(request, serviceKey) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${serviceKey}:${address}`).digest("hex");
}

async function saraSettings(client, serviceKey) {
  return { ...DEFAULT_SETTINGS, ...((await client.query(api.settings.get, { serviceKey })) || {}) };
}

export async function GET(request) {
  try {
    const client = getConvexClient();
    const serviceKey = getConvexServiceKey();
    const settings = await saraSettings(client, serviceKey);
    const session = readSession(request);
    if (!session) {
      if (!settings.saraWebEnabled) return NextResponse.json({
        enabled: Boolean(settings.saraWebEnabled),
        agentName: settings.saraAgentName,
        messages: [],
      });
      const created = newSession();
      await client.mutation(api.conversations.openWeb, { serviceKey, publicId: created.publicId, accessTokenHash: created.accessTokenHash });
      const response = NextResponse.json({ enabled: true, agentName: settings.saraAgentName, messages: [], status: "open", stage: "new", aiEnabled: true, ticketId: null });
      setSessionCookie(response, created);
      return response;
    }

    const context = await client.query(api.conversations.getContext, {
      serviceKey,
      publicId: session.publicId,
      accessTokenHash: session.accessTokenHash,
    });
    if (!context) {
      const response = NextResponse.json({ enabled: Boolean(settings.saraWebEnabled), agentName: settings.saraAgentName, messages: [] });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
    return NextResponse.json({
      enabled: Boolean(settings.saraWebEnabled),
      agentName: settings.saraAgentName,
      messages: safeMessages(context.messages),
      status: context.conversation.status,
      stage: context.conversation.stage,
      aiEnabled: context.conversation.aiEnabled,
      ticketId: context.conversation.ticketId || null,
    });
  } catch (error) {
    return jsonError(error.message || "Failed to load Sara", 503);
  }
}

export async function POST(request) {
  if (!allowedOrigin(request)) return jsonError("Origin not allowed", 403);

  try {
    const body = await request.json();
    const content = String(body?.message || "").trim();
    const requestedMessageId = String(body?.messageId || "").trim();
    if (!content || content.length > 2000) return jsonError("Message must be between 1 and 2000 characters", 400);
    if (requestedMessageId && !/^[A-Za-z0-9:_-]{8,160}$/.test(requestedMessageId)) return jsonError("Invalid message ID", 400);

    const client = getConvexClient();
    const serviceKey = getConvexServiceKey();
    const settings = await saraSettings(client, serviceKey);
    if (!settings.saraWebEnabled) return jsonError("Sara web chat is not enabled", 503);
    const rate = await client.mutation(api.conversations.consumeWebRateLimit, {
      serviceKey,
      key: requestRateKey(request, serviceKey),
      limit: settings.saraMaxMessagesPerHour,
    });
    if (!rate.allowed) return jsonError("Message limit reached. Please try again later.", 429);

    let session = readSession(request);
    let isNewSession = false;
    if (!session) {
      session = newSession();
      isNewSession = true;
    }
    await client.mutation(api.conversations.openWeb, {
      serviceKey,
      publicId: session.publicId,
      accessTokenHash: session.accessTokenHash,
    });

    const inboundMessageId = requestedMessageId || `web:${randomUUID()}`;
    const inbound = await client.mutation(api.conversations.appendInbound, {
      serviceKey,
      publicId: session.publicId,
      accessTokenHash: session.accessTokenHash,
      messageId: inboundMessageId,
      content,
    });

    if (inbound.duplicate) {
      const context = await client.query(api.conversations.getContext, {
        serviceKey,
        publicId: session.publicId,
        accessTokenHash: session.accessTokenHash,
      });
      const response = NextResponse.json({
        duplicate: true,
        messages: safeMessages(context?.messages || []),
        status: context?.conversation?.status,
        stage: context?.conversation?.stage,
        ticketId: context?.conversation?.ticketId || null,
      });
      if (isNewSession) setSessionCookie(response, session);
      return response;
    }

    let result;
    try {
      result = await runSaraAgent({
        client,
        publicId: session.publicId,
        accessTokenHash: session.accessTokenHash,
        inboundMessageId,
        origin: publicOrigin(request),
      });
    } catch (error) {
      const errorMessage = String(error.message || "");
      if (errorMessage.includes("already processing") || /paused while|paused for/i.test(errorMessage)) {
        const context = await client.query(api.conversations.getContext, {
          serviceKey,
          publicId: session.publicId,
          accessTokenHash: session.accessTokenHash,
        });
        const response = NextResponse.json({
          skipped: true,
          reason: errorMessage.includes("already processing") ? "Sara is still processing the previous message" : "Sara was paused by the reservations team",
          messages: safeMessages(context?.messages || []),
          status: context?.conversation?.status,
          stage: context?.conversation?.stage,
          ticketId: context?.conversation?.ticketId || null,
        }, { status: 202 });
        if (isNewSession) setSessionCookie(response, session);
        return response;
      }
      const current = await client.query(api.conversations.getContext, {
        serviceKey,
        publicId: session.publicId,
        accessTokenHash: session.accessTokenHash,
      });
      if (!current?.conversation?.aiEnabled) {
        result = { skipped: true, reason: "Sara was paused by the reservations team" };
      } else {
        const controlVersion = current.conversation.controlVersion || 0;
        await client.mutation(api.sara.handoff, {
          serviceKey,
          publicId: session.publicId,
          reason: `Agent runtime failure: ${String(error.message || "unknown").slice(0, 300)}`,
          expectedControlVersion: controlVersion,
        });
        const fallback = settings.saraHandoffMessage || DEFAULT_SETTINGS.saraHandoffMessage;
        await client.mutation(api.conversations.appendOutbound, {
          serviceKey,
          publicId: session.publicId,
          messageId: `sara-fallback:${inboundMessageId}`,
          content: fallback,
          authorType: "system",
          replyToMessageId: inboundMessageId,
          metadata: { degraded: true },
          expectedControlVersion: controlVersion,
        });
        result = { skipped: false, reply: fallback, handedOff: true, degraded: true };
      }
    }

    const context = await client.query(api.conversations.getContext, {
      serviceKey,
      publicId: session.publicId,
      accessTokenHash: session.accessTokenHash,
    });
    const response = NextResponse.json({
      ...result,
      messages: safeMessages(context?.messages || []),
      status: context?.conversation?.status,
      stage: context?.conversation?.stage,
      ticketId: context?.conversation?.ticketId || null,
    });
    if (isNewSession) setSessionCookie(response, session);
    return response;
  } catch (error) {
    const message = error.message || "Sara could not process the message";
    const status = /limit|between|Invalid|not allowed/i.test(message) ? 400 : 500;
    return jsonError(message, status);
  }
}

export async function DELETE(request) {
  if (!allowedOrigin(request)) return jsonError("Origin not allowed", 403);
  const response = NextResponse.json({ cleared: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
