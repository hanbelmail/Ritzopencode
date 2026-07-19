import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { KNOWLEDGE_SEED } from "./knowledgeSeed";
import { requireServiceKey, requireStaff } from "./security";

function clean(value: string, max: number) {
  return value.trim().slice(0, max);
}

function searchText(question: string, answer: string, category: string) {
  return `${question} ${answer} ${category}`.trim();
}

export const listForStaff = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("knowledgeEntries").collect();
    return rows.sort((a, b) => a.category.localeCompare(b.category) || a.question.localeCompare(b.question));
  },
});

export const searchApproved = query({
  args: { serviceKey: v.string(), search: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    requireServiceKey(args.serviceKey);
    const now = new Date().toISOString();
    const limit = Math.min(12, Math.max(1, args.limit || 6));
    const search = args.search.trim();
    const rows = search
      ? await ctx.db
          .query("knowledgeEntries")
          .withSearchIndex("search_text", (q) => q.search("searchText", search).eq("status", "approved").eq("audience", "guest"))
          .take(limit * 2)
      : await ctx.db.query("knowledgeEntries").withIndex("by_status", (q) => q.eq("status", "approved")).take(limit * 2);
    return rows
      .filter((entry) => entry.audience === "guest" && (!entry.effectiveAt || entry.effectiveAt <= now) && (!entry.expiresAt || entry.expiresAt > now))
      .slice(0, limit)
      .map(({ slug, question, answer, category, version, source }) => ({ slug, question, answer, category, version, source }));
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("knowledgeEntries")),
    slug: v.string(),
    question: v.string(),
    answer: v.string(),
    category: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("archived")),
    audience: v.union(v.literal("guest"), v.literal("staff")),
    source: v.optional(v.string()),
    effectiveAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireStaff(ctx);
    const slug = clean(args.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), 100);
    const question = clean(args.question, 500);
    const answer = clean(args.answer, 5000);
    const category = clean(args.category, 100);
    if (!slug || !question || !answer || !category) throw new Error("Slug, question, answer, and category are required");

    const duplicate = await ctx.db.query("knowledgeEntries").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
    if (duplicate && duplicate._id !== args.id) throw new Error("Knowledge slug already exists");
    const now = new Date().toISOString();
    const current = args.id ? await ctx.db.get(args.id) : null;
    const values = {
      slug,
      question,
      answer,
      category,
      status: args.status,
      audience: args.audience,
      version: current ? current.version + 1 : 1,
      source: clean(args.source || "", 500) || undefined,
      effectiveAt: args.effectiveAt || undefined,
      expiresAt: args.expiresAt || undefined,
      searchText: searchText(question, answer, category),
      createdBy: current?.createdBy || userId,
      approvedBy: args.status === "approved" ? userId : current?.approvedBy,
      approvedAt: args.status === "approved" ? now : current?.approvedAt,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    };
    if (current) {
      await ctx.db.patch(current._id, values);
      return ctx.db.get(current._id);
    }
    const id = await ctx.db.insert("knowledgeEntries", values);
    return ctx.db.get(id);
  },
});

export const seedDrafts = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireStaff(ctx);
    const now = new Date().toISOString();
    let inserted = 0;
    for (const [slug, question, answer, category, source] of KNOWLEDGE_SEED) {
      const existing = await ctx.db.query("knowledgeEntries").withIndex("by_slug", (q) => q.eq("slug", slug)).first();
      if (existing) continue;
      await ctx.db.insert("knowledgeEntries", {
        slug,
        question,
        answer,
        category,
        status: "draft",
        audience: "guest",
        version: 1,
        source,
        searchText: searchText(question, answer, category),
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }
    return { inserted, total: KNOWLEDGE_SEED.length };
  },
});
