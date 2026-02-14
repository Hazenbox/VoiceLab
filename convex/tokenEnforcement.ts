/**
 * Token Enforcement Rules API
 * 
 * CRUD operations and rule fetching for token-based content enforcement.
 * These rules define what content patterns are required, forbidden, or
 * need auto-fix based on active token values.
 * 
 * @module convex/tokenEnforcement
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RuleType = 
  | "must_contain"       // Content MUST include these patterns
  | "must_not_contain"   // Content MUST NOT include these patterns
  | "pattern_required"   // Regex pattern must match somewhere
  | "pattern_forbidden"  // Regex pattern must NOT match
  | "max_length"         // Character limit enforcement
  | "min_empathy";       // Empathy score threshold

export type AutoFixAction =
  | "remove"           // Remove matching content
  | "replace"          // Replace with autoFixValue
  | "add_disclaimer"   // Append disclaimer
  | "truncate"         // Truncate to max_length
  | "rephrase";        // Suggest rephrase (manual or AI)

export type Severity = "error" | "warning" | "info";

export type Category = "safety" | "nudge" | "channel" | "emotion" | "signature" | "brand";

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all active enforcement rules
 */
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tokenEnforcementRules")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Get all rules (active and inactive)
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tokenEnforcementRules")
      .order("desc")
      .collect();
  },
});

/**
 * Get rules by category
 */
export const getByCategory = query({
  args: { 
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tokenEnforcementRules")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get rules that apply to specific token values
 * This is the main query used during content generation
 */
export const getRulesForTokens = query({
  args: {
    tokenPairs: v.array(v.object({
      key: v.string(),
      value: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const matchingRules = [];
    
    for (const { key, value } of args.tokenPairs) {
      // Get rules for this exact token/value pair
      const exactMatch = await ctx.db
        .query("tokenEnforcementRules")
        .withIndex("by_token", (q) => q.eq("tokenKey", key).eq("tokenValue", value))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      
      matchingRules.push(...exactMatch);
      
      // Also get rules for this token key with wildcard value "*"
      const wildcardMatch = await ctx.db
        .query("tokenEnforcementRules")
        .withIndex("by_token", (q) => q.eq("tokenKey", key).eq("tokenValue", "*"))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      
      matchingRules.push(...wildcardMatch);
    }
    
    // Deduplicate and sort by priority (higher first)
    const uniqueRules = [...new Map(matchingRules.map(r => [r._id.toString(), r])).values()];
    return uniqueRules.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Get a single rule by ID
 */
export const getById = query({
  args: { 
    id: v.id("tokenEnforcementRules"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new enforcement rule
 */
export const create = mutation({
  args: {
    tokenKey: v.string(),
    tokenValue: v.string(),
    ruleType: v.string(),
    patterns: v.array(v.string()),
    autoFixAction: v.optional(v.string()),
    autoFixValue: v.optional(v.string()),
    severity: v.string(),
    errorMessage: v.string(),
    category: v.optional(v.string()),
    isActive: v.boolean(),
    priority: v.number(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const ruleId = await ctx.db.insert("tokenEnforcementRules", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    
    return { success: true, ruleId };
  },
});

/**
 * Update an existing rule
 */
export const update = mutation({
  args: {
    id: v.id("tokenEnforcementRules"),
    tokenKey: v.optional(v.string()),
    tokenValue: v.optional(v.string()),
    ruleType: v.optional(v.string()),
    patterns: v.optional(v.array(v.string())),
    autoFixAction: v.optional(v.string()),
    autoFixValue: v.optional(v.string()),
    severity: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    
    if (!existing) {
      return { success: false, error: "Rule not found" };
    }
    
    const { id, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(id, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Toggle rule active status
 */
export const toggleActive = mutation({
  args: {
    id: v.id("tokenEnforcementRules"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    
    if (!existing) {
      return { success: false, error: "Rule not found" };
    }
    
    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Delete a rule
 */
export const remove = mutation({
  args: {
    id: v.id("tokenEnforcementRules"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    
    if (!existing) {
      return { success: false, error: "Rule not found" };
    }
    
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface TokenEnforcementRuleSeed {
  tokenKey: string;
  tokenValue: string;
  ruleType: string;
  patterns: string[];
  autoFixAction?: string;
  autoFixValue?: string;
  severity: string;
  errorMessage: string;
  category?: string;
  isActive: boolean;
  priority: number;
  createdBy: string;
}

const DEFAULT_RULES: TokenEnforcementRuleSeed[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // SAFETY RULES
  // ══════════════════════════════════════════════════════════════════════════
  {
    tokenKey: "safety.level",
    tokenValue: "critical",
    ruleType: "must_contain",
    patterns: ["seek immediate help", "emergency services", "112", "call"],
    autoFixAction: "add_disclaimer",
    autoFixValue: "\n\n**Important:** If this is an emergency, please contact emergency services at 112 immediately.",
    severity: "error",
    errorMessage: "Critical safety content must include emergency contact information",
    category: "safety",
    isActive: true,
    priority: 100,
    createdBy: "system",
  },
  {
    tokenKey: "safety.domain",
    tokenValue: "self_harm",
    ruleType: "must_not_contain",
    patterns: ["method", "how to", "steps", "ways to"],
    autoFixAction: "remove",
    severity: "error",
    errorMessage: "Self-harm content must not include methods or instructions",
    category: "safety",
    isActive: true,
    priority: 100,
    createdBy: "system",
  },
  {
    tokenKey: "safety.domain",
    tokenValue: "fraud_scam",
    ruleType: "must_contain",
    patterns: ["verify", "official", "suspicious", "report"],
    autoFixAction: "add_disclaimer",
    autoFixValue: "\n\n**Security reminder:** Always verify requests through official channels and report suspicious activity.",
    severity: "warning",
    errorMessage: "Fraud-related content should include verification guidance",
    category: "safety",
    isActive: true,
    priority: 90,
    createdBy: "system",
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // NUDGE RULES
  // ══════════════════════════════════════════════════════════════════════════
  {
    tokenKey: "nudge.permission",
    tokenValue: "blocked",
    ruleType: "must_not_contain",
    patterns: ["upgrade", "premium", "offer", "subscribe", "buy", "purchase", "discount"],
    autoFixAction: "remove",
    severity: "error",
    errorMessage: "Promotional nudges are blocked for this interaction",
    category: "nudge",
    isActive: true,
    priority: 80,
    createdBy: "system",
  },
  {
    tokenKey: "nudge.permission",
    tokenValue: "never",
    ruleType: "pattern_forbidden",
    patterns: ["(?i)(special offer|limited time|exclusive deal|don't miss)"],
    autoFixAction: "remove",
    severity: "error",
    errorMessage: "All nudges disabled for this user",
    category: "nudge",
    isActive: true,
    priority: 85,
    createdBy: "system",
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL RULES
  // ══════════════════════════════════════════════════════════════════════════
  {
    tokenKey: "channel.type",
    tokenValue: "sms",
    ruleType: "max_length",
    patterns: ["160"], // Max SMS length
    autoFixAction: "truncate",
    severity: "error",
    errorMessage: "SMS messages must be under 160 characters",
    category: "channel",
    isActive: true,
    priority: 70,
    createdBy: "system",
  },
  {
    tokenKey: "channel.type",
    tokenValue: "push_notification",
    ruleType: "max_length",
    patterns: ["100"], // Max push notification length
    autoFixAction: "truncate",
    severity: "warning",
    errorMessage: "Push notifications should be under 100 characters for optimal display",
    category: "channel",
    isActive: true,
    priority: 65,
    createdBy: "system",
  },
  {
    tokenKey: "channel.type",
    tokenValue: "ivr",
    ruleType: "must_not_contain",
    patterns: ["link", "http", "url", "click", "visit"],
    autoFixAction: "remove",
    severity: "warning",
    errorMessage: "IVR responses should not include links or URLs (not accessible)",
    category: "channel",
    isActive: true,
    priority: 60,
    createdBy: "system",
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // EMOTION RULES
  // ══════════════════════════════════════════════════════════════════════════
  {
    tokenKey: "emotion.rasa.user",
    tokenValue: "raudra",
    ruleType: "must_not_contain",
    patterns: ["but", "however", "actually", "unfortunately"],
    autoFixAction: "replace",
    autoFixValue: "i understand",
    severity: "warning",
    errorMessage: "Avoid contradicting or dismissive language when user is angry",
    category: "emotion",
    isActive: true,
    priority: 75,
    createdBy: "system",
  },
  {
    tokenKey: "emotion.rasa.user",
    tokenValue: "karuna",
    ruleType: "must_contain",
    patterns: ["understand", "here for you", "sorry", "help"],
    autoFixAction: "add_disclaimer",
    autoFixValue: "I understand this is difficult.",
    severity: "info",
    errorMessage: "Empathetic phrases recommended for sad/compassionate user",
    category: "emotion",
    isActive: true,
    priority: 50,
    createdBy: "system",
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // SIGNATURE RULES
  // ══════════════════════════════════════════════════════════════════════════
  {
    tokenKey: "finishing.signature",
    tokenValue: "youre_all_set",
    ruleType: "must_not_contain",
    patterns: ["let me know if", "feel free to ask", "any questions"],
    autoFixAction: "remove",
    severity: "info",
    errorMessage: "Completion signature should not invite further questions",
    category: "signature",
    isActive: true,
    priority: 40,
    createdBy: "system",
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // BRAND RULES
  // ══════════════════════════════════════════════════════════════════════════
  {
    tokenKey: "identity.brand",
    tokenValue: "jio",
    ruleType: "must_not_contain",
    patterns: ["competitor", "airtel", "vodafone", "vi", "bsnl"],
    autoFixAction: "remove",
    severity: "warning",
    errorMessage: "Avoid mentioning competitor brands in Jio context",
    category: "brand",
    isActive: true,
    priority: 55,
    createdBy: "system",
  },
];

/**
 * Seed default enforcement rules
 */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const rule of DEFAULT_RULES) {
      // Check if rule already exists
      const existing = await ctx.db
        .query("tokenEnforcementRules")
        .withIndex("by_token", (q) => 
          q.eq("tokenKey", rule.tokenKey).eq("tokenValue", rule.tokenValue)
        )
        .filter((q) => q.eq(q.field("ruleType"), rule.ruleType))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("tokenEnforcementRules", {
        ...rule,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created, skipped, total: DEFAULT_RULES.length };
  },
});

/**
 * Clear all enforcement rules (use with caution)
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("tokenEnforcementRules").collect();
    let deleted = 0;

    for (const item of all) {
      await ctx.db.delete(item._id);
      deleted++;
    }

    return { deleted };
  },
});
