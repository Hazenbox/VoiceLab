/**
 * Token Enforcement Cache
 * 
 * Module-level cache for token enforcement rules from Convex.
 * This ensures rules are available even during race conditions
 * where the Convex useQuery hasn't resolved yet.
 * 
 * Pattern follows avoidWordsAgent.ts for consistency.
 * 
 * @module services/validation/tokenEnforcementCache
 */

import type { TokenEnforcementRule } from './tokenEnforcementAgent';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE-LEVEL CACHE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cached enforcement rules from Convex
 * Persists across React renders to avoid race conditions
 */
let cachedEnforcementRules: TokenEnforcementRule[] = [];

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set cached enforcement rules from Convex
 * Called when useQuery resolves with rules data
 */
export function setCachedEnforcementRules(rules: TokenEnforcementRule[]): void {
  cachedEnforcementRules = rules;
  console.log(`[TokenEnforcement] Cached ${rules.length} enforcement rules from Convex`);
  
  // Log brand protection rule specifically for debugging
  const brandRule = rules.find(r => r.category === 'brand');
  if (brandRule) {
    console.log(`[TokenEnforcement] Brand protection rule active:`, {
      tokenKey: brandRule.tokenKey,
      tokenValue: brandRule.tokenValue,
      patterns: brandRule.patterns,
      priority: brandRule.priority,
    });
  }
}

/**
 * Get cached enforcement rules
 * Returns the cached rules, or empty array if not yet loaded
 */
export function getCachedEnforcementRules(): TokenEnforcementRule[] {
  return cachedEnforcementRules;
}

/**
 * Check if enforcement rules are cached
 */
export function hasEnforcementRules(): boolean {
  return cachedEnforcementRules.length > 0;
}

/**
 * Clear cached enforcement rules (for testing/cleanup)
 */
export function clearCachedEnforcementRules(): void {
  cachedEnforcementRules = [];
}

/**
 * Get brand protection rules specifically
 * Useful for quick brand violation checks
 */
export function getBrandProtectionRules(): TokenEnforcementRule[] {
  return cachedEnforcementRules.filter(r => r.category === 'brand');
}
