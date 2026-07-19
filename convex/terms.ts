import { v } from "convex/values";
import { query } from "./_generated/server";

export const getPublic = query({
  args: { version: v.string() },
  handler: async (ctx, { version }) => {
    const row = await ctx.db.query("termsVersions").withIndex("by_version", (q) => q.eq("version", version)).first();
    return row ? { version: row.version, content: row.content, contentHash: row.contentHash, publishedAt: row.publishedAt } : null;
  },
});
