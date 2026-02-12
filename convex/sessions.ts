import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ── Create a new session ───────────────────────────────────────────
export const create = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    projectId: v.string(),
    projectName: v.string(),
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.string(),
    userAgent: v.optional(v.string()),
    screenWidth: v.optional(v.number()),
    screenHeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("conversationSessions", {
      ...args,
      startedAt: now,
      lastActivityAt: now,
      messageCount: 0,
      userMessageCount: 0,
      assistantMessageCount: 0,
      contextSwitches: 0,
      regenerationCount: 0,
      copyActionCount: 0,
      voiceMessageCount: 0,
      textMessageCount: 0,
      status: "active",
    });
  },
});

// ── Update session metrics ─────────────────────────────────────────
export const updateMetrics = mutation({
  args: {
    sessionId: v.id("conversationSessions"),
    messageCount: v.optional(v.number()),
    userMessageCount: v.optional(v.number()),
    assistantMessageCount: v.optional(v.number()),
    averageResponseTimeMs: v.optional(v.number()),
    contextSwitches: v.optional(v.number()),
    regenerationCount: v.optional(v.number()),
    copyActionCount: v.optional(v.number()),
    voiceMessageCount: v.optional(v.number()),
    textMessageCount: v.optional(v.number()),
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
    persona: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    
    await ctx.db.patch(sessionId, {
      ...filteredUpdates,
      lastActivityAt: Date.now(),
    });
  },
});

// ── End a session ──────────────────────────────────────────────────
export const end = mutation({
  args: {
    sessionId: v.id("conversationSessions"),
    exitReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    
    const now = Date.now();
    const durationSeconds = Math.round((now - session.startedAt) / 1000);
    
    await ctx.db.patch(args.sessionId, {
      endedAt: now,
      durationSeconds,
      status: "completed",
      exitReason: args.exitReason || "user_left",
      lastActivityAt: now,
    });
  },
});

// ── Mark session as abandoned (e.g., timeout) ──────────────────────
export const markAbandoned = mutation({
  args: {
    sessionId: v.id("conversationSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "active") return;
    
    const now = Date.now();
    const durationSeconds = Math.round((now - session.startedAt) / 1000);
    
    await ctx.db.patch(args.sessionId, {
      endedAt: now,
      durationSeconds,
      status: "abandoned",
      exitReason: "timeout",
    });
  },
});

// ── Get active session for a project ───────────────────────────────
export const getActiveByProject = query({
  args: {
    deviceId: v.string(),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("conversationSessions")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .filter((q) => 
        q.and(
          q.eq(q.field("projectId"), args.projectId),
          q.eq(q.field("status"), "active")
        )
      )
      .order("desc")
      .take(1);
    
    return sessions[0] || null;
  },
});

// ── Get session by ID ──────────────────────────────────────────────
export const getById = query({
  args: {
    sessionId: v.id("conversationSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// ── Get recent sessions for admin ──────────────────────────────────
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    if (args.status) {
      return await ctx.db
        .query("conversationSessions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }
    
    return await ctx.db
      .query("conversationSessions")
      .order("desc")
      .take(limit);
  },
});

// ── Get sessions by user ───────────────────────────────────────────
export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("conversationSessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// ── Get session statistics (admin dashboard) ───────────────────────
export const getStats = query({
  args: {
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("conversationSessions")
      .withIndex("by_startedAt", (q) => q.gte("startedAt", args.since))
      .collect();
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        abandonedSessions: 0,
        averageDurationSeconds: 0,
        averageMessageCount: 0,
        averageRegenerations: 0,
        totalCopyActions: 0,
      };
    }
    
    const completed = sessions.filter((s) => s.status === "completed");
    const active = sessions.filter((s) => s.status === "active");
    const abandoned = sessions.filter((s) => s.status === "abandoned");
    
    const avgDuration = completed.length > 0
      ? completed.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / completed.length
      : 0;
    
    const avgMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0) / sessions.length;
    const avgRegenerations = sessions.reduce((sum, s) => sum + s.regenerationCount, 0) / sessions.length;
    const totalCopies = sessions.reduce((sum, s) => sum + s.copyActionCount, 0);
    
    return {
      totalSessions: sessions.length,
      activeSessions: active.length,
      completedSessions: completed.length,
      abandonedSessions: abandoned.length,
      averageDurationSeconds: Math.round(avgDuration),
      averageMessageCount: Math.round(avgMessages * 10) / 10,
      averageRegenerations: Math.round(avgRegenerations * 100) / 100,
      totalCopyActions: totalCopies,
    };
  },
});

// ── Internal: Get old sessions for cleanup ─────────────────────────
export const getOlderThan = internalQuery({
  args: {
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversationSessions")
      .withIndex("by_startedAt", (q) => q.lt("startedAt", args.timestamp))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .take(100);
  },
});

// ── Internal: Archive old session ──────────────────────────────────
export const archive = internalMutation({
  args: {
    id: v.id("conversationSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

// ── Timeout stale active sessions (cleanup) ────────────────────────
export const timeoutStaleSessions = internalMutation({
  args: {
    maxAgeMs: v.optional(v.number()), // Default: 2 hours
  },
  handler: async (ctx, args) => {
    const maxAge = args.maxAgeMs ?? 2 * 60 * 60 * 1000; // 2 hours
    const cutoff = Date.now() - maxAge;
    
    const staleSessions = await ctx.db
      .query("conversationSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.lt(q.field("lastActivityAt"), cutoff))
      .take(50);
    
    for (const session of staleSessions) {
      const durationSeconds = Math.round((session.lastActivityAt - session.startedAt) / 1000);
      await ctx.db.patch(session._id, {
        endedAt: session.lastActivityAt,
        durationSeconds,
        status: "abandoned",
        exitReason: "timeout",
      });
    }
    
    return staleSessions.length;
  },
});
