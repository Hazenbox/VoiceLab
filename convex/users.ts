import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Create or update a user profile ──────────────────────────────
// Called during onboarding (create) and on profile edits (update).
export const createOrUpdate = mutation({
  args: {
    deviceId: v.string(),
    name: v.string(),
    role: v.string(),
    product: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.role,
        product: args.product,
        lastSeenAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      deviceId: args.deviceId,
      name: args.name,
      role: args.role,
      product: args.product,
      createdAt: now,
      lastSeenAt: now,
    });
  },
});

// ── Get user by device ID ────────────────────────────────────────
export const getByDeviceId = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
  },
});

// ── Update last seen timestamp ───────────────────────────────────
// Called on every app start (heartbeat).
export const heartbeat = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { lastSeenAt: Date.now() });
    }
  },
});

// ── List all users (admin) ───────────────────────────────────────
export const listAll = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 500; // Default limit for performance
    return await ctx.db
      .query("users")
      .order("desc")
      .take(limit);
  },
});

// ── Get user by ID (admin) ───────────────────────────────────────
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// ── Count active users in a time range (admin analytics) ─────────
export const countActive = query({
  args: {
    since: v.number(), // Timestamp: only count users seen after this
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10000; // Default limit for performance
    const users = await ctx.db
      .query("users")
      .withIndex("by_lastSeenAt", (q) => q.gte("lastSeenAt", args.since))
      .take(limit);
    return users.length;
  },
});
