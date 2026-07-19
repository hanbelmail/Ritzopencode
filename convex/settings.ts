import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAutomationKey, isServiceKey, isStaff, requireStaff } from "./security";

const SETTINGS_KEY = "main";

const PUBLIC_SETTING_KEYS = new Set([
  "appName",
  "defaultRetailPrice",
  "cleaningFee",
  "discountTiers",
  "hotelName",
  "hotelAddress",
  "homePageVariant",
  "roomTypes",
  "saraWebEnabled",
  "saraAgentName",
]);

function publicSettings(settings: any) {
  if (!settings || typeof settings !== "object") return settings;
  return Object.fromEntries(Object.entries(settings).filter(([key]) => PUBLIC_SETTING_KEYS.has(key)));
}

async function contentHash(content: string) {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const get = query({
  args: { serviceKey: v.optional(v.string()) },
  handler: async (ctx, { serviceKey }) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();
    const settings = row?.data ?? null;
    if (isServiceKey(serviceKey) || isAutomationKey(serviceKey) || await isStaff(ctx)) return settings;
    return publicSettings(settings);
  },
});

export const save = mutation({
  args: { settings: v.any() },
  handler: async (ctx, { settings }) => {
    await requireStaff(ctx);
    const now = new Date().toISOString();
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();
    const protectedSaraSettings = row?.data
      ? Object.fromEntries(Object.entries(row.data).filter(([key]) => key.startsWith("sara")))
      : {};
    const nonSaraSettings = Object.fromEntries(Object.entries(settings || {}).filter(([key]) => !key.startsWith("sara")));
    const nextSettings = { ...nonSaraSettings, ...protectedSaraSettings };

    if (row) {
      await ctx.db.patch(row._id, { data: nextSettings, updatedAt: now });
    } else {
      await ctx.db.insert("settings", { key: SETTINGS_KEY, data: nextSettings, updatedAt: now });
    }

    return nextSettings;
  },
});

export const saveSara = mutation({
  args: {
    saraAgentName: v.string(),
    saraWebEnabled: v.boolean(),
    saraSmsEnabled: v.boolean(),
    saraSmsTestMode: v.boolean(),
    saraSmsAllowlist: v.array(v.string()),
    saraModel: v.string(),
    saraQuoteValidityDays: v.number(),
    saraMaxMessagesPerHour: v.number(),
    saraTermsVersion: v.string(),
    saraTermsContent: v.string(),
    saraInitialMessage: v.string(),
    saraHandoffMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireStaff(ctx);
    if (args.saraSmsAllowlist.some((phone) => !/^\+[1-9]\d{1,14}$/.test(phone.trim()))) {
      throw new Error("Sara SMS allowlist numbers must use E.164 format");
    }
    const now = new Date().toISOString();
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY)).first();
    const current = row?.data || {};
    const nextTermsVersion = args.saraTermsVersion.trim();
    const nextTermsContent = args.saraTermsContent.trim();
    if (nextTermsContent && !nextTermsVersion) throw new Error("Terms version is required when Terms content is published");
    if ((args.saraWebEnabled || args.saraSmsEnabled) && (!nextTermsVersion || !nextTermsContent)) {
      throw new Error("Publish versioned Terms before enabling Sara channels");
    }
    if (current.saraTermsVersion === nextTermsVersion && current.saraTermsContent && current.saraTermsContent !== nextTermsContent) {
      throw new Error("Change the Terms version before changing published Terms content");
    }
    if (nextTermsContent) {
      const hash = await contentHash(nextTermsContent);
      const existingTerms = await ctx.db.query("termsVersions").withIndex("by_version", (q) => q.eq("version", nextTermsVersion)).first();
      if (existingTerms && existingTerms.contentHash !== hash) throw new Error("This Terms version already exists with different content");
      if (!existingTerms) {
        await ctx.db.insert("termsVersions", {
          version: nextTermsVersion,
          content: nextTermsContent,
          contentHash: hash,
          publishedBy: userId,
          publishedAt: now,
        });
      }
    }
    const saraSettings = {
      saraAgentName: args.saraAgentName.trim() || "Sara",
      saraWebEnabled: args.saraWebEnabled,
      saraSmsEnabled: args.saraSmsEnabled,
      saraSmsTestMode: args.saraSmsTestMode,
      saraSmsAllowlist: Array.from(new Set(args.saraSmsAllowlist.map((phone) => phone.trim()).filter(Boolean))),
      saraModel: args.saraModel.trim(),
      saraQuoteValidityDays: Math.min(30, Math.max(1, Math.round(args.saraQuoteValidityDays))),
      saraMaxMessagesPerHour: Math.min(100, Math.max(5, Math.round(args.saraMaxMessagesPerHour))),
      saraTermsVersion: nextTermsVersion,
      saraTermsContent: nextTermsContent,
      saraInitialMessage: args.saraInitialMessage.trim(),
      saraHandoffMessage: args.saraHandoffMessage.trim(),
    };
    const settings = { ...current, ...saraSettings };
    if (row) await ctx.db.patch(row._id, { data: settings, updatedAt: now });
    else await ctx.db.insert("settings", { key: SETTINGS_KEY, data: settings, updatedAt: now });
    return settings;
  },
});
