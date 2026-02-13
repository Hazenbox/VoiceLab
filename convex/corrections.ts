import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthenticated, requireAdmin } from "./_auth";

// ── Create a correction/feedback entry ───────────────────────────
// PROTECTED: Requires authenticated user
export const create = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    messageContent: v.string(),
    originalContent: v.string(),
    editedContent: v.optional(v.string()),
    feedbackType: v.string(),
    comment: v.optional(v.string()),
    reasons: v.optional(v.array(v.string())),
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.string(),
    trustScore: v.optional(v.number()),
    generationContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    await requireAuthenticated(ctx, args.deviceId);

    return await ctx.db.insert("corrections", {
      ...args,
      adminStatus: "approved", // Auto-approve all corrections for immediate learning
      timestamp: Date.now(),
    });
  },
});

// ── Get corrections by ecosystem + channel ───────────────────────
// Used by the learning engine to build prompt preferences.
export const getByEcosystemChannel = query({
  args: {
    ecosystem: v.string(),
    channel: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("corrections")
      .withIndex("by_ecosystem_channel", (q) =>
        q.eq("ecosystem", args.ecosystem).eq("channel", args.channel)
      )
      .order("desc")
      .take(limit);
  },
});

// ── Get learning-relevant corrections (edits + thumbs_down) ─────
// Filters out admin-rejected corrections.
export const getLearningCorrections = query({
  args: {
    ecosystem: v.string(),
    channel: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const corrections = await ctx.db
      .query("corrections")
      .withIndex("by_ecosystem_channel_feedbackType", (q) =>
        q.eq("ecosystem", args.ecosystem).eq("channel", args.channel)
      )
      .order("desc")
      .take(limit * 3); // Over-fetch then filter client-side

    // Filter to learning signals only (edits + thumbs_down), exclude rejected
    return corrections
      .filter(
        (c) =>
          (c.feedbackType === "edit" || c.feedbackType === "thumbs_down") &&
          c.adminStatus !== "rejected"
      )
      .slice(0, limit);
  },
});

// ── Get corrections by user ──────────────────────────────────────
export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("corrections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// ── List all corrections (admin, paginated) ──────────────────────
export const listAll = query({
  args: {
    limit: v.optional(v.number()),
    adminStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.adminStatus) {
      return await ctx.db
        .query("corrections")
        .withIndex("by_adminStatus", (q) =>
          q.eq("adminStatus", args.adminStatus)
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("corrections")
      .order("desc")
      .take(limit);
  },
});

// ── Update admin status on a correction ──────────────────────────
// ADMIN ONLY: Requires leadership role
export const updateAdminStatus = mutation({
  args: {
    correctionId: v.id("corrections"),
    adminStatus: v.string(), // approved | rejected
    updatedBy: v.optional(v.string()), // deviceId for authorization
  },
  handler: async (ctx, args) => {
    // Verify admin authorization
    await requireAdmin(ctx, args.updatedBy);

    await ctx.db.patch(args.correctionId, {
      adminStatus: args.adminStatus,
    });
  },
});

// ── Count corrections by feedback type (admin analytics) ─────────
// Limited to recent corrections for performance (last 10,000 or 90 days)
export const countByFeedbackType = query({
  args: {
    since: v.optional(v.number()), // Timestamp to start counting from
  },
  handler: async (ctx, args) => {
    // Default to last 90 days if not specified
    const since = args.since ?? Date.now() - 90 * 24 * 60 * 60 * 1000;
    
    const corrections = await ctx.db
      .query("corrections")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
      .take(10000); // Hard limit for performance
    
    const counts: Record<string, number> = {};
    for (const c of corrections) {
      counts[c.feedbackType] = (counts[c.feedbackType] || 0) + 1;
    }
    return counts;
  },
});

// ── P0-FIX: Get rejected correction IDs for local cache sync ─────
// Returns list of rejected correction IDs to purge from local learning cache
export const getRejectedIds = query({
  args: {
    since: v.optional(v.number()), // Only get rejections after this timestamp
  },
  handler: async (ctx, args) => {
    // Default to last 30 days if not specified
    const since = args.since ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    const rejectedCorrections = await ctx.db
      .query("corrections")
      .withIndex("by_adminStatus", (q) => q.eq("adminStatus", "rejected"))
      .take(500); // Reasonable limit
    
    // Filter by timestamp and return IDs + originalContent for matching
    return rejectedCorrections
      .filter((c) => c.timestamp >= since)
      .map((c) => ({
        id: c._id,
        originalContent: c.originalContent.slice(0, 100), // Truncate for matching
        ecosystem: c.ecosystem,
        channel: c.channel,
        timestamp: c.timestamp,
      }));
  },
});

// ── Get learning statistics (admin dashboard) ────────────────────
// Returns unique patterns count, edit counts, avoid reasons for POC demo
export const getLearningStats = query({
  args: {
    since: v.optional(v.number()), // Timestamp to start counting from
  },
  handler: async (ctx, args) => {
    // Default to last 90 days if not specified
    const since = args.since ?? Date.now() - 90 * 24 * 60 * 60 * 1000;
    
    const corrections = await ctx.db
      .query("corrections")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
      .take(1000); // Limit for performance
    
    // Filter to learning signals only (edits + thumbs_down), exclude rejected
    const learningCorrections = corrections.filter(
      (c) =>
        (c.feedbackType === "edit" || c.feedbackType === "thumbs_down") &&
        c.adminStatus !== "rejected"
    );
    
    // Unique edit patterns (by original content hash - first 50 chars)
    const uniqueEdits = new Set(
      learningCorrections
        .filter((c) => c.feedbackType === "edit" && c.editedContent)
        .map((c) => c.originalContent.slice(0, 50))
    );
    
    // Unique avoid patterns (from reasons)
    const avoidPatterns = new Set<string>();
    learningCorrections
      .filter((c) => c.feedbackType === "thumbs_down" && c.reasons)
      .forEach((c) => c.reasons?.forEach((r) => avoidPatterns.add(r)));
    
    // Count by feedback type within learning corrections
    const editsCount = learningCorrections.filter(
      (c) => c.feedbackType === "edit"
    ).length;
    const thumbsDownCount = learningCorrections.filter(
      (c) => c.feedbackType === "thumbs_down"
    ).length;
    
    return {
      totalLearningCorrections: learningCorrections.length,
      uniqueEditPatterns: uniqueEdits.size,
      uniqueAvoidPatterns: avoidPatterns.size,
      totalPatternsApplied: uniqueEdits.size + avoidPatterns.size,
      byFeedbackType: {
        edits: editsCount,
        thumbsDown: thumbsDownCount,
      },
      topAvoidReasons: Array.from(avoidPatterns).slice(0, 10),
    };
  },
});
