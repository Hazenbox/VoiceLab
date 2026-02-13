/**
 * RAG Module
 * 
 * Retrieval-Augmented Generation enhancements for Voice Lab.
 * 
 * @module services/rag
 */

// Query Expansion
export {
  expandQuery,
  expandWithChannel,
  expandWithEcosystem,
  expandQueryFull,
  getSynonyms,
  JIO_SYNONYMS,
  CHANNEL_EXPANSIONS,
  ECOSYSTEM_EXPANSIONS,
  type ExpandedQuery,
} from './queryExpander';

// Result Ranking
export {
  rankResults,
  filterAndRank,
  groupByType,
  getTopPerType,
  deduplicateByContent,
  RANKING_CONFIG,
  TYPE_PRIORITIES,
  type RankedResult,
  type RankingContext,
} from './resultRanker';

// Resilience
export {
  withRetry,
  withTimeout,
  resilientRagOperation,
  isCircuitOpen,
  resetCircuitBreaker,
  getCircuitBreakerStatus,
  getAllCircuitBreakerStatuses,
  RESILIENCE_CONFIG,
  type RetryOptions,
  type RagOperationResult,
} from './ragResilience';
