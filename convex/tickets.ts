import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { isAutomationKey, isStaff, requireStaff, requireStaffOrAutomation } from "./security";
import { getSmsConsent, normalizeSmsPhone } from "./smsConsent";

const legacyStatusMap: Record<string, string> = {
  QUOTE: "QUOTE REQUESTED",
  PENDING: "PRICE SENT",
  "PAYMENT RECEIVED": "PAYMENT SUBMITTED",
  CONFIRMED: "PAYMENT VERIFIED",
  COMPLETED: "BOOKING CONFIRMED",
};
const PAYMENT_BLOCKING_STATUSES = new Set(["PAYMENT SUBMITTED", "PAYMENT VERIFIED", "BOOKING CONFIRMED"]);
const STATUS_RANK: Record<string, number> = {
  "QUOTE REQUESTED": 0,
  "PRICE SENT": 1,
  "PAYMENT SUBMITTED": 2,
  "PAYMENT VERIFIED": 3,
  "BOOKING CONFIRMED": 4,
};

function normalizeTicket(ticket: any) {
  if (!ticket?.status) return ticket;
  return {
    ...ticket,
    status: legacyStatusMap[ticket.status] || ticket.status,
  };
}

function dateStamp(value: any) {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function ticketIndexFields(ticket: any) {
  const normalized = normalizeTicket(ticket) || {};
  const guests = Array.isArray(normalized.guests) ? normalized.guests : [];
  const searchText = [
    ...guests,
    normalized.id,
    normalized.email,
    normalized.phone,
    normalized.roomType,
    normalized.referredBy,
    normalized.status,
    normalized.notes,
  ]
    .filter(Boolean)
    .map((value) => String(value))
    .join(" ");

  return {
    status: normalized.status ? String(normalized.status) : "",
    checkIn: dateStamp(normalized.checkIn),
    checkOut: dateStamp(normalized.checkOut),
    searchText,
  };
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

async function ensureFinalStayAvailable(ctx: any, ticket: any, excludeId?: any) {
  if (!["PAYMENT VERIFIED", "BOOKING CONFIRMED"].includes(normalizeTicket(ticket)?.status)) return;
  const checkIn = dateStamp(ticket.checkIn);
  const checkOut = dateStamp(ticket.checkOut);
  if (!checkIn || !checkOut || checkIn >= checkOut) throw new Error("Finalized reservations require valid stay dates");
  const rows = await ctx.db.query("tickets").collect();
  const conflict = rows.some((candidate: any) => {
    if (candidate._id === excludeId) return false;
    const existing = normalizeTicket(candidate.data) || {};
    const existingCheckIn = dateStamp(existing.checkIn);
    const existingCheckOut = dateStamp(existing.checkOut);
    return ["PAYMENT VERIFIED", "BOOKING CONFIRMED"].includes(existing.status) &&
      existingCheckIn && existingCheckOut && checkIn < existingCheckOut && checkOut > existingCheckIn;
  });
  if (conflict) throw new Error("These dates conflict with a finalized reservation");
}

function quoteIsActive(ticket: any) {
  const expiresAt = Date.parse(String(ticket?.quoteExpiresAt || ""));
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

async function hasPaymentConflict(ctx: any, ticket: any, excludeId?: any) {
  const checkIn = dateStamp(ticket?.checkIn);
  const checkOut = dateStamp(ticket?.checkOut);
  if (!checkIn || !checkOut || checkIn >= checkOut) return true;
  const rows = await ctx.db.query("tickets").collect();
  return rows.some((candidate: any) => {
    if (candidate._id === excludeId) return false;
    const existing = normalizeTicket(candidate.data) || {};
    const existingCheckIn = dateStamp(existing.checkIn);
    const existingCheckOut = dateStamp(existing.checkOut);
    return PAYMENT_BLOCKING_STATUSES.has(existing.status) && existingCheckIn && existingCheckOut && checkIn < existingCheckOut && checkOut > existingCheckIn;
  });
}

async function assertPayable(ctx: any, ticket: any, excludeId?: any) {
  if (!Number.isFinite(Number(ticket?.rateOffered)) || Number(ticket.rateOffered) <= 0) throw new Error("This quote does not have a valid positive offered price");
  if (!quoteIsActive(ticket)) throw new Error("This quote is missing a valid future expiration or has expired");
  if (await hasPaymentConflict(ctx, ticket, excludeId)) throw new Error("These dates are no longer available for payment");
}

async function quoteExpiry(ctx: any, baseDate = new Date()) {
  const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q: any) => q.eq("key", "main")).first();
  const validityDays = Math.min(30, Math.max(1, Number(settingsRow?.data?.saraQuoteValidityDays) || 3));
  return new Date(baseDate.getTime() + validityDays * 86400000).toISOString();
}

function filterTicket(ticket: any, args: { status?: string; dateField?: string; from?: string; to?: string }) {
  const normalized = normalizeTicket(ticket) || {};
  if (args.status && normalized.status !== args.status) return false;

  if (args.from || args.to) {
    const field = args.dateField || "checkIn";
    const stamp = dateStamp(normalized[field]);
    if (!stamp) return false;
    if (args.from && stamp < args.from) return false;
    if (args.to && stamp > args.to) return false;
  }

  return true;
}

function applyTicketFilters(queryBuilder: any, args: { status?: string; dateField?: string; from?: string; to?: string }) {
  return queryBuilder.filter((q: any) => {
    const conditions = [];

    if (args.status) {
      const statuses = [
        args.status,
        ...Object.entries(legacyStatusMap)
          .filter(([, normalized]) => normalized === args.status)
          .map(([legacy]) => legacy),
      ];
      conditions.push(q.or(...statuses.map((status) => q.eq(q.field("data.status"), status))));
    }

    if (args.from || args.to) {
      const dateField = args.dateField || "checkIn";
      const field = dateField === "createdAt" ? "createdAt" : `data.${dateField}`;
      if (args.from) conditions.push(q.gte(q.field(field), args.from));
      if (args.to) conditions.push(q.lte(q.field(field), args.to));
    }

    return conditions.length ? q.and(...conditions) : q.neq(q.field("ticketId"), "");
  });
}

async function publicQuote(ctx: any, data: any) {
  const guests = Array.isArray(data?.guests)
    ? data.guests.map((guest: any) => String(guest || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  const email = String(data?.email || "").trim().toLowerCase();
  const phone = String(data?.phone || "").trim();
  const checkIn = dateStamp(data?.checkIn);
  const checkOut = dateStamp(data?.checkOut);
  const roomType = String(data?.roomType || "").trim();

  if (!guests.length) throw new Error("At least one guest is required");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("A valid email is required");
  if (!/^\+[1-9]\d{1,14}$/.test(phone)) throw new Error("Phone must use E.164 format");
  if (!checkIn || !checkOut || checkIn >= checkOut) throw new Error("Valid stay dates are required");
  if (checkIn < honoluluToday()) throw new Error("Check-in cannot be in the past in Hawaii");
  if (!roomType) throw new Error("Room type is required");

  const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q: any) => q.eq("key", "main")).first();
  const visibleRooms = (settingsRow?.data?.roomTypes || []).filter((room: any) => room?.hidden !== true).map((room: any) => String(room?.name || "").trim());
  if (visibleRooms.length && !visibleRooms.includes(roomType)) throw new Error("Room type is not available");
  const rows = await ctx.db.query("tickets").collect();
  const unavailable = rows.some((row: any) => {
    const ticket = normalizeTicket(row.data) || {};
    return ["PAYMENT VERIFIED", "BOOKING CONFIRMED"].includes(ticket.status) && checkIn < dateStamp(ticket.checkOut) && checkOut > dateStamp(ticket.checkIn);
  });
  if (unavailable) throw new Error("Those dates are not available");

  return {
    guests,
    email,
    phone,
    checkIn,
    checkOut,
    roomType,
    referredBy: String(data?.referredBy || "").trim(),
    notes: String(data?.notes || "").trim(),
    retailPrice: null,
    adjustment: 0,
    rateOffered: null,
    costPerNight: null,
    nights: Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000),
    discountPct: 0,
    status: "QUOTE REQUESTED",
    sourceChannel: "web_form",
  };
}

export const list = query({
  args: { serviceKey: v.optional(v.string()) },
  handler: async (ctx, { serviceKey }) => {
    await requireStaffOrAutomation(ctx, serviceKey);
    const rows = await ctx.db.query("tickets").collect();
    return rows
      .map((row) => normalizeTicket(row.data))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  },
});

export const listPage = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    dateField: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const search = args.search?.trim();
    const status = args.status?.trim();
    const filters = {
      status: status && status !== "all" ? status : undefined,
      dateField: args.dateField,
      from: args.from?.trim() || undefined,
      to: args.to?.trim() || undefined,
    };

    if (search) {
      let searchQuery = ctx.db
        .query("tickets")
        .withSearchIndex("search_text", (q) => {
          const searched = q.search("searchText", search);
          return filters.status ? searched.eq("status", filters.status) : searched;
        });

      if (filters.from || filters.to) {
        searchQuery = searchQuery.filter((q) => {
          const dateField = filters.dateField || "checkIn";
          const field: "createdAt" | "checkIn" | "checkOut" =
            dateField === "createdAt" ? "createdAt" : dateField === "checkOut" ? "checkOut" : "checkIn";
          const conditions = [];
          if (filters.from) conditions.push(q.gte(q.field(field), filters.from));
          if (filters.to) conditions.push(q.lte(q.field(field), filters.to));
          return q.and(...conditions);
        });
      }

      const result = await searchQuery.paginate(args.paginationOpts);
      return {
        ...result,
        page: result.page.map((row: any) => normalizeTicket(row.data)).filter((ticket: any) => filterTicket(ticket, filters)),
      };
    }

    const result = await applyTicketFilters(
      ctx.db.query("tickets").withIndex("by_createdAt").order("desc"),
      filters
    ).paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((row: any) => normalizeTicket(row.data)),
    };
  },
});

export const listFilteredForExport = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    dateField: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const search = args.search?.trim();
    const status = args.status?.trim();
    const filters = {
      status: status && status !== "all" ? status : undefined,
      dateField: args.dateField,
      from: args.from?.trim() || undefined,
      to: args.to?.trim() || undefined,
    };

    const rows = search
      ? await ctx.db
          .query("tickets")
          .withSearchIndex("search_text", (q) => {
            const searched = q.search("searchText", search);
            return filters.status ? searched.eq("status", filters.status) : searched;
          })
          .take(5000)
      : await applyTicketFilters(ctx.db.query("tickets").withIndex("by_createdAt").order("desc"), filters).take(5000);

    return rows
      .map((row: any) => normalizeTicket(row.data))
      .filter((ticket: any) => filterTicket(ticket, filters))
      .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await ctx.db
      .query("tickets")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", id))
      .first();
    return row ? normalizeTicket(row.data) : null;
  },
});

export const listUnavailable = query({
  args: { excludeId: v.optional(v.string()) },
  handler: async (ctx, { excludeId }) => {
    const rows = await ctx.db.query("tickets").collect();
    return rows
      .map((row) => normalizeTicket(row.data))
      .filter((ticket) =>
        ticket?.id !== excludeId &&
        ["PAYMENT VERIFIED", "BOOKING CONFIRMED"].includes(ticket?.status) &&
        dateStamp(ticket?.checkIn) &&
        dateStamp(ticket?.checkOut)
      )
      .map((ticket) => ({ checkIn: dateStamp(ticket.checkIn), checkOut: dateStamp(ticket.checkOut) }));
  },
});

export const getPaymentOptions = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", id)).first();
    if (!row) return null;
    const ticket = normalizeTicket(row.data);
    if (ticket.status !== "PRICE SENT") return { available: false, methods: [], reason: "Ticket is not ready for payment" };
    if (!quoteIsActive(ticket)) return { available: false, methods: [], reason: "Quote expired or requires staff refresh" };
    if (await hasPaymentConflict(ctx, ticket, row._id)) return { available: false, methods: [], reason: "These dates are no longer available for payment" };
    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const settings = settingsRow?.data || {};
    const termsVersion = String(settings.saraTermsVersion || "");
    const terms = termsVersion
      ? await ctx.db.query("termsVersions").withIndex("by_version", (q) => q.eq("version", termsVersion)).first()
      : null;
    if (!terms) return { available: false, methods: [], reason: "Booking Terms are not published" };
    const termsAccepted = Boolean(ticket.termsAcceptedAt && ticket.termsVersion === termsVersion && ticket.termsAcceptedHash === terms.contentHash);
    const configuredMethods = (settings.paymentMethods || []).filter((method: any) => method?.hidden !== true && method?.name && String(method?.instructions || "").trim());
    if (!configuredMethods.length) return { available: false, methods: [], reason: "Payment methods are not configured" };
    return {
      available: true,
      methods: configuredMethods.map((method: any) => ({
        name: String(method.name),
        ...(termsAccepted ? { instructions: String(method.instructions || "") } : {}),
      })),
      cleaningFee: Number(settings.cleaningFee) || 0,
      termsVersion,
      termsContent: terms.content,
      termsContentHash: terms.contentHash,
      termsAccepted,
    };
  },
});

export const acceptGuestTerms = mutation({
  args: { id: v.string(), termsVersion: v.string(), termsHash: v.string(), acceptedText: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.id)).first();
    if (!row) throw new Error("Ticket not found");
    const ticket = normalizeTicket(row.data);
    if (ticket.status !== "PRICE SENT") throw new Error("Terms can only be accepted for a priced ticket");
    await assertPayable(ctx, ticket, row._id);
    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const currentVersion = String(settingsRow?.data?.saraTermsVersion || "");
    const terms = currentVersion ? await ctx.db.query("termsVersions").withIndex("by_version", (q) => q.eq("version", currentVersion)).first() : null;
    if (!terms || args.termsVersion !== currentVersion || args.termsHash !== terms.contentHash) throw new Error("Review the current published Terms");
    const expectedText = `I agree to the Terms (${currentVersion}).`;
    if (args.acceptedText !== expectedText) throw new Error("Explicit Terms acceptance is required");
    const now = new Date().toISOString();
    const updated = {
      ...ticket,
      termsAcceptedAt: now,
      termsVersion: currentVersion,
      termsAcceptedText: expectedText,
      termsAcceptedHash: terms.contentHash,
      termsAcceptanceSource: "public_payment_dialog",
    };
    await ctx.db.patch(row._id, { data: updated, updatedAt: now, ...ticketIndexFields(updated) });
    const idempotencyKey = `public-terms:${args.id}:${currentVersion}:${ticket.quoteExpiresAt}`;
    const existingEvent = await ctx.db.query("reservationEvents").withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey)).first();
    if (!existingEvent) {
      await ctx.db.insert("reservationEvents", {
        ticketId: args.id,
        type: "terms_accepted",
        actorType: "guest",
        idempotencyKey,
        payload: { termsVersion: currentVersion, termsHash: terms.contentHash, source: "public_payment_dialog" },
        createdAt: now,
      });
    }
    return updated;
  },
});

export const registerPaymentProofKey = mutation({
  args: { id: v.string(), key: v.string(), contentType: v.string(), serviceKey: v.string() },
  handler: async (ctx, args) => {
    if (!isAutomationKey(args.serviceKey)) throw new Error("Invalid automation credential");
    if (!args.key.startsWith(`payment-proofs/${args.id}/`)) throw new Error("Invalid payment proof key");
    const ticketRow = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.id)).first();
    if (!ticketRow) throw new Error("Ticket is not accepting payment proof");
    const ticket = normalizeTicket(ticketRow.data);
    if (ticket.status !== "PRICE SENT") throw new Error("Ticket is not accepting payment proof");
    await assertPayable(ctx, ticket, ticketRow._id);
    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const termsVersion = String(settingsRow?.data?.saraTermsVersion || "");
    const terms = termsVersion ? await ctx.db.query("termsVersions").withIndex("by_version", (q) => q.eq("version", termsVersion)).first() : null;
    if (!terms || !ticket.termsAcceptedAt || ticket.termsVersion !== termsVersion || ticket.termsAcceptedHash !== terms.contentHash) {
      throw new Error("Accept the current Terms before uploading payment proof");
    }
    if (!args.contentType.startsWith("image/")) throw new Error("Payment proof must be an image");
    const existing = await ctx.db.query("paymentUploadReceipts").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    if (!existing) {
      const recentFloor = new Date(Date.now() - 60 * 60_000).toISOString();
      const receipts = await ctx.db.query("paymentUploadReceipts").withIndex("by_ticketId", (q) => q.eq("ticketId", args.id)).collect();
      if (receipts.filter((receipt) => !receipt.consumedAt && receipt.issuedAt >= recentFloor).length >= 5) throw new Error("Too many payment proof uploads; try again later");
      const issuedAt = new Date().toISOString();
      await ctx.db.insert("paymentUploadReceipts", {
        ticketId: args.id,
        key: args.key,
        contentType: args.contentType,
        issuedAt,
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      });
    }
    return { registered: true };
  },
});

export const confirmPaymentProofUpload = mutation({
  args: {
    id: v.string(),
    key: v.string(),
    contentType: v.string(),
    size: v.number(),
    etag: v.optional(v.string()),
    serviceKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAutomationKey(args.serviceKey)) throw new Error("Invalid automation credential");
    const receipt = await ctx.db.query("paymentUploadReceipts").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    if (!receipt || receipt.ticketId !== args.id || receipt.consumedAt) throw new Error("Payment proof receipt is invalid or already used");
    if (!receipt.expiresAt || receipt.expiresAt <= new Date().toISOString()) throw new Error("Payment proof upload receipt expired");
    if (receipt.contentType !== args.contentType || !args.contentType.startsWith("image/")) throw new Error("Payment proof content type changed during upload");
    if (!Number.isFinite(args.size) || args.size <= 0 || args.size > 10 * 1024 * 1024) throw new Error("Payment proof must be a non-empty image no larger than 10 MB");
    const uploadedAt = new Date().toISOString();
    await ctx.db.patch(receipt._id, { uploadedAt, size: args.size, etag: args.etag });
    return { confirmed: true, uploadedAt };
  },
});

export const submitGuestPayment = mutation({
  args: {
    id: v.string(),
    paymentMethod: v.string(),
    paymentScreenshotKey: v.string(),
    termsVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.id)).first();
    if (!row) throw new Error("Ticket not found");
    const current = normalizeTicket(row.data);
    if (current.status !== "PRICE SENT") throw new Error("This ticket is not accepting payment submissions");
    await assertPayable(ctx, current, row._id);
    if (!args.paymentScreenshotKey.startsWith(`payment-proofs/${args.id}/`)) throw new Error("Payment proof does not belong to this ticket");

    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const settings = settingsRow?.data || {};
    const expectedTermsVersion = String(settings.saraTermsVersion || "");
    if (!expectedTermsVersion) throw new Error("Booking Terms are not published");
    if (args.termsVersion !== expectedTermsVersion) throw new Error("Terms changed; review and accept the current version");
    const terms = await ctx.db.query("termsVersions").withIndex("by_version", (q) => q.eq("version", expectedTermsVersion)).first();
    if (!terms || !current.termsAcceptedAt || current.termsVersion !== expectedTermsVersion || current.termsAcceptedHash !== terms.contentHash) {
      throw new Error("Accept the current Terms before submitting payment");
    }
    const method = (settings.paymentMethods || []).find((option: any) => option?.hidden !== true && option?.name === args.paymentMethod && String(option?.instructions || "").trim());
    if (!method) throw new Error("Payment method is not available");
    const receipt = await ctx.db.query("paymentUploadReceipts").withIndex("by_key", (q) => q.eq("key", args.paymentScreenshotKey)).first();
    if (!receipt || receipt.ticketId !== args.id || receipt.consumedAt || !receipt.uploadedAt || !receipt.expiresAt || receipt.expiresAt <= new Date().toISOString()) {
      throw new Error("Payment proof upload receipt is invalid, unconfirmed, expired, or already used");
    }

    const now = new Date().toISOString();
    const updated = {
      ...current,
      status: "PAYMENT SUBMITTED",
      paymentMethod: args.paymentMethod,
      paymentDate: now.slice(0, 10),
      paymentScreenshot: null,
      paymentScreenshotKey: args.paymentScreenshotKey,
    };
    await ctx.db.patch(row._id, { data: updated, updatedAt: now, ...ticketIndexFields(updated) });
    await ctx.db.patch(receipt._id, { consumedAt: now });
    await ctx.db.insert("reservationEvents", {
      ticketId: args.id,
      type: "payment_submitted",
      actorType: "guest",
      idempotencyKey: `public-payment:${args.id}:${args.paymentScreenshotKey}`,
      payload: { paymentMethod: args.paymentMethod, termsVersion: expectedTermsVersion, proofKey: args.paymentScreenshotKey },
      createdAt: now,
    });
    if (updated.conversationId) {
      const conversation = await ctx.db.query("conversations").withIndex("by_publicId", (q) => q.eq("publicId", String(updated.conversationId))).first();
      if (conversation) {
        const smsOptedOut = conversation.channel === "sms" && conversation.externalParticipant
          ? (await getSmsConsent(ctx, conversation.externalParticipant)).optedOut
          : false;
        await ctx.db.patch(conversation._id, {
          stage: "payment_submitted",
          status: smsOptedOut ? "closed" : "waiting_for_staff",
          aiEnabled: false,
          controlVersion: (conversation.controlVersion || 0) + 1,
          updatedAt: now,
        });
      }
    }
    return updated;
  },
});

const ticketStatusSmsEvent = v.union(
  v.literal("priceSent"),
  v.literal("paymentSubmitted"),
  v.literal("paymentVerified"),
  v.literal("bookingConfirmed")
);

function ticketStatusSmsConfig(event: string) {
  const configs: Record<string, any> = {
    priceSent: { status: "PRICE SENT", label: "Price sent", prefix: "priceSent", enabledKey: "priceSentSmsEnabled", templatesKey: "priceSentSmsTemplates", templateIdKey: "priceSentSmsTemplateId" },
    paymentSubmitted: { status: "PAYMENT SUBMITTED", label: "Payment submitted", prefix: "paymentSubmitted", enabledKey: "paymentSubmittedSmsEnabled", templatesKey: "paymentSubmittedSmsTemplates", templateIdKey: "paymentSubmittedSmsTemplateId" },
    paymentVerified: { status: "PAYMENT VERIFIED", label: "Payment verified", prefix: "paymentVerified", enabledKey: "paymentVerifiedSmsEnabled", templatesKey: "paymentVerifiedSmsTemplates", templateIdKey: "paymentVerifiedSmsTemplateId" },
    bookingConfirmed: { status: "BOOKING CONFIRMED", label: "Booking confirmed", prefix: "bookingConfirmed", enabledKey: "bookingConfirmedSmsEnabled", templatesKey: "bookingConfirmedSmsTemplates", templateIdKey: "bookingConfirmedSmsTemplateId" },
  };
  return configs[event];
}

export const claimTicketStatusSms = mutation({
  args: { id: v.string(), event: ticketStatusSmsEvent, serviceKey: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    if (!isAutomationKey(args.serviceKey)) throw new Error("Invalid automation credential");
    const config = ticketStatusSmsConfig(args.event);
    const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.id)).first();
    if (!row) throw new Error("Ticket not found");
    const ticket: any = normalizeTicket(row.data);
    const sentAtKey = `${config.prefix}SmsSentAt`;
    const claimedAtKey = `${config.prefix}SmsClaimedAt`;
    if (ticket.status !== config.status) return { claimed: false, reason: `Ticket is not ${config.status}`, ticket };
    if (ticket[sentAtKey]) return { claimed: false, reason: `${config.label} SMS already sent`, ticket };
    if (ticket[claimedAtKey]) return { claimed: false, reason: `${config.label} SMS delivery is already claimed`, ticket };
    const phone = normalizeSmsPhone(ticket.phone || "");
    if (phone !== normalizeSmsPhone(args.phone) || !/^\+[1-9]\d{1,14}$/.test(phone)) return { claimed: false, reason: "Ticket phone changed or is invalid", ticket };
    const consent = await getSmsConsent(ctx, phone);
    if (consent.optedOut) return { claimed: false, reason: "Guest opted out of SMS", ticket };
    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const settings: any = settingsRow?.data || {};
    if (!settings[config.enabledKey]) return { claimed: false, reason: `${config.label} guest SMS is disabled`, ticket };
    const allowlisted = (settings.saraSmsAllowlist || []).some((allowed: string) => normalizeSmsPhone(allowed) === phone);
    if (settings.saraSmsTestMode !== false && !allowlisted) return { claimed: false, reason: "Guest is not on the SMS test allowlist", ticket };
    const claimedAt = new Date().toISOString();
    const claimToken = crypto.randomUUID();
    const updated: any = {
      ...ticket,
      [claimedAtKey]: claimedAt,
      [`${config.prefix}SmsClaimToken`]: claimToken,
      [`${config.prefix}SmsSettingsUpdatedAt`]: settingsRow?.updatedAt || "",
      [`${config.prefix}SmsConsentVersion`]: consent.version,
      [`${config.prefix}SmsError`]: null,
    };
    await ctx.db.patch(row._id, { data: updated, updatedAt: claimedAt, ...ticketIndexFields(updated) });
    return {
      claimed: true,
      claimToken,
      phone,
      ticket: updated,
      smsSettings: {
        templates: settings[config.templatesKey],
        templateId: settings[config.templateIdKey],
        legacyTemplate: args.event === "priceSent" ? settings.priceSentSmsTemplate : undefined,
      },
    };
  },
});

export const confirmTicketStatusSmsClaim = mutation({
  args: { id: v.string(), event: ticketStatusSmsEvent, serviceKey: v.string(), claimToken: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    if (!isAutomationKey(args.serviceKey)) throw new Error("Invalid automation credential");
    const config = ticketStatusSmsConfig(args.event);
    const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.id)).first();
    if (!row) throw new Error("Ticket not found");
    const ticket: any = normalizeTicket(row.data);
    const claimTokenKey = `${config.prefix}SmsClaimToken`;
    const claimedAtKey = `${config.prefix}SmsClaimedAt`;
    const settingsUpdatedAtKey = `${config.prefix}SmsSettingsUpdatedAt`;
    const consentVersionKey = `${config.prefix}SmsConsentVersion`;
    const sentAtKey = `${config.prefix}SmsSentAt`;
    let reason = "";
    const phone = normalizeSmsPhone(ticket.phone || "");
    if (ticket[claimTokenKey] !== args.claimToken) reason = `${config.label} SMS claim was superseded`;
    else if (ticket.status !== config.status || ticket[sentAtKey]) reason = `Ticket is no longer accepting a ${config.label.toLowerCase()} SMS`;
    else if (row.updatedAt !== ticket[claimedAtKey]) reason = `Ticket changed while the ${config.label.toLowerCase()} SMS was being prepared`;
    else if (phone !== normalizeSmsPhone(args.phone)) reason = "Ticket phone changed before delivery";
    const consent = await getSmsConsent(ctx, phone);
    if (!reason && consent.optedOut) reason = "Guest opted out of SMS before delivery";
    if (!reason && consent.version !== ticket[consentVersionKey]) reason = "Guest SMS consent changed before delivery";
    const settingsRow = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).first();
    const settings: any = settingsRow?.data || {};
    if (!reason && (settingsRow?.updatedAt || "") !== ticket[settingsUpdatedAtKey]) reason = "SMS settings changed while the message was being prepared";
    if (!reason && !settings[config.enabledKey]) reason = `${config.label} guest SMS was disabled before delivery`;
    const allowlisted = (settings.saraSmsAllowlist || []).some((allowed: string) => normalizeSmsPhone(allowed) === phone);
    if (!reason && settings.saraSmsTestMode !== false && !allowlisted) reason = "Guest was removed from the SMS test allowlist";
    if (reason) {
      const updated: any = { ...ticket, [`${config.prefix}SmsError`]: reason };
      delete updated[claimedAtKey];
      delete updated[claimTokenKey];
      delete updated[settingsUpdatedAtKey];
      delete updated[consentVersionKey];
      await ctx.db.patch(row._id, { data: updated, updatedAt: new Date().toISOString(), ...ticketIndexFields(updated) });
      return { confirmed: false, reason };
    }
    return { confirmed: true, phone };
  },
});

export const finishTicketStatusSms = mutation({
  args: {
    id: v.string(),
    event: ticketStatusSmsEvent,
    serviceKey: v.string(),
    claimToken: v.string(),
    accepted: v.boolean(),
    retryable: v.optional(v.boolean()),
    providerMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isAutomationKey(args.serviceKey)) throw new Error("Invalid automation credential");
    const config = ticketStatusSmsConfig(args.event);
    const row = await ctx.db.query("tickets").withIndex("by_ticketId", (q) => q.eq("ticketId", args.id)).first();
    if (!row) throw new Error("Ticket not found");
    const claimTokenKey = `${config.prefix}SmsClaimToken`;
    if (row.data[claimTokenKey] !== args.claimToken) return row.data;
    const now = new Date().toISOString();
    const updated: any = {
      ...row.data,
      ...(args.accepted ? { [`${config.prefix}SmsSentAt`]: now, [`${config.prefix}SmsMessageId`]: args.providerMessageId || null } : {}),
      [`${config.prefix}SmsError`]: args.error || null,
    };
    if (args.accepted || args.retryable) {
      delete updated[`${config.prefix}SmsClaimedAt`];
      delete updated[claimTokenKey];
      delete updated[`${config.prefix}SmsSettingsUpdatedAt`];
      delete updated[`${config.prefix}SmsConsentVersion`];
    } else if (!args.accepted) {
      updated[`${config.prefix}SmsDeliveryUnknownAt`] = now;
    }
    await ctx.db.patch(row._id, { data: updated, updatedAt: now, ...ticketIndexFields(updated) });
    return updated;
  },
});

export const create = mutation({
  args: { data: v.any(), serviceKey: v.optional(v.string()) },
  handler: async (ctx, { data, serviceKey }) => {
    const now = new Date().toISOString();
    const trusted = isAutomationKey(serviceKey) || await isStaff(ctx);
    const normalizedData = trusted ? normalizeTicket(data) : await publicQuote(ctx, data);
    let ticket = {
      ...normalizedData,
      id: crypto.randomUUID(),
      createdAt: now,
    };
    if (ticket.status === "PRICE SENT" && (!Number.isFinite(Number(ticket.rateOffered)) || Number(ticket.rateOffered) <= 0)) {
      throw new Error("PRICE SENT requires a positive offered price");
    }
    if (ticket.status === "PRICE SENT" && !ticket.quoteExpiresAt) ticket = { ...ticket, quoteExpiresAt: await quoteExpiry(ctx) };
    await ensureFinalStayAvailable(ctx, ticket);

    await ctx.db.insert("tickets", {
      ticketId: ticket.id,
      data: ticket,
      createdAt: ticket.createdAt,
      updatedAt: now,
      ...ticketIndexFields(ticket),
    });

    return ticket;
  },
});

export const update = mutation({
  args: { id: v.string(), data: v.any(), serviceKey: v.optional(v.string()) },
  handler: async (ctx, { id, data, serviceKey }) => {
    const row = await ctx.db
      .query("tickets")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", id))
      .first();

    if (!row) {
      throw new Error("Ticket not found");
    }

    const serviceRequest = isAutomationKey(serviceKey);
    const trusted = serviceRequest || await isStaff(ctx);
    if (!trusted) throw new Error("Guest updates must use the ticket-scoped payment operation");
    let allowedData = data;
    const currentTicket = normalizeTicket(row.data);
    const numericQuoteFields = new Set(["retailPrice", "adjustment", "rateOffered", "discountPct"]);
    const quoteInputsChanged = ["retailPrice", "adjustment", "rateOffered", "discountPct", "checkIn", "checkOut", "roomType"].some((field) => {
      if (!Object.prototype.hasOwnProperty.call(data || {}, field)) return false;
      if (["checkIn", "checkOut"].includes(field)) return dateStamp(data[field]) !== dateStamp(currentTicket[field]);
      if (numericQuoteFields.has(field)) return Number(data[field] ?? 0) !== Number(currentTicket[field] ?? 0);
      return String(data[field] || "") !== String(currentTicket[field] || "");
    });
    const targetStatus = normalizeTicket({ ...row.data, ...data })?.status;
    const targetTicket = normalizeTicket({ ...row.data, ...data });
    if (targetStatus === "PRICE SENT" && (!Number.isFinite(Number(targetTicket.rateOffered)) || Number(targetTicket.rateOffered) <= 0)) {
      throw new Error("PRICE SENT requires a positive offered price");
    }
    if (PAYMENT_BLOCKING_STATUSES.has(currentTicket.status) && targetStatus !== "CANCELLED" && (STATUS_RANK[targetStatus] ?? -1) < (STATUS_RANK[currentTicket.status] ?? -1)) {
      throw new Error("This ticket changed after the form loaded; refresh before saving");
    }
    if (PAYMENT_BLOCKING_STATUSES.has(currentTicket.status) && quoteInputsChanged) throw new Error("Paid or submitted tickets must be explicitly cancelled before requoting");
    if (trusted && targetStatus === "PRICE SENT" && (currentTicket.status !== "PRICE SENT" || quoteInputsChanged) && !data.quoteExpiresAt) {
      allowedData = {
        ...allowedData,
        quoteExpiresAt: await quoteExpiry(ctx),
      };
    }
    const updated = normalizeTicket({ ...row.data, ...allowedData, id });

    if (trusted && quoteInputsChanged && !PAYMENT_BLOCKING_STATUSES.has(currentTicket.status)) {
      for (const field of ["termsAcceptedAt", "termsVersion", "termsAcceptedText", "termsAcceptedHash", "termsAcceptedMessageId", "termsAcceptanceSource"]) delete updated[field];
    }
    await ensureFinalStayAvailable(ctx, updated, row._id);

    const now = new Date().toISOString();
    await ctx.db.patch(row._id, {
      data: updated,
      updatedAt: now,
      ...ticketIndexFields(updated),
    });

    if (updated.conversationId) {
      const conversation = await ctx.db.query("conversations").withIndex("by_publicId", (q) => q.eq("publicId", String(updated.conversationId))).first();
      if (conversation) {
        const smsOptedOut = conversation.channel === "sms" && conversation.externalParticipant
          ? (await getSmsConsent(ctx, conversation.externalParticipant)).optedOut
          : false;
        const stages: Record<string, "quote_requested" | "price_sent" | "payment_submitted" | "payment_verified" | "booking_confirmed"> = {
          "QUOTE REQUESTED": "quote_requested",
          "PRICE SENT": "price_sent",
          "PAYMENT SUBMITTED": "payment_submitted",
          "PAYMENT VERIFIED": "payment_verified",
          "BOOKING CONFIRMED": "booking_confirmed",
        };
        const stage = stages[updated.status];
        const controlChanged = quoteInputsChanged || updated.status !== currentTicket.status;
        await ctx.db.patch(conversation._id, {
          ...(stage ? { stage } : {}),
          status: smsOptedOut
            ? "closed"
            : ["QUOTE REQUESTED", "PAYMENT SUBMITTED", "PAYMENT VERIFIED"].includes(updated.status)
            ? "waiting_for_staff"
            : updated.status === "CANCELLED"
              ? "closed"
              : "waiting_for_guest",
          aiEnabled: !smsOptedOut && updated.status !== "CANCELLED" && conversation.aiEnabled,
          ...(controlChanged ? { controlVersion: (conversation.controlVersion || 0) + 1 } : {}),
          ...(quoteInputsChanged ? {
            termsVersion: undefined,
            termsPresentedVersion: undefined,
            termsPresentedAt: undefined,
            termsPresentedMessageId: undefined,
            termsPresentedHash: undefined,
            termsAcceptedAt: undefined,
            termsAcceptedMessageId: undefined,
          } : {}),
          updatedAt: now,
        });
      }
    }

    if (updated.status !== currentTicket.status) {
      await ctx.db.insert("reservationEvents", {
        ticketId: id,
        type: "status_changed",
        actorType: trusted ? (serviceRequest ? "automation" : "staff") : "guest",
        payload: { fromStatus: currentTicket.status, toStatus: updated.status },
        createdAt: now,
      });
    }
    return updated;
  },
});

export const remove = mutation({
  args: { id: v.string(), serviceKey: v.optional(v.string()) },
  handler: async (ctx, { id, serviceKey }) => {
    await requireStaffOrAutomation(ctx, serviceKey);
    const row = await ctx.db
      .query("tickets")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", id))
      .first();
    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});

export const importLegacy = mutation({
  args: { tickets: v.array(v.any()) },
  handler: async (ctx, { tickets }) => {
    await requireStaff(ctx);
    const now = new Date().toISOString();
    let imported = 0;

    for (const ticket of tickets) {
      if (!ticket?.id) continue;
      const existing = await ctx.db
        .query("tickets")
        .withIndex("by_ticketId", (q) => q.eq("ticketId", ticket.id))
        .first();
      let importedTicket = normalizeTicket({ ...(existing?.data || {}), ...ticket });
      if (importedTicket.status === "PRICE SENT" && !importedTicket.quoteExpiresAt) {
        const created = new Date(importedTicket.createdAt || now);
        importedTicket = { ...importedTicket, quoteExpiresAt: await quoteExpiry(ctx, Number.isNaN(created.getTime()) ? new Date() : created) };
      }
      await ensureFinalStayAvailable(ctx, importedTicket, existing?._id);

      if (existing) {
        await ctx.db.patch(existing._id, {
          data: importedTicket,
          ...ticketIndexFields(importedTicket),
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("tickets", {
          ticketId: ticket.id,
          data: importedTicket,
          createdAt: ticket.createdAt || now,
          updatedAt: now,
          ...ticketIndexFields(importedTicket),
        });
      }
      imported += 1;
    }

    return { imported };
  },
});

export const backfillIndexFields = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("tickets").collect();
    for (const row of rows) {
      await ctx.db.patch(row._id, ticketIndexFields(row.data));
    }
    return { updated: rows.length };
  },
});
