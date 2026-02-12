import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

// ── Log a single interaction event ─────────────────────────────────
export const log = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.optional(v.id("conversationSessions")),
    deviceId: v.string(),
    eventType: v.string(),
    target: v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("interactionEvents", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// ── Batch log interaction events ───────────────────────────────────
export const batchLog = mutation({
  args: {
    events: v.array(
      v.object({
        userId: v.id("users"),
        sessionId: v.optional(v.id("conversationSessions")),
        deviceId: v.string(),
        eventType: v.string(),
        target: v.string(),
        metadata: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const event of args.events) {
      await ctx.db.insert("interactionEvents", event);
    }
  },
});

// ── Get interactions by session ────────────────────────────────────
export const getBySession = query({
  args: {
    sessionId: v.id("conversationSessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("interactionEvents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(limit);
  },
});

// ── Get recent interactions (admin) ────────────────────────────────
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    
    if (args.eventType) {
      return await ctx.db
        .query("interactionEvents")
        .withIndex("by_eventType", (q) => q.eq("eventType", args.eventType!))
        .order("desc")
        .take(limit);
    }
    
    return await ctx.db
      .query("interactionEvents")
      .order("desc")
      .take(limit);
  },
});

// ── Get interaction statistics (admin dashboard) ───────────────────
export const getStats = query({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("interactionEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .collect();
    
    // Count by event type
    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    }
    
    return {
      total: events.length,
      byType: counts,
      copyCount: counts["copy"] || 0,
      regenerateCount: counts["regenerate"] || 0,
      likeCount: counts["like"] || 0,
      dislikeCount: counts["dislike"] || 0,
      editCount: counts["edit"] || 0,
      errorCount: counts["error"] || 0,
    };
  },
});

// ── Get interactions by user ───────────────────────────────────────
export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("interactionEvents")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// ── Internal: Get old interactions for cleanup ─────────────────────
export const getOlderThan = internalQuery({
  args: {
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interactionEvents")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", args.timestamp))
      .take(100);
  },
});

// ── Internal: Remove interaction ───────────────────────────────────
export const remove = internalMutation({
  args: {
    id: v.id("interactionEvents"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Count interactions in time range ───────────────────────────────
export const countInRange = query({
  args: {
    since: v.number(),
    until: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const until = args.until ?? Date.now();
    
    const events = await ctx.db
      .query("interactionEvents")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.since).lte("timestamp", until)
      )
      .collect();
    
    return events.length;
  },
});

// ── Get hourly interaction breakdown ───────────────────────────────
export const getHourlyBreakdown = query({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("interactionEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .collect();
    
    // Group by hour
    const hourlyData: Record<number, Record<string, number>> = {};
    
    for (const event of events) {
      const hour = new Date(event.timestamp).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = {};
      }
      hourlyData[hour][event.eventType] = (hourlyData[hour][event.eventType] || 0) + 1;
    }
    
    return hourlyData;
  },
});
