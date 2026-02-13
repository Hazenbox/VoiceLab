/**
 * Seed Directive Overrides
 * 
 * Initial directive overrides for runtime customization of constitutional rules.
 * Run: npx convex run seedDirectiveOverrides:seedAll
 * 
 * @module convex/seedDirectiveOverrides
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATA (matches schema.ts directiveOverrides table)
// ═══════════════════════════════════════════════════════════════════════════════

interface DirectiveOverrideSeed {
  directiveType: string;
  directiveKey: string;
  ecosystem?: string;
  channel?: string;
  overrideAction: string;
  overrideValue?: string;
  priority: number;
  reason?: string;
  isActive: boolean;
  createdBy: string;
  expiresAt?: number;
}

const DIRECTIVE_OVERRIDES: DirectiveOverrideSeed[] = [
  // ── Ecosystem-Specific Overrides ───────────────────────────────────────
  {
    directiveType: 'voice_trait',
    directiveKey: 'warmth_level',
    ecosystem: 'jio_fiber',
    channel: undefined,
    overrideAction: 'modify',
    overrideValue: JSON.stringify({ minWarmth: 3, preferredWarmth: 4 }),
    priority: 10,
    reason: 'Increase warmth for JioFiber onboarding to improve first impression',
    isActive: true,
    createdBy: 'system',
  },
  {
    directiveType: 'safety_rule',
    directiveKey: 'advisory_boundary',
    ecosystem: 'jio_financial',
    channel: undefined,
    overrideAction: 'modify',
    overrideValue: JSON.stringify({ minGuardrail: 'cautious', requiredDisclaimers: ['financial_advice'] }),
    priority: 20,
    reason: 'Strict compliance mode for financial services',
    isActive: true,
    createdBy: 'system',
  },

  // ── Channel-Specific Overrides ─────────────────────────────────────────
  {
    directiveType: 'voice_trait',
    directiveKey: 'detail_level',
    ecosystem: undefined,
    channel: 'ivr',
    overrideAction: 'modify',
    overrideValue: JSON.stringify({ maxDetail: 1, preferredDetail: 1 }),
    priority: 15,
    reason: 'Use minimal detail level for IVR channel - brevity is critical',
    isActive: true,
    createdBy: 'system',
  },
  {
    directiveType: 'voice_trait',
    directiveKey: 'warmth_level',
    ecosystem: undefined,
    channel: 'push_notification',
    overrideAction: 'modify',
    overrideValue: JSON.stringify({ allowNeutral: true, maxWarmth: 2 }),
    priority: 10,
    reason: 'Allow higher urgency tone for push notifications',
    isActive: true,
    createdBy: 'system',
  },

  // ── Festival/Seasonal Overrides ────────────────────────────────────────
  {
    directiveType: 'voice_trait',
    directiveKey: 'warmth_level',
    ecosystem: undefined,
    channel: undefined,
    overrideAction: 'modify',
    overrideValue: JSON.stringify({ 
      minWarmth: 3, 
      allowCelebratory: true,
      festivalGreetings: ['Happy Diwali!', 'Shubh Deepavali!']
    }),
    priority: 5,
    reason: 'Celebratory tone adjustments for Diwali period',
    isActive: false, // Activate during Diwali season
    createdBy: 'system',
  },

  // ── Safety Domain Overrides ────────────────────────────────────────────
  {
    directiveType: 'safety_rule',
    directiveKey: 'health_emergency',
    ecosystem: undefined,
    channel: undefined,
    overrideAction: 'enable',
    overrideValue: JSON.stringify({
      routing: 'emergency_response',
      includeEmergencyNumbers: true,
      skipNudge: true,
    }),
    priority: 100, // Highest priority
    reason: 'Enforce immediate emergency response for health emergencies',
    isActive: true,
    createdBy: 'system',
  },
  {
    directiveType: 'emotion_rule',
    directiveKey: 'mental_health',
    ecosystem: undefined,
    channel: undefined,
    overrideAction: 'modify',
    overrideValue: JSON.stringify({
      targetEmotion: 'shanta',
      enforcedTraits: ['caring', 'nonJudgmental', 'trustBuilding'],
      forbiddenTraits: ['urgent', 'promotional'],
    }),
    priority: 50,
    reason: 'Extra compassion mode for mental health topics',
    isActive: true,
    createdBy: 'system',
  },

  // ── Intent-Specific Overrides ──────────────────────────────────────────
  {
    directiveType: 'pattern_block',
    directiveKey: 'complaint_flow',
    ecosystem: undefined,
    channel: undefined,
    overrideAction: 'modify',
    overrideValue: JSON.stringify({
      requiredBlocks: ['acknowledge', 'empathize', 'inform', 'reassure', 'nextStep'],
      forbiddenBlocks: ['nudge'],
    }),
    priority: 15,
    reason: 'Boost empathy for complaint handling',
    isActive: true,
    createdBy: 'system',
  },
  {
    directiveType: 'safety_rule',
    directiveKey: 'transaction_confirmation',
    ecosystem: undefined,
    channel: undefined,
    overrideAction: 'enable',
    overrideValue: JSON.stringify({
      requireConfirmation: true,
      confirmationPrompt: 'Please confirm you want to proceed with this transaction.',
    }),
    priority: 20,
    reason: 'Require explicit confirmation for transaction intents',
    isActive: true,
    createdBy: 'system',
  },
  
  // ── Disable Specific Traits ────────────────────────────────────────────
  {
    directiveType: 'voice_trait',
    directiveKey: 'promotional',
    ecosystem: undefined,
    channel: 'support_chat',
    overrideAction: 'disable',
    overrideValue: undefined,
    priority: 25,
    reason: 'Disable promotional language in support contexts',
    isActive: true,
    createdBy: 'system',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Seed all directive overrides
 */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const override of DIRECTIVE_OVERRIDES) {
      // Check if already exists by directiveType + directiveKey + ecosystem + channel
      const existing = await ctx.db
        .query("directiveOverrides")
        .withIndex("by_directiveType_key", (q) => 
          q.eq("directiveType", override.directiveType).eq("directiveKey", override.directiveKey)
        )
        .filter((q) => 
          q.and(
            q.eq(q.field("ecosystem"), override.ecosystem),
            q.eq(q.field("channel"), override.channel)
          )
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("directiveOverrides", {
        ...override,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created, skipped, total: DIRECTIVE_OVERRIDES.length };
  },
});

/**
 * Clear all directive overrides (use with caution)
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("directiveOverrides").collect();
    let deleted = 0;

    for (const item of all) {
      await ctx.db.delete(item._id);
      deleted++;
    }

    return { deleted };
  },
});

/**
 * Get all active overrides
 */
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("directiveOverrides")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Get overrides by ecosystem and channel
 */
export const getByContext = query({
  args: {
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get global overrides (no ecosystem/channel)
    const globalOverrides = await ctx.db
      .query("directiveOverrides")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .filter((q) => 
        q.and(
          q.eq(q.field("ecosystem"), undefined),
          q.eq(q.field("channel"), undefined)
        )
      )
      .collect();

    // Get ecosystem-specific overrides
    const ecosystemOverrides = args.ecosystem
      ? await ctx.db
          .query("directiveOverrides")
          .withIndex("by_ecosystem", (q) => q.eq("ecosystem", args.ecosystem))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect()
      : [];

    // Get channel-specific overrides
    const channelOverrides = args.channel
      ? await ctx.db
          .query("directiveOverrides")
          .withIndex("by_ecosystem_channel", (q) => 
            q.eq("ecosystem", args.ecosystem).eq("channel", args.channel)
          )
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect()
      : [];

    // Combine and sort by priority
    const allOverrides = [...globalOverrides, ...ecosystemOverrides, ...channelOverrides];
    return allOverrides.sort((a, b) => a.priority - b.priority);
  },
});

/**
 * Toggle override active status
 */
export const toggleActive = mutation({
  args: {
    id: v.id("directiveOverrides"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const override = await ctx.db.get(args.id);

    if (!override) {
      return { success: false, error: "Override not found" };
    }

    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
