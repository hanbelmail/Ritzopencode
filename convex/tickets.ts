import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("tickets").collect();
    return rows
      .map((row) => row.data)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const row = await ctx.db
      .query("tickets")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", id))
      .first();
    return row?.data ?? null;
  },
});

export const create = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = new Date().toISOString();
    const ticket = {
      id: crypto.randomUUID(),
      createdAt: now,
      ...data,
    };

    await ctx.db.insert("tickets", {
      ticketId: ticket.id,
      data: ticket,
      createdAt: ticket.createdAt,
      updatedAt: now,
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

    const updated = { ...row.data, ...data, id };
    await ctx.db.patch(row._id, {
      data: updated,
      updatedAt: new Date().toISOString(),
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
          data: { ...existing.data, ...ticket },
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("tickets", {
          ticketId: ticket.id,
          data: ticket,
          createdAt: ticket.createdAt || now,
          updatedAt: now,
        });
      }
      imported += 1;
    }

    return { imported };
  },
});
