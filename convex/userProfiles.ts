/**
 * User Learning Profiles
 * 
 * Aggregates user preferences and behaviors across sessions
 * to enable personalization without storing PII.
 * 
 * @module convex/userProfiles
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAuthenticated } from "./_auth";
import type { Id, Doc } from "./_generated/dataModel";

// ── Configuration ────────────────────────────────────────────────

const MIN_INTERACTIONS_FOR_PROFILE = 10; // Minimum interactions before creating profile
const AGGREGATION_LOOKBACK_DAYS = 90; // Only consider last 90 days of data
const MAX_TOP_ITEMS = 10; // Maximum items in frequency arrays

// ── Create or Update User Profile ─────────────────────────────────

/**
 * Aggregate user data and update their learning profile
 * Called periodically or after significant activity
 */
export const aggregateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx, args.deviceId);
    
    const now = Date.now();
    const lookbackStart = now - (AGGREGATION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    
    // Get user's corrections from the lookback period
    const corrections = await ctx.db
      .query("corrections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("timestamp"), lookbackStart))
      .take(500);
    
    // Get user's sessions from the lookback period
    const sessions = await ctx.db
      .query("conversationSessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("startedAt"), lookbackStart))
      .take(200);
    
    // Get user's analytics events
    const analyticsEvents = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("timestamp"), lookbackStart))
      .take(500);
    
    // Calculate total interactions
    const totalInteractions = analyticsEvents.filter(
      (e) => e.eventType === "generation"
    ).length;
    
    // Skip if not enough data
    if (totalInteractions < MIN_INTERACTIONS_FOR_PROFILE) {
      return { 
        success: false, 
        reason: "insufficient_data",
        interactions: totalInteractions,
        required: MIN_INTERACTIONS_FOR_PROFILE,
      };
    }
    
    // ── Calculate Preferences ────────────────────────────────────
    
    // Correction frequency
    const correctionFrequency = totalInteractions > 0 
      ? (corrections.length / totalInteractions) * 100 
      : 0;
    
    // Top correction reasons (from thumbs_down)
    const reasonCounts: Record<string, number> = {};
    for (const c of corrections) {
      if (c.feedbackType === "thumbs_down" && c.reasons) {
        for (const reason of c.reasons) {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }
      }
    }
    const topCorrectionReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TOP_ITEMS)
      .map(([reason]) => reason);
    
    // Common intents (from analytics events)
    const intentCounts: Record<string, number> = {};
    for (const e of analyticsEvents) {
      if (e.eventType === "generation") {
        const intent = e.userAction || "unknown";
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
      }
    }
    const commonIntents = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TOP_ITEMS)
      .map(([intent, frequency]) => ({ intent, frequency }));
    
    // Common ecosystems
    const ecosystemCounts: Record<string, number> = {};
    for (const e of analyticsEvents) {
      if (e.ecosystem) {
        ecosystemCounts[e.ecosystem] = (ecosystemCounts[e.ecosystem] || 0) + 1;
      }
    }
    const commonEcosystems = Object.entries(ecosystemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TOP_ITEMS)
      .map(([ecosystem, frequency]) => ({ ecosystem, frequency }));
    
    // Session metrics
    const completedSessions = sessions.filter((s) => s.status === "completed");
    const averageSessionLength = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + s.messageCount, 0) / completedSessions.length
      : undefined;
    
    // Regeneration rate
    const totalRegenerations = sessions.reduce((sum, s) => sum + s.regenerationCount, 0);
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const regenerationRate = totalMessages > 0
      ? (totalRegenerations / totalMessages) * 100
      : undefined;
    
    // Copy rate
    const totalCopies = sessions.reduce((sum, s) => sum + s.copyActionCount, 0);
    const copyRate = totalMessages > 0
      ? (totalCopies / totalMessages) * 100
      : undefined;
    
    // ── Upsert Profile ───────────────────────────────────────────
    
    const existingProfile = await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    const profileData = {
      userId: args.userId,
      deviceId: args.deviceId,
      commonIntents,
      commonEcosystems,
      correctionFrequency,
      topCorrectionReasons,
      averageSessionLength,
      regenerationRate,
      copyRate,
      totalInteractions,
      totalCorrections: corrections.length,
      lastAggregatedAt: now,
      updatedAt: now,
    };
    
    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileData);
      return { success: true, action: "updated", profileId: existingProfile._id };
    } else {
      const newId = await ctx.db.insert("userLearningProfiles", {
        ...profileData,
        createdAt: now,
      });
      return { success: true, action: "created", profileId: newId };
    }
  },
});

// ── Get User Profile ──────────────────────────────────────────────

export const getUserProfile = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getProfileByDeviceId = query({
  args: {
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
  },
});

// ── Update Specific Preferences ───────────────────────────────────

/**
 * Update voice trait preferences based on corrections
 */
export const updateVoiceTraitPreferences = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    traitPreferences: v.array(v.object({
      trait: v.string(),
      preference: v.number(), // -1 to 1
      sampleSize: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx, args.deviceId);
    
    const profile = await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!profile) {
      return { success: false, reason: "profile_not_found" };
    }
    
    await ctx.db.patch(profile._id, {
      preferredVoiceTraits: args.traitPreferences,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Update tone preferences (warmth and detail levels)
 */
export const updateTonePreferences = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    preferredWarmth: v.optional(v.number()),
    preferredDetail: v.optional(v.number()),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx, args.deviceId);
    
    const profile = await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!profile) {
      return { success: false, reason: "profile_not_found" };
    }
    
    const updates: Partial<Doc<"userLearningProfiles">> = {
      updatedAt: Date.now(),
    };
    
    if (args.preferredWarmth !== undefined) {
      updates.preferredWarmth = args.preferredWarmth;
    }
    if (args.preferredDetail !== undefined) {
      updates.preferredDetail = args.preferredDetail;
    }
    if (args.preferredLanguage !== undefined) {
      updates.preferredLanguage = args.preferredLanguage;
    }
    
    await ctx.db.patch(profile._id, updates);
    
    return { success: true };
  },
});

/**
 * Add avoid patterns learned from user corrections
 */
export const addAvoidPatterns = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
    patterns: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx, args.deviceId);
    
    const profile = await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!profile) {
      return { success: false, reason: "profile_not_found" };
    }
    
    const existingPatterns = profile.avoidPatterns || [];
    const newPatterns = args.patterns.filter(p => !existingPatterns.includes(p));
    const mergedPatterns = [...existingPatterns, ...newPatterns].slice(0, 50); // Cap at 50
    
    await ctx.db.patch(profile._id, {
      avoidPatterns: mergedPatterns,
      updatedAt: Date.now(),
    });
    
    return { success: true, addedCount: newPatterns.length };
  },
});

// ── Profile Analytics ─────────────────────────────────────────────

/**
 * Get profiles that need re-aggregation (stale profiles)
 * For background job to update
 */
export const getStaleProfiles = query({
  args: {
    staleAfterHours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const staleThreshold = Date.now() - ((args.staleAfterHours ?? 24) * 60 * 60 * 1000);
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_lastAggregatedAt")
      .filter((q) => q.lt(q.field("lastAggregatedAt"), staleThreshold))
      .take(limit);
  },
});

/**
 * Get high-correction users (for analysis)
 */
export const getHighCorrectionUsers = query({
  args: {
    minCorrectionFrequency: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.minCorrectionFrequency ?? 20; // 20% correction rate
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_correctionFrequency")
      .filter((q) => q.gte(q.field("correctionFrequency"), threshold))
      .take(limit);
  },
});

// ── Profile Cleanup ───────────────────────────────────────────────

/**
 * Delete a user's learning profile (for privacy/data deletion requests)
 */
export const deleteUserProfile = mutation({
  args: {
    userId: v.id("users"),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticated(ctx, args.deviceId);
    
    const profile = await ctx.db
      .query("userLearningProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!profile) {
      return { success: false, reason: "profile_not_found" };
    }
    
    await ctx.db.delete(profile._id);
    
    return { success: true };
  },
});
