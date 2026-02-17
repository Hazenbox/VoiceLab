/**
 * Nudge Controller
 * 
 * Controls when and how to offer proactive suggestions/nudges.
 * Manages permission levels, relevance scoring, and sensitivity overrides.
 * 
 * @module services/nudge/nudgeController
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Permission levels for nudges
 */
export type NudgePermission =
  | 'always'          // Always show nudges
  | 'allowed'         // Default - show when appropriate
  | 'ask_first'       // Ask permission before nudging
  | 'minimal'         // Only show essential nudges
  | 'never';          // Never show nudges

/**
 * Relevance levels for nudges
 */
export type NudgeRelevance =
  | 'critical'        // Must-show (e.g., expiring plan)
  | 'high'            // Very relevant to current context
  | 'medium'          // Moderately relevant
  | 'low'             // Tangentially related
  | 'opportunistic';  // Just-in-case mention

/**
 * Nudge types
 */
export type NudgeType =
  | 'upsell'          // Upgrade/premium offering
  | 'cross_sell'      // Related product suggestion
  | 'reminder'        // Action reminder
  | 'tip'             // Helpful tip
  | 'offer'           // Current promotion
  | 'expiry_warning'  // Service expiry warning
  | 'feature_discovery'; // Feature awareness

/**
 * Nudge definition
 */
export interface Nudge {
  type: NudgeType;
  relevance: NudgeRelevance;
  message: string;
  cta?: string;
  ctaUrl?: string;
  conditions?: NudgeCondition[];
}

/**
 * Conditions for showing a nudge
 */
export interface NudgeCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: string | number | string[];
}

/**
 * Nudge decision result
 */
export interface NudgeDecision {
  /** Whether to show any nudge */
  shouldNudge: boolean;
  /** The nudge to show (if any) */
  nudge: Nudge | null;
  /** Reason for decision */
  reason: string;
  /** Was blocked by sensitivity override */
  blockedBySensitivity: boolean;
  /** Alternative nudge if primary blocked */
  alternative?: Nudge;
}

/**
 * Context for nudge decision
 */
export interface NudgeContext {
  permission: NudgePermission;
  emotion: string;
  intent: string;
  resolutionStatus: string;
  turnNumber: number;
  ecosystem: string;
  userSegment?: string;
  userPlan?: string;
  availableNudges?: Nudge[];
  recentNudgeTypes?: NudgeType[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Configuration data moved to config/nudges.ts -- edit content there
import {
  SENSITIVE_EMOTIONS,
  SENSITIVE_INTENTS,
  BLOCKED_RESOLUTION_STATUSES,
  RELEVANCE_THRESHOLDS,
} from '../../config/nudges';
export { SEGMENT_PERMISSIONS } from '../../config/nudges';

// ═══════════════════════════════════════════════════════════════════════════════
// NUDGE LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

// Nudge library moved to config/nudges.ts -- edit content there
export { NUDGE_LIBRARY } from '../../config/nudges';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine permission level from context
 */
export function determinePermission(context: Partial<NudgeContext>): NudgePermission {
  // Check for explicit permission
  if (context.permission) {
    return context.permission;
  }
  
  // Derive from user segment
  if (context.userSegment && SEGMENT_PERMISSIONS[context.userSegment]) {
    return SEGMENT_PERMISSIONS[context.userSegment];
  }
  
  return 'allowed';
}

/**
 * Check if nudges are blocked by sensitivity
 */
export function isSensitivityBlocked(context: NudgeContext): boolean {
  // Check emotion
  if (SENSITIVE_EMOTIONS.includes(context.emotion)) {
    return true;
  }
  
  // Check intent
  if (SENSITIVE_INTENTS.includes(context.intent)) {
    return true;
  }
  
  // Check resolution status
  if (BLOCKED_RESOLUTION_STATUSES.includes(context.resolutionStatus)) {
    return true;
  }
  
  // First 2 turns - focus on understanding, not nudging
  if (context.turnNumber <= 2 && context.intent === 'support') {
    return true;
  }
  
  return false;
}

/**
 * Get available nudges for context
 */
export function getAvailableNudges(context: NudgeContext): Nudge[] {
  // If custom nudges provided, use those
  if (context.availableNudges && context.availableNudges.length > 0) {
    return context.availableNudges;
  }
  
  // Get from library by ecosystem
  return NUDGE_LIBRARY[context.ecosystem] || [];
}

/**
 * Filter nudges by permission level
 */
export function filterByPermission(
  nudges: Nudge[],
  permission: NudgePermission
): Nudge[] {
  const allowedRelevances = RELEVANCE_THRESHOLDS[permission];
  return nudges.filter(n => allowedRelevances.includes(n.relevance));
}

/**
 * Filter out recently shown nudge types
 */
export function filterRecentlyShown(
  nudges: Nudge[],
  recentTypes: NudgeType[]
): Nudge[] {
  return nudges.filter(n => !recentTypes.includes(n.type));
}

/**
 * Score nudge relevance to current context
 */
export function scoreNudgeRelevance(nudge: Nudge, context: NudgeContext): number {
  let score = 0;
  
  // Base score from relevance
  const relevanceScores: Record<NudgeRelevance, number> = {
    critical: 1.0,
    high: 0.8,
    medium: 0.6,
    low: 0.4,
    opportunistic: 0.2,
  };
  score = relevanceScores[nudge.relevance];
  
  // Boost for matching intent
  if (context.intent === 'transaction' && (nudge.type === 'offer' || nudge.type === 'upsell')) {
    score += 0.2;
  }
  if (context.intent === 'inquiry' && nudge.type === 'feature_discovery') {
    score += 0.15;
  }
  
  // Boost for post-resolution nudges
  if (context.resolutionStatus === 'resolved') {
    score += 0.1;
  }
  
  // Reduce for early turns
  if (context.turnNumber <= 3) {
    score -= 0.1;
  }
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Main function: Decide whether and what to nudge
 */
export function decideNudge(context: NudgeContext): NudgeDecision {
  // Check permission level
  const permission = determinePermission(context);
  
  // If never, exit early
  if (permission === 'never') {
    return {
      shouldNudge: false,
      nudge: null,
      reason: 'nudges disabled by permission',
      blockedBySensitivity: false,
    };
  }
  
  // Check sensitivity override
  const sensitivityBlocked = isSensitivityBlocked(context);
  
  // Get and filter nudges
  let nudges = getAvailableNudges(context);
  nudges = filterByPermission(nudges, permission);
  
  // Filter recently shown
  if (context.recentNudgeTypes) {
    nudges = filterRecentlyShown(nudges, context.recentNudgeTypes);
  }
  
  if (nudges.length === 0) {
    return {
      shouldNudge: false,
      nudge: null,
      reason: 'no eligible nudges available',
      blockedBySensitivity: false,
    };
  }
  
  // Score and sort nudges
  const scoredNudges = nudges
    .map(n => ({ nudge: n, score: scoreNudgeRelevance(n, context) }))
    .sort((a, b) => b.score - a.score);
  
  const topNudge = scoredNudges[0];
  const alternative = scoredNudges[1]?.nudge;
  
  // If blocked by sensitivity, only allow critical
  if (sensitivityBlocked) {
    if (topNudge.nudge.relevance === 'critical') {
      return {
        shouldNudge: true,
        nudge: topNudge.nudge,
        reason: 'critical nudge shown despite sensitivity',
        blockedBySensitivity: true,
        alternative,
      };
    }
    return {
      shouldNudge: false,
      nudge: null,
      reason: 'blocked by sensitivity override',
      blockedBySensitivity: true,
      alternative: topNudge.nudge,
    };
  }
  
  return {
    shouldNudge: true,
    nudge: topNudge.nudge,
    reason: `showing ${topNudge.nudge.type} nudge (relevance: ${topNudge.nudge.relevance})`,
    blockedBySensitivity: false,
    alternative,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format nudge for prompt injection
 */
export function formatNudgeForPrompt(decision: NudgeDecision): string {
  if (!decision.shouldNudge || !decision.nudge) {
    return '## nudge: none (focus on primary response)';
  }
  
  const lines = [
    '## nudge opportunity',
    `type: ${decision.nudge.type}`,
    `message: "${decision.nudge.message}"`,
  ];
  
  if (decision.nudge.cta) {
    lines.push(`cta: "${decision.nudge.cta}"`);
  }
  
  lines.push('');
  lines.push('**integration guidance**:');
  lines.push('- add at end of response if natural');
  lines.push('- use subtle transition');
  lines.push('- do not overshadow primary help');
  
  return lines.join('\n');
}

/**
 * Get nudge permission display name
 */
export function getPermissionDisplayName(permission: NudgePermission): string {
  const names: Record<NudgePermission, string> = {
    always: 'show all suggestions',
    allowed: 'show relevant suggestions',
    ask_first: 'ask before suggesting',
    minimal: 'essential only',
    never: 'no suggestions',
  };
  return names[permission];
}

/**
 * Check if nudge type should be tracked
 */
export function shouldTrackNudge(type: NudgeType): boolean {
  // Track commercial nudges to avoid repetition
  const trackable: NudgeType[] = ['upsell', 'cross_sell', 'offer'];
  return trackable.includes(type);
}
