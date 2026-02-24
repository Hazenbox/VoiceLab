/**
 * Token Enforcement Cache
 * 
 * Module-level cache for token enforcement rules from Convex.
 * This ensures rules are available even during race conditions
 * where the Convex useQuery hasn't resolved yet.
 * 
 * PHASE 0 UPDATE: Now includes localStorage persistence for offline safety.
 * Rules are persisted with 24h TTL to ensure brand safety when Convex unavailable.
 * 
 * Pattern follows avoidWordsAgent.ts for consistency.
 * 
 * @module services/validation/tokenEnforcementCache
 */

import type { TokenEnforcementRule } from './tokenEnforcementAgent';
import { getFallbackRules, hasCriticalFallbackRules } from './fallbackRules';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'voicelab_token_enforcement_rules';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedRulesData {
  rules: TokenEnforcementRule[];
  timestamp: number;
  version: number;
}

const CURRENT_CACHE_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE-LEVEL CACHE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cached enforcement rules from Convex
 * Persists across React renders to avoid race conditions
 */
let cachedEnforcementRules: TokenEnforcementRule[] = [];

/**
 * Track if we've loaded from localStorage on startup
 */
let hasLoadedFromStorage = false;

// ═══════════════════════════════════════════════════════════════════════════════
// LOCALSTORAGE PERSISTENCE (PHASE 0)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Persist rules to localStorage for offline safety
 * Called when fresh rules are received from Convex
 */
function persistRulesToStorage(rules: TokenEnforcementRule[]): void {
  try {
    const data: PersistedRulesData = {
      rules,
      timestamp: Date.now(),
      version: CURRENT_CACHE_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log(`[TokenEnforcement] Persisted ${rules.length} rules to localStorage`);
  } catch (error) {
    console.warn('[TokenEnforcement] Failed to persist rules to localStorage:', error);
  }
}

/**
 * Load rules from localStorage
 * Returns null if no valid cached data exists or data is expired
 */
function loadRulesFromStorage(): TokenEnforcementRule[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data: PersistedRulesData = JSON.parse(stored);
    
    // Version check
    if (data.version !== CURRENT_CACHE_VERSION) {
      console.log('[TokenEnforcement] Cache version mismatch, ignoring stored rules');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // TTL check
    const age = Date.now() - data.timestamp;
    if (age > CACHE_TTL_MS) {
      console.log(`[TokenEnforcement] Stored rules expired (age: ${Math.round(age / 1000 / 60)}min)`);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    console.log(`[TokenEnforcement] Loaded ${data.rules.length} rules from localStorage (age: ${Math.round(age / 1000 / 60)}min)`);
    return data.rules;
  } catch (error) {
    console.warn('[TokenEnforcement] Failed to load rules from localStorage:', error);
    return null;
  }
}

/**
 * Get age of persisted rules in milliseconds
 * Returns null if no valid cached data exists
 */
export function getPersistedRulesAge(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data: PersistedRulesData = JSON.parse(stored);
    return Date.now() - data.timestamp;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize cache from localStorage on first access
 * Called automatically when getting rules if not already loaded
 */
function ensureLoadedFromStorage(): void {
  if (hasLoadedFromStorage) return;
  
  hasLoadedFromStorage = true;
  
  const storedRules = loadRulesFromStorage();
  if (storedRules && storedRules.length > 0 && cachedEnforcementRules.length === 0) {
    cachedEnforcementRules = storedRules;
    console.log(`[TokenEnforcement] Initialized cache from localStorage with ${storedRules.length} rules`);
  }
}

/**
 * Set cached enforcement rules from Convex
 * Called when useQuery resolves with rules data
 * PHASE 0: Now also persists to localStorage for offline safety
 */
export function setCachedEnforcementRules(rules: TokenEnforcementRule[]): void {
  cachedEnforcementRules = rules;
  console.log(`[TokenEnforcement] Cached ${rules.length} enforcement rules from Convex`);
  
  // PHASE 0: Persist to localStorage for offline safety
  if (rules.length > 0) {
    persistRulesToStorage(rules);
  }
  
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
 * PHASE 0: Now loads from localStorage on first access if memory cache is empty
 * Returns the cached rules, or empty array if not yet loaded
 */
export function getCachedEnforcementRules(): TokenEnforcementRule[] {
  // PHASE 0: Try to load from localStorage if memory cache is empty
  ensureLoadedFromStorage();
  return cachedEnforcementRules;
}

/**
 * Check if enforcement rules are cached (in memory or localStorage)
 */
export function hasEnforcementRules(): boolean {
  ensureLoadedFromStorage();
  return cachedEnforcementRules.length > 0;
}

/**
 * Clear cached enforcement rules (for testing/cleanup)
 * Optionally clears localStorage as well
 */
export function clearCachedEnforcementRules(clearStorage = false): void {
  cachedEnforcementRules = [];
  hasLoadedFromStorage = false;
  
  if (clearStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[TokenEnforcement] Cleared localStorage cache');
    } catch (error) {
      console.warn('[TokenEnforcement] Failed to clear localStorage:', error);
    }
  }
}

/**
 * PHASE 0: Check if rules are available from any source
 * Returns true if rules are in memory, localStorage, or fallback
 */
export function isEnforcementAvailable(): boolean {
  ensureLoadedFromStorage();
  return cachedEnforcementRules.length > 0 || hasCriticalFallbackRules();
}

/**
 * PHASE 0: Get all enforcement rules with fallback support
 * Returns cached rules merged with fallback rules (fallback rules have lower priority)
 * This ensures brand safety even when Convex is unavailable
 */
export function getEnforcementRulesWithFallback(): TokenEnforcementRule[] {
  ensureLoadedFromStorage();
  
  // If we have cached rules, use them primarily
  if (cachedEnforcementRules.length > 0) {
    // Merge with fallback rules, avoiding duplicates by category
    const cachedCategories = new Set(cachedEnforcementRules.map(r => `${r.category}:${r.tokenKey}:${r.tokenValue}`));
    const additionalFallbacks = getFallbackRules().filter(
      fr => !cachedCategories.has(`${fr.category}:${fr.tokenKey}:${fr.tokenValue}`)
    );
    
    if (additionalFallbacks.length > 0) {
      console.log(`[TokenEnforcement] Merged ${additionalFallbacks.length} fallback rules with cached rules`);
    }
    
    return [...cachedEnforcementRules, ...additionalFallbacks];
  }
  
  // No cached rules - use fallback only
  console.warn('[TokenEnforcement] Using fallback rules only - Convex rules unavailable');
  return getFallbackRules();
}

/**
 * PHASE 0: Get enforcement status for diagnostics
 */
export function getEnforcementStatus(): {
  source: 'convex' | 'localStorage' | 'fallback' | 'none';
  ruleCount: number;
  cacheAge: number | null;
  hasFallback: boolean;
} {
  ensureLoadedFromStorage();
  
  const cacheAge = getPersistedRulesAge();
  const hasFallback = hasCriticalFallbackRules();
  
  let source: 'convex' | 'localStorage' | 'fallback' | 'none' = 'none';
  if (cachedEnforcementRules.length > 0) {
    source = cacheAge !== null && cacheAge < 60000 ? 'convex' : 'localStorage';
  } else if (hasFallback) {
    source = 'fallback';
  }
  
  return {
    source,
    ruleCount: cachedEnforcementRules.length || (hasFallback ? getFallbackRules().length : 0),
    cacheAge,
    hasFallback,
  };
}
