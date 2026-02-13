/**
 * Result Ranker
 * 
 * Re-ranks RAG results using relevance and recency scoring.
 * Combines vector similarity scores with business logic.
 * 
 * @module services/rag/resultRanker
 */

import type { SemanticSearchResult } from '../knowledge/knowledgeRetriever';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const RANKING_CONFIG = {
  /** Weight for vector similarity score (0-1) */
  similarityWeight: 0.6,
  /** Weight for recency score (0-1) */
  recencyWeight: 0.15,
  /** Weight for type priority score (0-1) */
  typePriorityWeight: 0.15,
  /** Weight for context match score (0-1) */
  contextMatchWeight: 0.1,
  /** Recency half-life in days (older items get lower scores) */
  recencyHalfLifeDays: 30,
} as const;

/**
 * Type priority - some knowledge types are more valuable than others
 */
export const TYPE_PRIORITIES: Record<string, number> = {
  'approved_example': 1.0,      // Best: actual examples to follow
  'auto_fix': 0.9,              // High: direct corrections
  'avoid_word': 0.8,            // High: things to avoid
  'preferred_word': 0.7,        // Good: vocabulary guidance
  'product_definition': 0.6,    // Useful: context
  'festival': 0.5,              // Contextual: cultural awareness
  'channel_override': 0.8,      // High: channel-specific rules
  'ecosystem_override': 0.7,    // Good: ecosystem rules
  'trigger_override': 0.6,      // Useful: special handling
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RankedResult extends SemanticSearchResult {
  /** Combined ranking score (0-1) */
  rankScore: number;
  /** Individual score components for debugging */
  scoreBreakdown: {
    similarity: number;
    recency: number;
    typePriority: number;
    contextMatch: number;
  };
}

export interface RankingContext {
  /** Current ecosystem for context matching */
  ecosystem?: string;
  /** Current channel for context matching */
  channel?: string;
  /** Current persona for context matching */
  persona?: string;
  /** User query for relevance boost */
  query?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate recency score based on item age
 * Uses exponential decay with configurable half-life
 */
function calculateRecencyScore(createdAt: number): number {
  const now = Date.now();
  const ageMs = now - createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  
  // Exponential decay: score = 0.5^(age/halfLife)
  const halfLife = RANKING_CONFIG.recencyHalfLifeDays;
  const score = Math.pow(0.5, ageDays / halfLife);
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate type priority score
 */
function calculateTypePriorityScore(type: string): number {
  return TYPE_PRIORITIES[type] ?? 0.5; // Default to middle priority
}

/**
 * Calculate context match score
 * Higher score if item matches the current ecosystem/channel/persona
 */
function calculateContextMatchScore(
  item: SemanticSearchResult,
  context: RankingContext
): number {
  let matches = 0;
  let total = 0;
  
  // Ecosystem match
  if (context.ecosystem) {
    total++;
    if (!item.metadata.ecosystem || item.metadata.ecosystem === context.ecosystem) {
      matches++;
    }
  }
  
  // Channel match
  if (context.channel) {
    total++;
    if (!item.metadata.channel || item.metadata.channel === context.channel) {
      matches++;
    }
  }
  
  // Persona match
  if (context.persona) {
    total++;
    if (!item.metadata.persona || item.metadata.persona === context.persona) {
      matches++;
    }
  }
  
  // If no context provided, return neutral score
  if (total === 0) return 0.5;
  
  return matches / total;
}

/**
 * Calculate combined rank score
 */
function calculateRankScore(
  item: SemanticSearchResult,
  context: RankingContext
): { rankScore: number; scoreBreakdown: RankedResult['scoreBreakdown'] } {
  const similarity = item._score; // Already 0-1 from vector search
  const recency = calculateRecencyScore(item.createdAt);
  const typePriority = calculateTypePriorityScore(item.type);
  const contextMatch = calculateContextMatchScore(item, context);
  
  const rankScore = 
    (similarity * RANKING_CONFIG.similarityWeight) +
    (recency * RANKING_CONFIG.recencyWeight) +
    (typePriority * RANKING_CONFIG.typePriorityWeight) +
    (contextMatch * RANKING_CONFIG.contextMatchWeight);
  
  return {
    rankScore,
    scoreBreakdown: {
      similarity,
      recency,
      typePriority,
      contextMatch,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RANKING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rank and re-order semantic search results
 * 
 * @param results - Results from semantic search
 * @param context - Current context for relevance boosting
 * @param limit - Maximum results to return
 * @returns Ranked and sorted results
 */
export function rankResults(
  results: SemanticSearchResult[],
  context: RankingContext = {},
  limit?: number
): RankedResult[] {
  if (results.length === 0) return [];
  
  // Calculate rank scores for all results
  const ranked: RankedResult[] = results.map(item => {
    const { rankScore, scoreBreakdown } = calculateRankScore(item, context);
    return {
      ...item,
      rankScore,
      scoreBreakdown,
    };
  });
  
  // Sort by rank score (descending)
  ranked.sort((a, b) => b.rankScore - a.rankScore);
  
  // Apply limit if specified
  return limit ? ranked.slice(0, limit) : ranked;
}

/**
 * Filter and rank results with minimum score threshold
 */
export function filterAndRank(
  results: SemanticSearchResult[],
  context: RankingContext = {},
  options: {
    minSimilarity?: number;
    minRankScore?: number;
    limit?: number;
  } = {}
): RankedResult[] {
  const { minSimilarity = 0.5, minRankScore = 0.3, limit } = options;
  
  // First filter by minimum similarity
  const filtered = results.filter(r => r._score >= minSimilarity);
  
  // Rank the filtered results
  const ranked = rankResults(filtered, context);
  
  // Further filter by minimum rank score
  const finalResults = ranked.filter(r => r.rankScore >= minRankScore);
  
  return limit ? finalResults.slice(0, limit) : finalResults;
}

/**
 * Group ranked results by type for organized display
 */
export function groupByType(results: RankedResult[]): Map<string, RankedResult[]> {
  const groups = new Map<string, RankedResult[]>();
  
  for (const result of results) {
    const existing = groups.get(result.type) || [];
    existing.push(result);
    groups.set(result.type, existing);
  }
  
  return groups;
}

/**
 * Get top N results per type (for balanced representation)
 */
export function getTopPerType(
  results: RankedResult[],
  topN: number = 2
): RankedResult[] {
  const groups = groupByType(results);
  const balanced: RankedResult[] = [];
  
  for (const [_type, items] of groups) {
    balanced.push(...items.slice(0, topN));
  }
  
  // Re-sort by rank score
  return balanced.sort((a, b) => b.rankScore - a.rankScore);
}

/**
 * Deduplicate results by content (keeps highest ranked)
 */
export function deduplicateByContent(results: RankedResult[]): RankedResult[] {
  const seen = new Set<string>();
  const unique: RankedResult[] = [];
  
  for (const result of results) {
    // Create a simple fingerprint from content
    const fingerprint = result.content.toLowerCase().trim().slice(0, 100);
    
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      unique.push(result);
    }
  }
  
  return unique;
}
