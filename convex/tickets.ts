import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";

const legacyStatusMap: Record<string, string> = {
  QUOTE: "QUOTE REQUESTED",
  PENDING: "PRICE SENT",
  "PAYMENT RECEIVED": "PAYMENT SUBMITTED",
  CONFIRMED: "PAYMENT VERIFIED",
  COMPLETED: "BOOKING CONFIRMED",
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

export const list = query({
  args: {},
  handler: async (ctx) => {
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

export const create = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = new Date().toISOString();
    const ticket = {
      id: crypto.randomUUID(),
      createdAt: now,
      ...normalizeTicket(data),
    };

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
  args: { id: v.string(), data: v.any() },
  handler: async (ctx, { id, data }) => {
    const row = await ctx.db
      .query("tickets")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", id))
      .first();

    if (!row) {
      throw new Error("Ticket not found");
    }

    const updated = normalizeTicket({ ...row.data, ...data, id });
    await ctx.db.patch(row._id, {
      data: updated,
      updatedAt: new Date().toISOString(),
      ...ticketIndexFields(updated),
    });
    return updated;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
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
    const now = new Date().toISOString();
    let imported = 0;

    for (const ticket of tickets) {
      if (!ticket?.id) continue;
      const existing = await ctx.db
        .query("tickets")
        .withIndex("by_ticketId", (q) => q.eq("ticketId", ticket.id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          data: normalizeTicket({ ...existing.data, ...ticket }),
          ...ticketIndexFields({ ...existing.data, ...ticket }),
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("tickets", {
          ticketId: ticket.id,
          data: normalizeTicket(ticket),
          createdAt: ticket.createdAt || now,
          updatedAt: now,
          ...ticketIndexFields(ticket),
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
    const rows = await ctx.db.query("tickets").collect();
    for (const row of rows) {
      await ctx.db.patch(row._id, ticketIndexFields(row.data));
    }
    return { updated: rows.length };
  },
});
