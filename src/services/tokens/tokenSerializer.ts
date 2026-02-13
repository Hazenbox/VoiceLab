/**
 * Token Serializer
 * 
 * Serializes active tokens into a structured prompt block format
 * that can be injected into LLM system prompts.
 * 
 * @module services/tokens/tokenSerializer
 */

import type { ActiveTokens } from './tokenTypes';
import { TOKEN_GROUPS } from './tokenTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get nested value from tokens object using dot notation
 */
function getTokenValue(tokens: Partial<ActiveTokens>, key: string): unknown {
  // Direct key access (most tokens use dot notation as the key itself)
  if (key in tokens) {
    return (tokens as Record<string, unknown>)[key];
  }
  
  // Try nested access for keys like 'memory.session.last_intent'
  const parts = key.split('.');
  let current: unknown = tokens;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

/**
 * Format token value for display in prompt
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'none';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERIALIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize tokens into a structured prompt block
 * 
 * Output format:
 * ```
 * ## Active Tokens
 * 
 * [ROUTING]
 * route.mode=jio_task
 * route.confidence=high
 * 
 * [SAFETY]
 * safety.domain=none
 * ...
 * ```
 */
export function serializeTokensToPromptBlock(tokens: Partial<ActiveTokens>): string {
  const sections: string[] = ['## Active Tokens\n'];
  
  for (const [groupName, keys] of Object.entries(TOKEN_GROUPS)) {
    const groupTokens: string[] = [];
    
    for (const key of keys) {
      const value = getTokenValue(tokens, key);
      if (value !== undefined && value !== null && value !== '') {
        groupTokens.push(`${key}=${formatValue(value)}`);
      }
    }
    
    if (groupTokens.length > 0) {
      sections.push(`[${groupName}]\n${groupTokens.join('\n')}`);
    }
  }
  
  return sections.join('\n\n');
}

/**
 * Serialize tokens into a compact single-line format
 * Useful for logging or debugging
 * 
 * Output format: "route.mode=jio_task;route.confidence=high;safety.domain=none"
 */
export function serializeTokensCompact(tokens: Partial<ActiveTokens>): string {
  const parts: string[] = [];
  
  for (const keys of Object.values(TOKEN_GROUPS)) {
    for (const key of keys) {
      const value = getTokenValue(tokens, key);
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${key}=${formatValue(value)}`);
      }
    }
  }
  
  return parts.join(';');
}

/**
 * Serialize tokens into a JSON-friendly object
 * Only includes defined tokens
 */
export function serializeTokensToObject(tokens: Partial<ActiveTokens>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const keys of Object.values(TOKEN_GROUPS)) {
    for (const key of keys) {
      const value = getTokenValue(tokens, key);
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    }
  }
  
  return result;
}

/**
 * Get tokens grouped by category
 * Useful for UI display
 */
export function getTokensByGroup(tokens: Partial<ActiveTokens>): Record<string, Record<string, unknown>> {
  const grouped: Record<string, Record<string, unknown>> = {};
  
  for (const [groupName, keys] of Object.entries(TOKEN_GROUPS)) {
    const groupTokens: Record<string, unknown> = {};
    
    for (const key of keys) {
      const value = getTokenValue(tokens, key);
      if (value !== undefined && value !== null && value !== '') {
        groupTokens[key] = value;
      }
    }
    
    if (Object.keys(groupTokens).length > 0) {
      grouped[groupName] = groupTokens;
    }
  }
  
  return grouped;
}

/**
 * Count active tokens
 */
export function countActiveTokens(tokens: Partial<ActiveTokens>): {
  total: number;
  byGroup: Record<string, number>;
} {
  const byGroup: Record<string, number> = {};
  let total = 0;
  
  for (const [groupName, keys] of Object.entries(TOKEN_GROUPS)) {
    let groupCount = 0;
    
    for (const key of keys) {
      const value = getTokenValue(tokens, key);
      if (value !== undefined && value !== null && value !== '') {
        groupCount++;
        total++;
      }
    }
    
    byGroup[groupName] = groupCount;
  }
  
  return { total, byGroup };
}

/**
 * Generate a token signature for caching/debugging
 * Creates a hash-like string based on active tokens
 */
export function generateTokenSignature(tokens: Partial<ActiveTokens>): string {
  const compact = serializeTokensCompact(tokens);
  // Simple hash function for signature
  let hash = 0;
  for (let i = 0; i < compact.length; i++) {
    const char = compact.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `tok_${Math.abs(hash).toString(36)}`;
}

/**
 * Merge two token sets, with second taking precedence
 */
export function mergeTokens(
  base: Partial<ActiveTokens>,
  override: Partial<ActiveTokens>
): Partial<ActiveTokens> {
  return {
    ...base,
    ...override,
  };
}

/**
 * Validate token values against known types
 * Returns list of invalid tokens
 */
export function validateTokens(tokens: Partial<ActiveTokens>): {
  valid: boolean;
  errors: Array<{ key: string; message: string }>;
} {
  const errors: Array<{ key: string; message: string }> = [];
  
  // Check for unknown keys
  const allKnownKeys = new Set(Object.values(TOKEN_GROUPS).flat());
  for (const key of Object.keys(tokens)) {
    if (!allKnownKeys.has(key)) {
      errors.push({ key, message: `Unknown token key: ${key}` });
    }
  }
  
  // Validate specific token values
  const turnCount = tokens['conversation.turn_count'];
  if (turnCount !== undefined && (typeof turnCount !== 'number' || turnCount < 0)) {
    errors.push({ key: 'conversation.turn_count', message: 'Must be a non-negative number' });
  }
  
  const emotionIntensity = tokens['emotion.intensity'];
  if (emotionIntensity !== undefined && typeof emotionIntensity === 'number') {
    if (emotionIntensity < 1 || emotionIntensity > 10) {
      errors.push({ key: 'emotion.intensity', message: 'Numeric intensity must be 1-10' });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESERIALIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse compact token string back into tokens object
 */
export function parseCompactTokens(compact: string): Partial<ActiveTokens> {
  const tokens: Record<string, unknown> = {};
  
  if (!compact) return tokens;
  
  const pairs = compact.split(';');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      // Try to parse numbers
      const numValue = Number(value);
      if (!isNaN(numValue) && value.trim() !== '') {
        tokens[key] = numValue;
      } else if (value === 'true') {
        tokens[key] = true;
      } else if (value === 'false') {
        tokens[key] = false;
      } else {
        tokens[key] = value;
      }
    }
  }
  
  return tokens as Partial<ActiveTokens>;
}
