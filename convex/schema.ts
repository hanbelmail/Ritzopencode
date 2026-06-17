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
  }).index("by_ticketId", ["ticketId"]),
  settings: defineTable({
    key: v.string(),
    data: v.any(),
    updatedAt: v.string(),
  }).index("by_key", ["key"]),
});
