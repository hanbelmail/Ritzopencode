import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAutomationKey, requireServiceKey } from "./security";
import { getSmsConsent, normalizeSmsPhone } from "./smsConsent";

const FINALIZED_STATUSES = new Set(["PAYMENT VERIFIED", "BOOKING CONFIRMED"]);
const PAYMENT_BLOCKING_STATUSES = new Set(["PAYMENT SUBMITTED", "PAYMENT VERIFIED", "BOOKING CONFIRMED"]);
const LEGACY_STATUS_MAP: Record<string, string> = {
  QUOTE: "QUOTE REQUESTED",
  PENDING: "PRICE SENT",
  "PAYMENT RECEIVED": "PAYMENT SUBMITTED",
  CONFIRMED: "PAYMENT VERIFIED",
  COMPLETED: "BOOKING CONFIRMED",
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

function dateStamp(value: any) {
  const match = String(value || "").match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function normalizedStatus(value: any) {
  const status = String(value || "");
  return LEGACY_STATUS_MAP[status] || status;
}

function honoluluToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Pacific/Honolulu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

async function getConversation(ctx: any, publicId: string) {
  const conversation = await ctx.db.query("conversations").withIndex("by_publicId", (q: any) => q.eq("publicId", publicId)).first();
  if (!conversation) throw new Error("Conversation not found");
  return conversation;
}

async function getTicketRow(ctx: any, ticketId: string) {
  const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q: any) => q.eq("ticketId", ticketId)).first();
  if (!row) throw new Error("Ticket not found");
  return row;
}

function assertControlVersion(conversation: any, expectedControlVersion: number) {
  if ((conversation.controlVersion || 0) !== expectedControlVersion) throw new Error("Sara was paused while this action was being prepared");
}

function assertActiveQuote(ticket: any) {
  if (!Number.isFinite(Number(ticket?.rateOffered)) || Number(ticket.rateOffered) <= 0) throw new Error("The quote does not have a valid positive offered price");
  const expiresAt = Date.parse(String(ticket?.quoteExpiresAt || ""));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error("The quote is expired or missing a valid expiration");
}

async function hasPaymentConflict(ctx: any, ticket: any, excludeTicketId?: string) {
  const checkIn = dateStamp(ticket?.checkIn);
  const checkOut = dateStamp(ticket?.checkOut);
  if (!checkIn || !checkOut || checkIn >= checkOut) return true;
  const rows = await ctx.db.query("tickets").collect();
  return rows.some((row: any) => {
    const existing = row.data || {};
    if (existing.id === excludeTicketId || !PAYMENT_BLOCKING_STATUSES.has(normalizedStatus(existing.status))) return false;
    const existingStart = dateStamp(existing.checkIn);
    const existingEnd = dateStamp(existing.checkOut);
    return existingStart && existingEnd && checkIn < existingEnd && checkOut > existingStart;
  });
}

async function getCurrentTerms(ctx: any) {
  const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q: any) => q.eq("key", "main")).first();
  const version = String(settingsRow?.data?.saraTermsVersion || "");
  const terms = version ? await ctx.db.query("termsVersions").withIndex("by_version", (q: any) => q.eq("version", version)).first() : null;
  if (!terms) throw new Error("Current Terms are not published");
  return { settings: settingsRow?.data || {}, terms };
}

function ticketIndexFields(ticket: any) {
  return {
    status: String(ticket.status || ""),
    checkIn: dateStamp(ticket.checkIn),
    checkOut: dateStamp(ticket.checkOut),
    searchText: [
      ...(Array.isArray(ticket.guests) ? ticket.guests : []),
      ticket.id,
      ticket.email,
      ticket.phone,
      ticket.roomType,
      ticket.referredBy,
      ticket.status,
      ticket.notes,
    ].filter(Boolean).join(" "),
  };
}

async function available(ctx: any, checkIn: string, checkOut: string, excludeTicketId?: string) {
  const rows = await ctx.db.query("tickets").collect();
  return !rows.some((row: any) => {
    const ticket = row.data || {};
    if (ticket.id === excludeTicketId || !FINALIZED_STATUSES.has(normalizedStatus(ticket.status))) return false;
    const existingStart = dateStamp(ticket.checkIn);
    const existingEnd = dateStamp(ticket.checkOut);
    return existingStart && existingEnd && checkIn < existingEnd && checkOut > existingStart;
  });
}

function validateStay(checkInValue: string, checkOutValue: string) {
  const checkIn = dateStamp(checkInValue);
  const checkOut = dateStamp(checkOutValue);
  if (!checkIn || !checkOut || checkIn >= checkOut) throw new Error("Check-out must be after check-in");
  if (checkIn < honoluluToday()) throw new Error("Check-in cannot be in the past in Hawaii");
  return { checkIn, checkOut, nights: nightsBetween(checkIn, checkOut) };
}

async function findContacts(ctx: any, phone: string, email: string) {
  const byPhone = phone
    ? await ctx.db.query("contacts").withIndex("by_phone", (q: any) => q.eq("normalizedPhone", phone)).first()
    : null;
  const byEmail = email
    ? await ctx.db.query("contacts").withIndex("by_email", (q: any) => q.eq("normalizedEmail", email)).first()
    : null;
  return { byPhone, byEmail, ambiguous: Boolean(byPhone && byEmail && byPhone._id !== byEmail._id) };
}

export const checkAvailability = query({
  args: { serviceKey: v.string(), checkIn: v.string(), checkOut: v.string(), excludeTicketId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const stay = validateStay(args.checkIn, args.checkOut);
    return {
      available: await available(ctx, stay.checkIn, stay.checkOut, args.excludeTicketId),
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      nights: stay.nights,
      checkedAt: new Date().toISOString(),
      timezone: "Pacific/Honolulu",
      held: false,
    };
  },
});

export const lookupClient = query({
  args: { serviceKey: v.string(), phone: v.optional(v.string()), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const phone = normalizePhone(args.phone || "");
    const email = normalizeEmail(args.email || "");
    const result = await findContacts(ctx, phone, email);
    if (result.ambiguous) return { matched: false, ambiguous: true, relationship: "unknown" };
    const contact = result.byPhone || result.byEmail;
    return {
      matched: Boolean(contact),
      ambiguous: false,
      relationship: contact ? "repeat" : "new",
      acquisitionSource: contact?.acquisitionSource || null,
      smsOptOut: contact?.smsOptOut || false,
    };
  },
});

export const canSendSms = query({
  args: { serviceKey: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    if (!isAutomationKey(args.serviceKey)) requireServiceKey(args.serviceKey);
    const consent = await getSmsConsent(ctx, args.phone);
    return { allowed: !consent.optedOut, optedOut: consent.optedOut, version: consent.version };
  },
});

export const createQuoteRequest = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    idempotencyKey: v.string(),
    expectedControlVersion: v.number(),
    guests: v.array(v.string()),
    email: v.string(),
    phone: v.string(),
    checkIn: v.string(),
    checkOut: v.string(),
    roomType: v.optional(v.string()),
    acquisitionSource: v.union(v.literal("direct"), v.literal("promoter"), v.literal("referral")),
    referredBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const existingEvent = await ctx.db.query("reservationEvents").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey)).first();
    if (existingEvent) {
      const row = await getTicketRow(ctx, existingEvent.ticketId);
      return { ticket: row.data, duplicate: true };
    }

    const conversation = await getConversation(ctx, args.publicId);
    assertControlVersion(conversation, args.expectedControlVersion);
    if (conversation.channel === "sms" && conversation.externalParticipant && (await getSmsConsent(ctx, conversation.externalParticipant)).optedOut) {
      throw new Error("SMS recipient opted out");
    }
    if (conversation.ticketId) {
      const row = await getTicketRow(ctx, conversation.ticketId);
      return { ticket: row.data, duplicate: true };
    }

    const guests = args.guests.map((guest) => guest.trim()).filter(Boolean);
    if (!guests.length || guests.length > 4) throw new Error("Provide 1 to 4 guest names, including children");
    const email = normalizeEmail(args.email);
    const phone = normalizePhone(args.phone);
    if (!EMAIL_PATTERN.test(email)) throw new Error("A valid email is required");
    if (!PHONE_PATTERN.test(phone)) throw new Error("Phone must use E.164 format");
    const stay = validateStay(args.checkIn, args.checkOut);
    if (!await available(ctx, stay.checkIn, stay.checkOut)) throw new Error("Those dates are no longer available");

    const phoneConsent = await getSmsConsent(ctx, phone);
    const conversationSmsOptedOut = conversation.channel === "sms" && phoneConsent.optedOut;
    const matches = await findContacts(ctx, phone, email);
    if (matches.ambiguous) throw new Error("Phone and email match different client records; staff review is required");
    let contact = matches.byPhone || matches.byEmail;
    const now = new Date().toISOString();
    if (contact) {
      await ctx.db.patch(contact._id, {
        displayName: guests[0],
        normalizedPhone: phone,
        normalizedEmail: email,
        relationship: "repeat",
        acquisitionSource: args.acquisitionSource,
        referredBy: args.referredBy?.trim() || contact.referredBy,
        smsOptOut: phoneConsent.optedOut,
        updatedAt: now,
      });
      contact = await ctx.db.get(contact._id);
    } else {
      const contactId = await ctx.db.insert("contacts", {
        displayName: guests[0],
        normalizedPhone: phone,
        normalizedEmail: email,
        relationship: "new",
        acquisitionSource: args.acquisitionSource,
        referredBy: args.referredBy?.trim() || undefined,
        smsOptOut: phoneConsent.optedOut,
        createdAt: now,
        updatedAt: now,
      });
      contact = await ctx.db.get(contactId);
    }

    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const roomTypes = (settingsRow?.data?.roomTypes || []).filter((room: any) => !room.hidden && room.name);
    const roomType = args.roomType?.trim() || roomTypes[0]?.name || "Private residence";
    const ticket = {
      id: crypto.randomUUID(),
      createdAt: now,
      guests,
      email,
      phone,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      nights: stay.nights,
      roomType,
      referredBy: args.referredBy?.trim() || "",
      clientRelationship: contact?.relationship || "new",
      acquisitionSource: args.acquisitionSource,
      contactId: String(contact?._id || ""),
      conversationId: conversation.publicId,
      sourceChannel: conversation.channel,
      retailPrice: null,
      adjustment: 0,
      discountPct: 0,
      rateOffered: null,
      costPerNight: null,
      status: "QUOTE REQUESTED",
    };
    await ctx.db.insert("tickets", {
      ticketId: ticket.id,
      data: ticket,
      createdAt: now,
      updatedAt: now,
      ...ticketIndexFields(ticket),
    });
    await ctx.db.insert("reservationEvents", {
      ticketId: ticket.id,
      conversationId: conversation._id,
      type: "quote_requested",
      actorType: "assistant",
      idempotencyKey: args.idempotencyKey,
      payload: { channel: conversation.channel, relationship: contact?.relationship, acquisitionSource: args.acquisitionSource },
      createdAt: now,
    });
    await ctx.db.patch(conversation._id, {
      contactId: contact?._id,
      ticketId: ticket.id,
      stage: "quote_requested",
      status: conversationSmsOptedOut ? "closed" : "waiting_for_staff",
      aiEnabled: conversationSmsOptedOut ? false : conversation.aiEnabled,
      smsOptOut: conversationSmsOptedOut,
      collected: {
        ...conversation.collected,
        guests,
        email,
        phone,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        referredBy: args.referredBy?.trim(),
        acquisitionSource: args.acquisitionSource,
      },
      updatedAt: now,
    });
    return { ticket, duplicate: false };
  },
});

export const getTicketStatus = query({
  args: { serviceKey: v.string(), publicId: v.string() },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await getConversation(ctx, args.publicId);
    if (!conversation.ticketId) return { found: false };
    const row = await getTicketRow(ctx, conversation.ticketId);
    const ticket = row.data;
    return {
      found: true,
      id: ticket.id,
      status: normalizedStatus(ticket.status),
      guests: ticket.guests,
      checkIn: ticket.checkIn,
      checkOut: ticket.checkOut,
      roomType: ticket.roomType,
      rateOffered: ticket.rateOffered,
      retailPrice: ticket.retailPrice,
      discountPct: ticket.discountPct,
      quoteExpiresAt: ticket.quoteExpiresAt,
      reservationConfirmationNumber: ticket.reservationConfirmationNumber,
      termsAcceptedAt: ticket.termsAcceptedAt,
      termsVersion: ticket.termsVersion,
      termsAcceptedHash: ticket.termsAcceptedHash,
    };
  },
});

export const getBookingTerms = query({
  args: { serviceKey: v.string(), publicId: v.string() },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await getConversation(ctx, args.publicId);
    if (!conversation.ticketId) throw new Error("A quote ticket is required");
    const row = await getTicketRow(ctx, conversation.ticketId);
    if (normalizedStatus(row.data.status) !== "PRICE SENT") throw new Error("Booking Terms are available only after PRICE SENT");
    assertActiveQuote(row.data);
    if (await hasPaymentConflict(ctx, row.data, row.data.id)) throw new Error("These dates are no longer available for payment");
    const { terms } = await getCurrentTerms(ctx);
    return { version: terms.version, content: terms.content, contentHash: terms.contentHash };
  },
});

export const getPaymentInstructions = query({
  args: { serviceKey: v.string(), publicId: v.string() },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await getConversation(ctx, args.publicId);
    if (!conversation.ticketId) throw new Error("Ticket not found");
    const row = await getTicketRow(ctx, conversation.ticketId);
    if (normalizedStatus(row.data.status) !== "PRICE SENT") throw new Error("Payment instructions require a PRICE SENT ticket");
    assertActiveQuote(row.data);
    if (await hasPaymentConflict(ctx, row.data, row.data.id)) throw new Error("These dates are no longer available for payment");
    const { settings, terms } = await getCurrentTerms(ctx);
    if (!row.data.termsAcceptedAt || row.data.termsVersion !== terms.version || row.data.termsAcceptedHash !== terms.contentHash) {
      throw new Error("The guest must accept the current Terms before payment instructions are available");
    }
    const methods = (settings.paymentMethods || [])
      .filter((method: any) => method?.hidden !== true && String(method?.instructions || "").trim() && ["zelle", "venmo"].includes(String(method?.name || "").toLowerCase()))
      .map((method: any) => ({ name: String(method.name), instructions: String(method.instructions || "") }));
    if (!methods.length) throw new Error("No approved Zelle or Venmo instructions are configured");
    return { ticketId: row.data.id, methods, termsVersion: terms.version, termsHash: terms.contentHash };
  },
});

export const recordTermsAcceptance = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    messageId: v.string(),
    termsVersion: v.string(),
    acceptedText: v.string(),
    expectedControlVersion: v.number(),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await getConversation(ctx, args.publicId);
    assertControlVersion(conversation, args.expectedControlVersion);
    if (!conversation.ticketId) throw new Error("A quote ticket is required before accepting Terms");
    const idempotencyKey = `terms:${conversation.ticketId}:${args.messageId}`;
    const existingEvent = await ctx.db.query("reservationEvents").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey)).first();
    if (existingEvent) return { accepted: true, acceptedAt: existingEvent.createdAt, termsVersion: conversation.termsVersion };
    const { terms } = await getCurrentTerms(ctx);
    const currentTermsVersion = terms.version;
    if (args.termsVersion !== currentTermsVersion || conversation.termsPresentedVersion !== currentTermsVersion || conversation.termsPresentedHash !== terms.contentHash || !conversation.termsPresentedAt) {
      throw new Error("The current Terms must be presented before acceptance");
    }
    const inbound = await ctx.db.query("messages").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.messageId)).first();
    if (!inbound || inbound.conversationId !== conversation._id || inbound.direction !== "inbound") throw new Error("Acceptance must reference the current guest message");
    const actualText = inbound.content.trim();
    const expectedAgreement = `I agree to the Terms (${currentTermsVersion}).`;
    if (actualText !== expectedAgreement) throw new Error(`Reply exactly: ${expectedAgreement}`);
    const row = await getTicketRow(ctx, conversation.ticketId);
    if (normalizedStatus(row.data.status) !== "PRICE SENT") throw new Error("Terms can only be accepted after the price is sent");
    assertActiveQuote(row.data);
    if (await hasPaymentConflict(ctx, row.data, row.data.id)) throw new Error("These dates are no longer available for payment");
    const now = new Date().toISOString();
    const ticket = {
      ...row.data,
      termsAcceptedAt: now,
      termsVersion: currentTermsVersion,
      termsAcceptedText: actualText.slice(0, 500),
      termsAcceptedHash: terms.contentHash,
      termsAcceptedMessageId: args.messageId,
    };
    await ctx.db.patch(row._id, { data: ticket, updatedAt: now, ...ticketIndexFields(ticket) });
    await ctx.db.patch(conversation._id, {
      stage: "terms_accepted",
      termsVersion: currentTermsVersion,
      termsAcceptedAt: now,
      termsAcceptedMessageId: args.messageId,
      updatedAt: now,
    });
    await ctx.db.insert("reservationEvents", {
      ticketId: ticket.id,
      conversationId: conversation._id,
      type: "terms_accepted",
      actorType: "guest",
      idempotencyKey,
      payload: { termsVersion: currentTermsVersion, acceptedText: actualText.slice(0, 500), channel: conversation.channel, termsHash: terms.contentHash },
      createdAt: now,
    });
    return { accepted: true, acceptedAt: now, termsVersion: currentTermsVersion };
  },
});

export const recordTermsPresented = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    messageId: v.string(),
    termsVersion: v.string(),
    expectedControlVersion: v.number(),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await getConversation(ctx, args.publicId);
    assertControlVersion(conversation, args.expectedControlVersion);
    if (!conversation.ticketId) throw new Error("Ticket not found");
    const outbound = await ctx.db.query("messages").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.messageId)).first();
    if (!outbound || outbound.conversationId !== conversation._id || outbound.direction !== "outbound") throw new Error("Terms presentation message not found");
    const row = await getTicketRow(ctx, conversation.ticketId);
    if (normalizedStatus(row.data.status) !== "PRICE SENT") throw new Error("Terms can only be presented after the price is sent");
    assertActiveQuote(row.data);
    if (await hasPaymentConflict(ctx, row.data, row.data.id)) throw new Error("These dates are no longer available for payment");
    const { terms } = await getCurrentTerms(ctx);
    if (args.termsVersion !== terms.version) throw new Error("Terms version is not current");
    const presentedExactly = outbound.content.includes(`/terms/${encodeURIComponent(args.termsVersion)}`);
    if (!presentedExactly) throw new Error("Outbound message did not present the published Terms version");
    const now = new Date().toISOString();
    await ctx.db.patch(conversation._id, {
      stage: "terms_sent",
      termsPresentedVersion: args.termsVersion,
      termsPresentedAt: now,
      termsPresentedMessageId: args.messageId,
      termsPresentedHash: terms.contentHash,
      ...(conversation.termsVersion === args.termsVersion && conversation.termsAcceptedAt ? {} : {
        termsAcceptedAt: undefined,
        termsAcceptedMessageId: undefined,
      }),
      updatedAt: now,
    });
    return { presented: true, presentedAt: now };
  },
});

export const handoff = mutation({
  args: { serviceKey: v.string(), publicId: v.string(), reason: v.string(), expectedControlVersion: v.number() },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await getConversation(ctx, args.publicId);
    assertControlVersion(conversation, args.expectedControlVersion);
    const smsOptedOut = conversation.channel === "sms" && conversation.externalParticipant
      ? (await getSmsConsent(ctx, conversation.externalParticipant)).optedOut
      : false;
    const now = new Date().toISOString();
    await ctx.db.patch(conversation._id, {
      status: smsOptedOut ? "closed" : "human_required",
      stage: "handoff",
      aiEnabled: false,
      ...(smsOptedOut ? { smsOptOut: true } : {}),
      updatedAt: now,
    });
    if (conversation.ticketId) {
      await ctx.db.insert("reservationEvents", {
        ticketId: conversation.ticketId,
        conversationId: conversation._id,
        type: "human_handoff_requested",
        actorType: "assistant",
        payload: { reason: args.reason.trim().slice(0, 500) },
        createdAt: now,
      });
    }
    return { handedOff: true };
  },
});

export const setSmsOptOut = mutation({
  args: {
    serviceKey: v.string(),
    publicId: v.string(),
    optedOut: v.boolean(),
    eventId: v.string(),
    eventTimestamp: v.string(),
  },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const conversation = await getConversation(ctx, args.publicId);
    if (conversation.channel !== "sms") throw new Error("SMS consent requires an SMS conversation");
    const phone = normalizeSmsPhone(conversation.externalParticipant || conversation.collected.phone || "");
    if (!PHONE_PATTERN.test(phone)) throw new Error("SMS participant must use E.164 format");
    const timestampValue = new Date(args.eventTimestamp);
    if (Number.isNaN(timestampValue.getTime())) throw new Error("SMS consent event timestamp is invalid");
    const eventTimestamp = timestampValue.toISOString();
    const existing = await ctx.db.query("smsConsents").withIndex("by_phone", (q) => q.eq("normalizedPhone", phone)).first();
    if (existing?.sourceEventId === args.eventId) return { optedOut: existing.optedOut, version: existing.version, applied: false };
    if (existing?.sourceTimestamp && (
      existing.sourceTimestamp > eventTimestamp ||
      (existing.sourceTimestamp === eventTimestamp && existing.optedOut && !args.optedOut)
    )) {
      return { optedOut: existing.optedOut, version: existing.version, applied: false };
    }
    const now = new Date().toISOString();
    const version = (existing?.version || 0) + 1;
    const consentPatch = {
      optedOut: args.optedOut,
      version,
      sourceEventId: args.eventId,
      sourceTimestamp: eventTimestamp,
      ...(args.optedOut ? { optedOutAt: now } : { optedInAt: now }),
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, consentPatch);
    else await ctx.db.insert("smsConsents", { normalizedPhone: phone, ...consentPatch });

    const contacts = await ctx.db.query("contacts").withIndex("by_phone", (q) => q.eq("normalizedPhone", phone)).collect();
    for (const contact of contacts) await ctx.db.patch(contact._id, { smsOptOut: args.optedOut, updatedAt: now });

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_externalParticipant", (q) => q.eq("externalParticipant", phone))
      .filter((q) => q.eq(q.field("channel"), "sms"))
      .collect();
    for (const smsConversation of conversations) {
      const controlVersion = (smsConversation.controlVersion || 0) + 1;
      if (args.optedOut) {
        await ctx.db.patch(smsConversation._id, {
          smsOptOut: true,
          ...(!smsConversation.smsOptOut ? {
            smsOptOutPreviousAiEnabled: smsConversation.aiEnabled,
            smsOptOutPreviousStatus: smsConversation.status,
          } : {}),
          aiEnabled: false,
          status: "closed",
          controlVersion,
          updatedAt: now,
        });
      } else {
        const restoreAfterStop = smsConversation.smsOptOut === true;
        await ctx.db.patch(smsConversation._id, {
          smsOptOut: false,
          ...(restoreAfterStop ? {
            aiEnabled: smsConversation.smsOptOutPreviousAiEnabled ?? true,
            status: smsConversation.smsOptOutPreviousStatus || "open",
          } : {}),
          smsOptOutPreviousAiEnabled: undefined,
          smsOptOutPreviousStatus: undefined,
          controlVersion,
          updatedAt: now,
        });
      }
    }

    if (args.optedOut) {
      for (const status of ["pending", "failed"] as const) {
        const outboxes = await ctx.db.query("messageOutbox").withIndex("by_status", (q) => q.eq("status", status)).collect();
        for (const outbox of outboxes.filter((item) => item.to === phone)) {
          await ctx.db.patch(outbox._id, { status: "suppressed", retryable: false, lastError: "Recipient opted out", updatedAt: now });
          await ctx.db.patch(outbox.messageId, { deliveryStatus: "suppressed" });
        }
      }
    }
    return { optedOut: args.optedOut, version, applied: true };
  },
});
