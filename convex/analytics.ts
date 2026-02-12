import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Log a single analytics event ─────────────────────────────────
export const logEvent = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    eventType: v.string(),
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.string(),
    trustScore: v.optional(v.number()),
    violationCount: v.optional(v.number()),
    topViolations: v.optional(v.array(v.string())),
    userAction: v.optional(v.string()),
    tokenCount: v.optional(v.number()),
    llmProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analyticsEvents", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// ── Batch log events (for flushing sync queue) ───────────────────
export const batchLogEvents = mutation({
  args: {
    events: v.array(
      v.object({
        userId: v.id("users"),
        deviceId: v.string(),
        eventType: v.string(),
        ecosystem: v.string(),
        channel: v.string(),
        persona: v.string(),
        trustScore: v.optional(v.number()),
        violationCount: v.optional(v.number()),
        topViolations: v.optional(v.array(v.string())),
        userAction: v.optional(v.string()),
        tokenCount: v.optional(v.number()),
        llmProvider: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const event of args.events) {
      await ctx.db.insert("analyticsEvents", event);
    }
  },
});

// ── Get recent events (admin) ────────────────────────────────────
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.eventType) {
      return await ctx.db
        .query("analyticsEvents")
        .withIndex("by_eventType", (q) => q.eq("eventType", args.eventType!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("analyticsEvents")
      .order("desc")
      .take(limit);
  },
});

// ── Get events in a time range (admin analytics) ─────────────────
export const getInRange = query({
  args: {
    since: v.number(),
    until: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 500;
    const until = args.until ?? Date.now();

    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.since).lte("timestamp", until)
      )
      .order("desc")
      .take(limit);

    return events;
  },
});

// ── Count generations today (admin dashboard) ────────────────────
export const countGenerationsToday = query({
  args: {},
  handler: async (ctx) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", startOfDay.getTime())
      )
      .take(10000); // Hard limit for performance

    return events.filter((e) => e.eventType === "generation").length;
  },
});

// ── Average trust score (admin dashboard) ────────────────────────
export const averageTrustScore = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5000; // Default limit for performance
    
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .take(limit);

    const withScores = events.filter(
      (e) => e.trustScore !== undefined && e.trustScore !== null
    );

    if (withScores.length === 0) return null;

    const sum = withScores.reduce((acc, e) => acc + (e.trustScore ?? 0), 0);
    return {
      average: Math.round((sum / withScores.length) * 10) / 10,
      count: withScores.length,
    };
  },
});

// ── Top violations (admin dashboard) ─────────────────────────────
export const topViolations = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
    eventsLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const eventsLimit = args.eventsLimit ?? 5000; // Default limit for performance

    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .take(eventsLimit);

    const violationCounts: Record<string, number> = {};
    for (const event of events) {
      if (event.topViolations) {
        for (const viol of event.topViolations) {
          violationCounts[viol] = (violationCounts[viol] || 0) + 1;
        }
      }
    }

    return Object.entries(violationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([violation, count]) => ({ violation, count }));
  },
});
