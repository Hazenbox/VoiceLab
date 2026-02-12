import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Create a new admin session ─────────────────────────────────────
export const create = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Clean up any existing sessions for this device
    const existingSessions = await ctx.db
      .query("adminSessions")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .collect();
    
    for (const session of existingSessions) {
      await ctx.db.delete(session._id);
    }
    
    // Create new session
    return await ctx.db.insert("adminSessions", {
      token: args.token,
      deviceId: args.deviceId,
      createdAt: now,
      expiresAt: now + SESSION_DURATION_MS,
      lastUsedAt: now,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });
  },
});

// ── Verify a session token ─────────────────────────────────────────
export const verify = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (!session) {
      return { valid: false, error: "Session not found" };
    }
    
    if (session.expiresAt < Date.now()) {
      return { valid: false, error: "Session expired" };
    }
    
    return { 
      valid: true, 
      deviceId: session.deviceId,
      expiresAt: session.expiresAt,
    };
  },
});

// ── Update last used timestamp ─────────────────────────────────────
export const touch = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (!session) return false;
    
    await ctx.db.patch(session._id, {
      lastUsedAt: Date.now(),
    });
    
    return true;
  },
});

// ── Delete a session (logout) ──────────────────────────────────────
export const remove = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (session) {
      await ctx.db.delete(session._id);
      return true;
    }
    
    return false;
  },
});

// ── Clean up expired sessions ──────────────────────────────────────
// Called by cron job
export const cleanupExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("adminSessions")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(100); // Process in batches
    
    let deleted = 0;
    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
      deleted++;
    }
    
    return { deleted };
  },
});
