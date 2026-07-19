import OpenAI from "openai";
import { api } from "@/convex/_generated/api";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { getConvexServiceKey } from "@/lib/convex-server";
import { buildSaraInstructions, SARA_PROMPT_VERSION } from "@/lib/sara-prompt";

const DEFAULT_MODEL = "gpt-4.1-mini";
const MAX_TOOL_ROUNDS = 6;

function objectSchema(properties, required = Object.keys(properties)) {
  return { type: "object", properties, required, additionalProperties: false };
}

const nullableString = { type: ["string", "null"] };

const tools = [
  {
    type: "function",
    name: "search_knowledge",
    description: "Search approved guest-facing property and policy Knowledge before answering a general question.",
    strict: true,
    parameters: objectSchema({ query: { type: "string", minLength: 2, maxLength: 300 } }),
  },
  {
    type: "function",
    name: "get_property_details",
    description: "Get current public room names, address, cleaning fee, and configured discount tiers. Use for dynamic property or pricing-process questions, not exact quotes.",
    strict: true,
    parameters: objectSchema({}, []),
  },
  {
    type: "function",
    name: "check_availability",
    description: "Check whether the one private residence is currently available for future Hawaii stay dates. This does not hold dates.",
    strict: true,
    parameters: objectSchema({
      check_in: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      check_out: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    }),
  },
  {
    type: "function",
    name: "lookup_client",
    description: "Classify a guest as new or repeat using normalized phone first and email second. Call only after at least one identifier is available.",
    strict: true,
    parameters: objectSchema({ phone: nullableString, email: nullableString }),
  },
  {
    type: "function",
    name: "create_quote_request",
    description: "Create one QUOTE REQUESTED CRM ticket after availability and all required guest details are confirmed.",
    strict: true,
    parameters: objectSchema({
      guests: { type: "array", minItems: 1, maxItems: 4, items: { type: "string", minLength: 2, maxLength: 120 } },
      email: { type: "string", maxLength: 320 },
      phone: { type: "string", maxLength: 30 },
      check_in: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      check_out: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      room_type: nullableString,
      acquisition_source: { type: "string", enum: ["direct", "promoter", "referral"] },
      referred_by: nullableString,
    }),
  },
  {
    type: "function",
    name: "get_ticket_status",
    description: "Get the conversation's current guest-safe CRM ticket status and quote details.",
    strict: true,
    parameters: objectSchema({}, []),
  },
  {
    type: "function",
    name: "get_booking_terms",
    description: "Get the current approved Terms only when a priced guest wants to book. Never fabricate missing Terms.",
    strict: true,
    parameters: objectSchema({}, []),
  },
  {
    type: "function",
    name: "record_terms_acceptance",
    description: "Record explicit agreement contained in the current guest message after the current Terms were presented.",
    strict: true,
    parameters: objectSchema({ accepted_text: { type: "string", minLength: 2, maxLength: 500 } }),
  },
  {
    type: "function",
    name: "get_payment_instructions",
    description: "Get current Zelle or Venmo instructions and the secure proof-upload link. Requires recorded Terms acceptance and an unexpired PRICE SENT ticket.",
    strict: true,
    parameters: objectSchema({}, []),
  },
  {
    type: "function",
    name: "handoff_to_staff",
    description: "Pause AI replies and request a human reservation specialist when required by policy or requested by the guest.",
    strict: true,
    parameters: objectSchema({ reason: { type: "string", minLength: 3, maxLength: 500 } }),
  },
];

function requireOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey, timeout: 25000, maxRetries: 1 });
}

function publicPropertySettings(settings) {
  return {
    hotelName: settings.hotelName,
    hotelAddress: settings.hotelAddress,
    cleaningFee: settings.cleaningFee,
    discountTiers: settings.discountTiers,
    roomTypes: (settings.roomTypes || []).filter((room) => !room.hidden).map((room) => room.name),
    quoteValidityDays: settings.saraQuoteValidityDays,
    independentService: true,
  };
}

function historyInput(messages) {
  return messages.slice(-30).map((message) => ({
    role: message.direction === "inbound" ? "user" : "assistant",
    content: message.authorType === "staff" ? `[Human reservations specialist] ${message.content}` : message.content,
  }));
}

function formatReply(text, channel) {
  const clean = String(text || "").trim();
  if (channel === "web") return clean.slice(0, 4000);
  return clean
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 600)
    .trim();
}

async function executeTool({ client, serviceKey, publicId, inboundMessageId, origin, settings, controlVersion, name, args }) {
  switch (name) {
    case "search_knowledge":
      return client.query(api.knowledge.searchApproved, { serviceKey, search: args.query, limit: 6 });
    case "get_property_details":
      return publicPropertySettings(settings);
    case "check_availability":
      return client.query(api.sara.checkAvailability, {
        serviceKey,
        checkIn: args.check_in,
        checkOut: args.check_out,
      });
    case "lookup_client":
      return client.query(api.sara.lookupClient, {
        serviceKey,
        phone: args.phone || undefined,
        email: args.email || undefined,
      });
    case "create_quote_request": {
      const result = await client.mutation(api.sara.createQuoteRequest, {
        serviceKey,
        publicId,
        idempotencyKey: `sara-quote:${publicId}`,
        expectedControlVersion: controlVersion,
        guests: args.guests,
        email: args.email,
        phone: args.phone,
        checkIn: args.check_in,
        checkOut: args.check_out,
        roomType: args.room_type || undefined,
        acquisitionSource: args.acquisition_source,
        referredBy: args.referred_by || undefined,
      });
      return {
        created: !result.duplicate,
        ticketId: result.ticket.id,
        status: result.ticket.status,
        ticketUrl: new URL(`/ticket/${result.ticket.id}`, origin).toString(),
      };
    }
    case "get_ticket_status":
      return client.query(api.sara.getTicketStatus, { serviceKey, publicId });
    case "get_booking_terms": {
      const terms = await client.query(api.sara.getBookingTerms, { serviceKey, publicId });
      return {
        version: terms.version,
        contentHash: terms.contentHash,
        termsUrl: new URL(`/terms/${encodeURIComponent(terms.version)}`, origin).toString(),
        requiredAgreement: `I agree to the Terms (${terms.version}).`,
      };
    }
    case "record_terms_acceptance": {
      const terms = await client.query(api.sara.getBookingTerms, { serviceKey, publicId });
      return client.mutation(api.sara.recordTermsAcceptance, {
        serviceKey,
        publicId,
        messageId: inboundMessageId,
        termsVersion: terms.version,
        acceptedText: args.accepted_text,
        expectedControlVersion: controlVersion,
      });
    }
    case "get_payment_instructions": {
      const payment = await client.query(api.sara.getPaymentInstructions, { serviceKey, publicId });
      return {
        methods: payment.methods,
        proofUploadUrl: new URL(`/ticket/${payment.ticketId}`, origin).toString(),
        notice: "Payment remains unverified until staff reviews it.",
      };
    }
    case "handoff_to_staff":
      return client.mutation(api.sara.handoff, { serviceKey, publicId, reason: args.reason, expectedControlVersion: controlVersion });
    default:
      throw new Error(`Unsupported Sara tool: ${name}`);
  }
}

export async function runSaraAgent({ client, publicId, accessTokenHash, inboundMessageId, origin }) {
  const serviceKey = getConvexServiceKey();
  let context = await client.query(api.conversations.getContext, { serviceKey, publicId, accessTokenHash });
  if (!context) throw new Error("Conversation not found");
  if (!context.conversation.aiEnabled || ["human_required", "closed"].includes(context.conversation.status)) {
    return { skipped: true, reason: "Sara is paused for this conversation" };
  }

  const savedSettings = await client.query(api.settings.get, { serviceKey });
  const settings = { ...DEFAULT_SETTINGS, ...(savedSettings || {}) };
  const model = process.env.OPENAI_MODEL || settings.saraModel || DEFAULT_MODEL;
  const openai = requireOpenAI();
  const run = await client.mutation(api.conversations.startRun, {
    serviceKey,
    publicId,
    inboundMessageId,
    model,
    promptVersion: SARA_PROMPT_VERSION,
  });
  if (["completed", "handoff"].includes(run.status)) {
    const existing = context.messages.find((message) => message.idempotencyKey === `sara:${inboundMessageId}` || message.idempotencyKey === `sara-fallback:${inboundMessageId}`);
    if (existing) return { skipped: false, reply: existing.content, message: existing, outboundMessageId: existing.messageId, handedOff: run.status === "handoff", duplicate: true };
  }
  const toolLog = [];
  let input = historyInput(context.messages);
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    let response = await openai.responses.create({
      model,
      instructions: buildSaraInstructions({ settings, ...context }),
      input,
      tools,
      parallel_tool_calls: false,
      max_output_tokens: context.conversation.channel === "sms" ? 300 : 600,
      store: false,
      include: ["reasoning.encrypted_content"],
      safety_identifier: publicId.slice(0, 64),
    });

    let toolRounds = 0;
    while (true) {
      totalInputTokens += response.usage?.input_tokens || 0;
      totalOutputTokens += response.usage?.output_tokens || 0;
      if (response.error) throw new Error(response.error.message || "OpenAI response failed");
      if (response.status === "incomplete" || response.incomplete_details) throw new Error("Sara returned an incomplete response");
      const calls = response.output.filter((item) => item.type === "function_call");
      if (!calls.length) {
        let reply = formatReply(response.output_text, context.conversation.channel);
        if (!reply) throw new Error("Sara returned an empty response");

        const termsPresented = toolLog.some((entry) => entry.name === "get_booking_terms" && entry.ok);
        let presentedTerms = null;
        if (termsPresented) {
          presentedTerms = await client.query(api.sara.getBookingTerms, { serviceKey, publicId });
          const termsMessage = `Please review the booking Terms: ${new URL(`/terms/${encodeURIComponent(presentedTerms.version)}`, origin)}. Reply exactly: I agree to the Terms (${presentedTerms.version}).`;
          const hasPublishedTerms = reply.includes(`/terms/${encodeURIComponent(presentedTerms.version)}`);
          if (!hasPublishedTerms) {
            reply = formatReply(termsMessage, context.conversation.channel);
          }
        }

        const hasPriorAssistant = context.messages.some((message) => message.authorType === "assistant");
        if (!hasPriorAssistant && !/\bAI\b/i.test(reply)) {
          reply = formatReply(`I'm ${settings.saraAgentName || "Sara"}, the AI reservations assistant for an independent private residence service, not the official hotel reservations desk.\n\n${reply}`, context.conversation.channel);
        }

        const outboundMessageId = `sara:${inboundMessageId}`;
        const message = await client.mutation(api.conversations.appendOutbound, {
          serviceKey,
          publicId,
          messageId: outboundMessageId,
          content: reply,
          authorType: "assistant",
          replyToMessageId: inboundMessageId,
          metadata: { model, promptVersion: SARA_PROMPT_VERSION },
          expectedControlVersion: run.controlVersion || 0,
        });
        if (termsPresented) {
          await client.mutation(api.sara.recordTermsPresented, {
            serviceKey,
            publicId,
            messageId: outboundMessageId,
            termsVersion: presentedTerms.version,
            expectedControlVersion: run.controlVersion || 0,
          });
        }
        const handedOff = toolLog.some((entry) => entry.name === "handoff_to_staff" && entry.ok);
        await client.mutation(api.conversations.finishRun, {
          serviceKey,
          runId: run._id,
          status: handedOff ? "handoff" : "completed",
          toolCalls: toolLog,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        });
        return { skipped: false, reply, message, outboundMessageId, handedOff };
      }

      if (toolRounds >= MAX_TOOL_ROUNDS) throw new Error("Sara exceeded the tool-call limit");
      toolRounds += 1;

      input = [...input, ...response.output];
      for (const call of calls) {
        let args;
        try {
          args = JSON.parse(call.arguments || "{}");
          const output = await executeTool({
            client,
            serviceKey,
            publicId,
            inboundMessageId,
            origin,
            settings,
            controlVersion: run.controlVersion || 0,
            name: call.name,
            args,
          });
          toolLog.push({ name: call.name, ok: true });
          input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify({ ok: true, data: output }) });
        } catch (error) {
          toolLog.push({ name: call.name, ok: false, error: String(error.message || "Tool failed").slice(0, 300) });
          input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify({ ok: false, error: error.message }) });
        }
      }

      context = await client.query(api.conversations.getContext, { serviceKey, publicId, accessTokenHash });
      response = await openai.responses.create({
        model,
        instructions: buildSaraInstructions({ settings, ...context }),
        input,
        tools,
        parallel_tool_calls: false,
        max_output_tokens: context.conversation.channel === "sms" ? 300 : 600,
        store: false,
        include: ["reasoning.encrypted_content"],
        safety_identifier: publicId.slice(0, 64),
      });
    }
  } catch (error) {
    await client.mutation(api.conversations.finishRun, {
      serviceKey,
      runId: run._id,
      status: "failed",
      toolCalls: toolLog,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      error: String(error.message || "Sara failed").slice(0, 1000),
    });
    throw error;
  }
}
