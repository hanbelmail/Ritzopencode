import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  tickets: defineTable({
    ticketId: v.string(),
    data: v.any(),
    createdAt: v.string(),
    updatedAt: v.string(),
    status: v.optional(v.string()),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    searchText: v.optional(v.string()),
  })
    .index("by_ticketId", ["ticketId"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["status"],
    }),
  settings: defineTable({
    key: v.string(),
    data: v.any(),
    updatedAt: v.string(),
  }).index("by_key", ["key"]),
  dashboardPreferences: defineTable({
    userId: v.id("users"),
    data: v.any(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),
});
