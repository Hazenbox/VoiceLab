/**
 * Fallback Token Enforcement Rules
 * 
 * PHASE 0: Hardcoded critical rules for offline brand safety.
 * These rules are used when:
 * 1. Convex is unavailable (offline mode)
 * 2. localStorage cache is expired or empty
 * 3. Network failure prevents fetching fresh rules
 * 
 * CRITICAL: These rules MUST be kept in sync with the seeded rules in Convex.
 * Any changes here should also be reflected in convex/seedTokenEnforcementRules.ts
 * 
 * @module services/validation/fallbackRules
 */

import type { TokenEnforcementRule } from './tokenEnforcementAgent';

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK RULES - CRITICAL BRAND SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hardcoded fallback rules for offline brand safety
 * These are the minimum required rules to prevent brand damage
 */
export const FALLBACK_ENFORCEMENT_RULES: TokenEnforcementRule[] = [
  // ── SAFETY CRITICAL ───────────────────────────────────────────────────────────
  {
    _id: 'fallback_safety_emergency',
    tokenKey: 'safety.level',
    tokenValue: 'critical',
    ruleType: 'must_contain',
    patterns: ['112', 'emergency'],
    autoFixAction: 'add_disclaimer',
    autoFixValue: 'For immediate help, please call 112 or your local emergency services.',
    severity: 'error',
    errorMessage: 'Critical safety content must include emergency contact information',
    category: 'safety',
    priority: 99,
  },
  {
    _id: 'fallback_safety_selfharm',
    tokenKey: 'safety.domain',
    tokenValue: 'crisis',
    ruleType: 'must_not_contain',
    patterns: [
      'how to harm',
      'ways to hurt',
      'methods to end',
      'suicide method',
      'self-harm guide',
    ],
    severity: 'error',
    errorMessage: 'Content must not include harmful guidance',
    category: 'safety',
    priority: 98,
  },
  {
    _id: 'fallback_safety_fraud',
    tokenKey: 'safety.domain',
    tokenValue: 'security',
    ruleType: 'must_contain',
    patterns: ['verify', 'official'],
    autoFixAction: 'add_disclaimer',
    autoFixValue: 'Always verify through official Jio channels. Never share OTP or passwords.',
    severity: 'warning',
    errorMessage: 'Security-related content should include verification guidance',
    category: 'safety',
    priority: 97,
  },

  // ── CHANNEL LIMITS ────────────────────────────────────────────────────────────
  {
    _id: 'fallback_channel_sms',
    tokenKey: 'channel.type',
    tokenValue: 'sms',
    ruleType: 'max_length',
    patterns: ['160'],
    autoFixAction: 'truncate',
    severity: 'error',
    errorMessage: 'SMS content exceeds 160 character limit',
    category: 'channel',
    priority: 90,
  },
  {
    _id: 'fallback_channel_push',
    tokenKey: 'channel.type',
    tokenValue: 'push_notification',
    ruleType: 'max_length',
    patterns: ['100'],
    autoFixAction: 'truncate',
    severity: 'error',
    errorMessage: 'Push notification exceeds 100 character limit',
    category: 'channel',
    priority: 89,
  },

  // ── NUDGE BLOCKING ────────────────────────────────────────────────────────────
  {
    _id: 'fallback_nudge_blocked',
    tokenKey: 'nudge.permission',
    tokenValue: 'blocked',
    ruleType: 'must_not_contain',
    patterns: [
      'special offer',
      'limited time',
      'upgrade now',
      'exclusive deal',
      'discount',
      'free trial',
      'subscribe',
      'buy now',
    ],
    autoFixAction: 'remove',
    severity: 'error',
    errorMessage: 'Promotional content blocked by user preference',
    category: 'nudge',
    priority: 85,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all fallback rules
 */
export function getFallbackRules(): TokenEnforcementRule[] {
  return FALLBACK_ENFORCEMENT_RULES;
}

/**
 * Get fallback rules by category
 */
export function getFallbackRulesByCategory(category: string): TokenEnforcementRule[] {
  return FALLBACK_ENFORCEMENT_RULES.filter(rule => rule.category === category);
}

/**
 * Check if fallback rules are sufficient for safe operation
 * Returns true if we have at least brand and safety rules
 */
export function hasCriticalFallbackRules(): boolean {
  const hasBrand = FALLBACK_ENFORCEMENT_RULES.some(r => r.category === 'brand');
  const hasSafety = FALLBACK_ENFORCEMENT_RULES.some(r => r.category === 'safety');
  return hasBrand && hasSafety;
}

/**
 * Get the count of fallback rules by category
 */
export function getFallbackRulesCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const rule of FALLBACK_ENFORCEMENT_RULES) {
    const category = rule.category || 'uncategorized';
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}

console.log('[FallbackRules] Loaded', FALLBACK_ENFORCEMENT_RULES.length, 'hardcoded rules:', getFallbackRulesCounts());
