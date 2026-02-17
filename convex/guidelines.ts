import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Guidelines API
 * 
 * Phase 6D: Convex queries and mutations for dynamic guidelines.
 * These replace hardcoded TypeScript constants with admin-editable database records.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE VOICE TRAITS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all active voice traits, optionally filtered by ecosystem/channel.
 */
export const getVoiceTraits = query({
  args: {
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const activeOnly = args.activeOnly ?? true;
    
    // Get all traits first
    let traits = await ctx.db
      .query("coreVoiceTraits")
      .withIndex("by_isActive", (q) => 
        activeOnly ? q.eq("isActive", true) : q
      )
      .collect();
    
    // Filter by ecosystem/channel if specified
    if (args.ecosystem || args.channel) {
      traits = traits.filter(trait => {
        // Global traits (no ecosystem/channel) always match
        if (!trait.ecosystem && !trait.channel) return true;
        
        // If ecosystem specified in trait, must match
        if (trait.ecosystem && trait.ecosystem !== args.ecosystem) return false;
        
        // If channel specified in trait, must match
        if (trait.channel && trait.channel !== args.channel) return false;
        
        return true;
      });
    }
    
    // Sort by priority
    return traits.sort((a, b) => a.priority - b.priority);
  },
});

/**
 * Get a single voice trait by key.
 */
export const getVoiceTrait = query({
  args: { traitKey: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("coreVoiceTraits")
      .withIndex("by_traitKey", (q) => q.eq("traitKey", args.traitKey))
      .first();
  },
});

/**
 * Create or update a voice trait.
 */
export const upsertVoiceTrait = mutation({
  args: {
    traitKey: v.string(),
    name: v.string(),
    description: v.string(),
    violations: v.array(v.string()),
    positiveExamples: v.optional(v.array(v.string())),
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
    priority: v.number(),
    isActive: v.boolean(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("coreVoiceTraits")
      .withIndex("by_traitKey", (q) => q.eq("traitKey", args.traitKey))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return ctx.db.insert("coreVoiceTraits", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// BRAND GUARDRAILS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all active brand guardrails, optionally filtered.
 */
export const getBrandGuardrails = query({
  args: {
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
    ruleType: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const activeOnly = args.activeOnly ?? true;
    
    let rules = await ctx.db
      .query("brandGuardrails")
      .withIndex("by_isActive", (q) => 
        activeOnly ? q.eq("isActive", true) : q
      )
      .collect();
    
    // Filter by criteria
    if (args.ecosystem) {
      rules = rules.filter(r => !r.ecosystem || r.ecosystem === args.ecosystem);
    }
    if (args.channel) {
      rules = rules.filter(r => !r.channel || r.channel === args.channel);
    }
    if (args.ruleType) {
      rules = rules.filter(r => r.ruleType === args.ruleType);
    }
    
    // Sort by priority (descending - higher priority first)
    return rules.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Create or update a brand guardrail.
 */
export const upsertBrandGuardrail = mutation({
  args: {
    ruleKey: v.string(),
    ruleName: v.string(),
    ruleType: v.string(),
    rule: v.string(),
    examples: v.array(v.string()),
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
    severity: v.string(),
    autoFixSuggestion: v.optional(v.string()),
    isActive: v.boolean(),
    priority: v.number(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("brandGuardrails")
      .withIndex("by_ruleKey", (q) => q.eq("ruleKey", args.ruleKey))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return ctx.db.insert("brandGuardrails", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY KEYWORDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all active safety keyword domains.
 */
export const getSafetyKeywords = query({
  args: {
    domain: v.optional(v.string()),
    severity: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const activeOnly = args.activeOnly ?? true;
    
    let keywords = await ctx.db
      .query("safetyKeywords")
      .withIndex("by_isActive", (q) => 
        activeOnly ? q.eq("isActive", true) : q
      )
      .collect();
    
    if (args.domain) {
      keywords = keywords.filter(k => k.domain === args.domain);
    }
    if (args.severity) {
      keywords = keywords.filter(k => k.severity === args.severity);
    }
    
    return keywords;
  },
});

/**
 * Get safety keywords for a specific domain.
 */
export const getSafetyDomain = query({
  args: { domain: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("safetyKeywords")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();
  },
});

/**
 * Create or update a safety keyword domain.
 */
export const upsertSafetyKeywords = mutation({
  args: {
    domain: v.string(),
    domainDisplayName: v.string(),
    keywords: v.array(v.string()),
    patterns: v.array(v.string()),
    severity: v.string(),
    responseType: v.string(),
    emergencyTemplate: v.optional(v.string()),
    requiresHuman: v.boolean(),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("safetyKeywords")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return ctx.db.insert("safetyKeywords", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED GUIDELINES FETCH (for server-side pipeline)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all guidelines data in one query for the server-side pipeline.
 * This reduces round-trips when running the pipeline on the server.
 */
export const getAllGuidelines = query({
  args: {
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [voiceTraits, brandGuardrails, safetyKeywords] = await Promise.all([
      // Voice traits
      ctx.db
        .query("coreVoiceTraits")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect(),
      // Brand guardrails
      ctx.db
        .query("brandGuardrails")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect(),
      // Safety keywords
      ctx.db
        .query("safetyKeywords")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect(),
    ]);
    
    // Filter voice traits by ecosystem/channel
    const filteredTraits = voiceTraits.filter(trait => {
      if (!trait.ecosystem && !trait.channel) return true;
      if (trait.ecosystem && trait.ecosystem !== args.ecosystem) return false;
      if (trait.channel && trait.channel !== args.channel) return false;
      return true;
    }).sort((a, b) => a.priority - b.priority);
    
    // Filter brand guardrails by ecosystem/channel
    const filteredGuardrails = brandGuardrails.filter(rule => {
      if (!rule.ecosystem && !rule.channel) return true;
      if (rule.ecosystem && rule.ecosystem !== args.ecosystem) return false;
      if (rule.channel && rule.channel !== args.channel) return false;
      return true;
    }).sort((a, b) => b.priority - a.priority);
    
    return {
      voiceTraits: filteredTraits,
      brandGuardrails: filteredGuardrails,
      safetyKeywords,
    };
  },
});
