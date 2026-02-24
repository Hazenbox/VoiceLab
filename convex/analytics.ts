import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Log a single analytics event ─────────────────────────────────
// PHASE 0: userId is now optional to allow deviceId-only logging
export const logEvent = mutation({
  args: {
    userId: v.optional(v.id("users")), // PHASE 0: Optional - deviceId can be used alone
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
    // PHASE 0: Try to resolve userId from deviceId if not provided
    let resolvedUserId = args.userId;
    if (!resolvedUserId && args.deviceId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
        .first();
      if (user) {
        resolvedUserId = user._id;
      }
    }
    
    return await ctx.db.insert("analyticsEvents", {
      ...args,
      userId: resolvedUserId, // May still be undefined if user not found
      timestamp: Date.now(),
    });
  },
});

// ── Batch log events (for flushing sync queue) ───────────────────
// Parallelized with Promise.all for better performance
// PHASE 0: userId is now optional to allow deviceId-only logging
export const batchLogEvents = mutation({
  args: {
    events: v.array(
      v.object({
        userId: v.optional(v.id("users")), // PHASE 0: Optional - deviceId can be used alone
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
        // v2: Session tracking fields
        sessionId: v.optional(v.id("conversationSessions")),
        responseTimeMs: v.optional(v.number()),
        messageSequenceNumber: v.optional(v.number()),
        wasRegeneration: v.optional(v.boolean()),
        errorType: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // PHASE 0: Build a deviceId -> userId lookup for events without userId
    const deviceIdsNeedingLookup = new Set<string>();
    for (const event of args.events) {
      if (!event.userId && event.deviceId) {
        deviceIdsNeedingLookup.add(event.deviceId);
      }
    }
    
    const userIdByDeviceId: Record<string, string | undefined> = {};
    for (const deviceId of deviceIdsNeedingLookup) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_deviceId", (q) => q.eq("deviceId", deviceId))
        .first();
      userIdByDeviceId[deviceId] = user?._id;
    }
    
    // Parallelize inserts for better throughput
    await Promise.all(
      args.events.map(event => {
        // PHASE 0: Resolve userId from deviceId if not provided
        const resolvedUserId = event.userId || userIdByDeviceId[event.deviceId];
        return ctx.db.insert("analyticsEvents", {
          ...event,
          userId: resolvedUserId, // May still be undefined if user not found
        });
      })
    );
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
// Uses compound index by_eventType_timestamp for efficient filtering
export const countGenerationsToday = query({
  args: {},
  handler: async (ctx) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Use compound index to filter by eventType AND timestamp
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_eventType_timestamp", (q) =>
        q.eq("eventType", "generation").gte("timestamp", startOfDay.getTime())
      )
      .take(10000); // Hard limit for performance

    return events.length;
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

// ============================================================================
// v2: Session Analytics Queries
// ============================================================================

// ── Average response time (admin dashboard) ─────────────────────────
export const averageResponseTime = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5000;
    
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .take(limit);

    const withResponseTime = events.filter(
      (e) => e.responseTimeMs !== undefined && e.responseTimeMs !== null && e.responseTimeMs > 0
    );

    if (withResponseTime.length === 0) return null;

    const sum = withResponseTime.reduce((acc, e) => acc + (e.responseTimeMs ?? 0), 0);
    const avg = sum / withResponseTime.length;
    
    // Also calculate percentiles
    const sorted = withResponseTime.map(e => e.responseTimeMs ?? 0).sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    return {
      average: Math.round(avg),
      median: p50,
      p95,
      p99,
      count: withResponseTime.length,
    };
  },
});

// ── Regeneration rate (admin dashboard) ─────────────────────────────
export const regenerationRate = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5000;
    
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .filter((q) => q.eq(q.field("eventType"), "generation"))
      .take(limit);

    const total = events.length;
    const regenerations = events.filter(e => e.wasRegeneration === true).length;
    
    return {
      totalGenerations: total,
      regenerations,
      rate: total > 0 ? Math.round((regenerations / total) * 1000) / 10 : 0, // percentage with 1 decimal
    };
  },
});

// ── Analytics by ecosystem/channel (admin dashboard) ────────────────
export const statsByEcosystemChannel = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5000;
    
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .filter((q) => q.eq(q.field("eventType"), "generation"))
      .take(limit);

    // Group by ecosystem+channel
    const stats: Record<string, {
      count: number;
      avgTrustScore: number | null;
      avgResponseTime: number | null;
      trustScores: number[];
      responseTimes: number[];
    }> = {};
    
    for (const event of events) {
      const key = `${event.ecosystem}/${event.channel}`;
      if (!stats[key]) {
        stats[key] = { count: 0, avgTrustScore: null, avgResponseTime: null, trustScores: [], responseTimes: [] };
      }
      stats[key].count++;
      if (event.trustScore !== undefined && event.trustScore !== null) {
        stats[key].trustScores.push(event.trustScore);
      }
      if (event.responseTimeMs !== undefined && event.responseTimeMs !== null) {
        stats[key].responseTimes.push(event.responseTimeMs);
      }
    }
    
    // Calculate averages
    return Object.entries(stats).map(([key, data]) => {
      const [ecosystem, channel] = key.split('/');
      return {
        ecosystem,
        channel,
        count: data.count,
        avgTrustScore: data.trustScores.length > 0
          ? Math.round(data.trustScores.reduce((a, b) => a + b, 0) / data.trustScores.length * 10) / 10
          : null,
        avgResponseTime: data.responseTimes.length > 0
          ? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length)
          : null,
      };
    }).sort((a, b) => b.count - a.count);
  },
});

// ── Hourly generation breakdown (for charts) ────────────────────────
export const hourlyBreakdown = query({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .filter((q) => q.eq(q.field("eventType"), "generation"))
      .take(5000);

    // Group by hour
    const hourlyData: Record<number, number> = {};
    
    for (const event of events) {
      const hour = new Date(event.timestamp).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    }
    
    // Convert to array with all 24 hours
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourlyData[hour] || 0,
    }));
  },
});

// ── Combined dashboard stats (optimized single query) ───────────────
export const dashboardStats = query({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    // Get analytics events
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .take(5000);

    // Get sessions
    const sessions = await ctx.db
      .query("conversationSessions")
      .withIndex("by_startedAt", (q) => q.gte("startedAt", args.since))
      .take(1000);

    // Get interactions
    const interactions = await ctx.db
      .query("interactionEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .take(5000);

    // Get corrections for learning metrics
    const corrections = await ctx.db
      .query("corrections")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", args.since))
      .take(1000);

    // Calculate metrics
    const generations = events.filter(e => e.eventType === "generation");
    const withTrustScore = generations.filter(e => e.trustScore !== undefined);
    const withResponseTime = generations.filter(e => e.responseTimeMs !== undefined && e.responseTimeMs > 0);
    const regenerations = generations.filter(e => e.wasRegeneration === true);
    
    const completedSessions = sessions.filter(s => s.status === "completed");
    
    // Interaction counts
    const interactionCounts: Record<string, number> = {};
    for (const i of interactions) {
      interactionCounts[i.eventType] = (interactionCounts[i.eventType] || 0) + 1;
    }

    // Learning metrics from corrections
    const learningCorrections = corrections.filter(
      (c) =>
        (c.feedbackType === "edit" || c.feedbackType === "thumbs_down") &&
        c.adminStatus !== "rejected"
    );
    const thumbsUpCount = corrections.filter(c => c.feedbackType === "thumbs_up").length;
    const thumbsDownCount = corrections.filter(c => c.feedbackType === "thumbs_down").length;

    return {
      // Generation metrics
      totalGenerations: generations.length,
      regenerationCount: regenerations.length,
      regenerationRate: generations.length > 0 
        ? Math.round((regenerations.length / generations.length) * 1000) / 10 
        : 0,
      avgTrustScore: withTrustScore.length > 0
        ? Math.round(withTrustScore.reduce((a, e) => a + (e.trustScore ?? 0), 0) / withTrustScore.length * 10) / 10
        : null,
      avgResponseTime: withResponseTime.length > 0
        ? Math.round(withResponseTime.reduce((a, e) => a + (e.responseTimeMs ?? 0), 0) / withResponseTime.length)
        : null,
      
      // Session metrics
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === "active").length,
      completedSessions: completedSessions.length,
      abandonedSessions: sessions.filter(s => s.status === "abandoned").length,
      avgSessionDuration: completedSessions.length > 0
        ? Math.round(completedSessions.reduce((a, s) => a + (s.durationSeconds ?? 0), 0) / completedSessions.length)
        : null,
      avgMessagesPerSession: sessions.length > 0
        ? Math.round(sessions.reduce((a, s) => a + s.messageCount, 0) / sessions.length * 10) / 10
        : null,
      
      // Interaction metrics
      copyCount: interactionCounts["copy"] || 0,
      likeCount: interactionCounts["like"] || 0,
      dislikeCount: interactionCounts["dislike"] || 0,
      errorCount: interactionCounts["error"] || 0,
      
      // Learning metrics (for POC dashboard)
      learningsApplied: learningCorrections.length,
      totalFeedback: corrections.length,
      sentimentRatio: (thumbsUpCount + thumbsDownCount) > 0
        ? Math.round((thumbsUpCount / (thumbsUpCount + thumbsDownCount)) * 100)
        : null,
    };
  },
});
