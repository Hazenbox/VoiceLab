import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./_auth";

// ── Get a config value by key ────────────────────────────────────
// Read operations are public - config values are not sensitive
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("adminConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!config) return null;

    try {
      return { ...config, parsedValue: JSON.parse(config.value) };
    } catch {
      return { ...config, parsedValue: config.value };
    }
  },
});

// ── Set a config value ───────────────────────────────────────────
// ADMIN ONLY: Requires leadership role
export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(), // JSON stringified
    updatedBy: v.optional(v.string()), // deviceId of admin making the change
  },
  handler: async (ctx, args) => {
    // Verify admin authorization
    await requireAdmin(ctx, args.updatedBy);

    const existing = await ctx.db
      .query("adminConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
      return existing._id;
    }

    return await ctx.db.insert("adminConfig", {
      key: args.key,
      value: args.value,
      updatedAt: now,
      updatedBy: args.updatedBy,
    });
  },
});

// ── Get all config values (admin) ────────────────────────────────
// Read operations are public for simplicity
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("adminConfig").collect();
    return configs.map((config) => {
      try {
        return { ...config, parsedValue: JSON.parse(config.value) };
      } catch {
        return { ...config, parsedValue: config.value };
      }
    });
  },
});
