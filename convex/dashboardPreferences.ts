import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const row = await ctx.db
      .query("dashboardPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return row?.data ?? null;
  },
});

export const save = mutation({
  args: { preferences: v.any() },
  handler: async (ctx, { preferences }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const now = new Date().toISOString();
    const row = await ctx.db
      .query("dashboardPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (row) {
      await ctx.db.patch(row._id, { data: preferences, updatedAt: now });
    } else {
      await ctx.db.insert("dashboardPreferences", { userId, data: preferences, updatedAt: now });
    }

    return preferences;
  },
});
