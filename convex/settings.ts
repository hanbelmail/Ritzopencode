import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const SETTINGS_KEY = "main";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();
    return row?.data ?? null;
  },
});

export const save = mutation({
  args: { settings: v.any() },
  handler: async (ctx, { settings }) => {
    const now = new Date().toISOString();
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();

    if (row) {
      await ctx.db.patch(row._id, { data: settings, updatedAt: now });
    } else {
      await ctx.db.insert("settings", { key: SETTINGS_KEY, data: settings, updatedAt: now });
    }

    return settings;
  },
});
