/**
 * useConvexData -- centralizes all Convex queries and injection side-effects
 *
 * Extracted from App.tsx. Handles:
 * - 6 Convex useQuery calls (knowledge, corrections, learning profile, training examples,
 *   directive overrides, token enforcement rules)
 * - 1 Convex useAction (semantic search)
 * - 3 injection useEffects (avoid words, auto-fix rules, token enforcement cache)
 *
 * Reads ecosystem/contentChannel from conversationStore (no props needed for those).
 * Accepts deviceId as prop since userProfile is local state in App.tsx.
 * 
 * Supports offline mode: when VITE_OFFLINE_MODE=true, all queries are skipped
 * and return undefined. The ConvexProvider is still used to satisfy hook requirements.
 * 
 * PHASE 1: Implements client-side TTL caching to reduce Convex function calls.
 * Cache is checked before making Convex queries; fresh data updates the cache.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { featureFlags } from '../services/featureFlags';
import { setDynamicAvoidWords } from '../services/validation';
import { setDynamicAutoFixRules } from '../services/trust';
import { setCachedEnforcementRules } from '../services/validation/tokenEnforcementCache';
import type { TokenEnforcementRule } from '../services/validation/tokenEnforcementAgent';
import { useConversationStore } from '../stores/conversationStore';
import {
  queryCache,
  knowledgeCacheKey,
  enforcementCacheKey,
  examplesCacheKey,
  directivesCacheKey,
  correctionsCacheKey,
  CACHE_TTL,
  CACHE_STALE,
} from '../lib/cache';

// Check offline mode at module level
const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';

// Track if we've logged cache stats this session
let hasLoggedCacheInit = false;

export function useConvexData(deviceId: string | undefined) {
  const { ecosystem, contentChannel } = useConversationStore(
    useShallow((s) => ({ ecosystem: s.ecosystem, contentChannel: s.contentChannel }))
  );

  // PHASE 1: Track which queries should be skipped due to fresh cache
  const [skipKnowledge, setSkipKnowledge] = useState(false);
  const [skipEnforcement, setSkipEnforcement] = useState(false);
  const [skipExamples, setSkipExamples] = useState(false);
  const [skipDirectives, setSkipDirectives] = useState(false);
  const [skipCorrections, setSkipCorrections] = useState(false);
  
  // Track previous ecosystem/channel to detect changes
  const prevContextRef = useRef<string>('');
  
  // PHASE 1: Check cache on context change and determine what to skip
  useEffect(() => {
    const currentContext = `${ecosystem}:${contentChannel}`;
    const contextChanged = prevContextRef.current !== currentContext;
    prevContextRef.current = currentContext;
    
    // If context changed, reset skip flags and check cache freshness
    if (contextChanged || !hasLoggedCacheInit) {
      // Knowledge cache
      const knowledgeKey = knowledgeCacheKey(ecosystem, contentChannel);
      const knowledgeFresh = queryCache.isFresh(knowledgeKey);
      setSkipKnowledge(knowledgeFresh);
      
      // Enforcement cache (global, not per-context)
      const enforcementKey = enforcementCacheKey();
      const enforcementFresh = queryCache.isFresh(enforcementKey);
      setSkipEnforcement(enforcementFresh);
      
      // Examples cache
      const examplesKey = examplesCacheKey(ecosystem, contentChannel);
      const examplesFresh = queryCache.isFresh(examplesKey);
      setSkipExamples(examplesFresh);
      
      // Directives cache
      const directivesKey = directivesCacheKey(ecosystem, contentChannel);
      const directivesFresh = queryCache.isFresh(directivesKey);
      setSkipDirectives(directivesFresh);
      
      // Corrections cache
      const correctionsKey = correctionsCacheKey(ecosystem, contentChannel);
      const correctionsFresh = queryCache.isFresh(correctionsKey);
      setSkipCorrections(correctionsFresh);
      
      if (!hasLoggedCacheInit) {
        hasLoggedCacheInit = true;
        console.log('[useConvexData] Cache check on init:', {
          knowledgeFresh,
          enforcementFresh,
          examplesFresh,
          directivesFresh,
          correctionsFresh,
        });
      }
    }
  }, [ecosystem, contentChannel]);

  // ── Convex Queries ──────────────────────────────────────────────────
  // In offline mode, all queries skip execution by passing 'skip'
  // PHASE 1: Also skip if cache is fresh

  const convexKnowledge = useQuery(
    api.knowledge.getKnowledgeForPrompt,
    offlineMode || skipKnowledge
      ? 'skip' 
      : (featureFlags.knowledgeBase ? { ecosystem, channel: contentChannel } : 'skip')
  );

  const convexCorrections = useQuery(
    api.corrections.getLearningCorrections,
    offlineMode || skipCorrections
      ? 'skip' 
      : (featureFlags.learning ? { ecosystem, channel: contentChannel, limit: 20 } : 'skip')
  );

  const convexUserLearningProfile = useQuery(
    api.userProfiles.getProfileByDeviceId,
    offlineMode 
      ? 'skip' 
      : (featureFlags.learning && deviceId ? { deviceId } : 'skip')
  );

  const convexTrainingExamples = useQuery(
    api.seedTrainingExamples.getHighQuality,
    offlineMode || skipExamples
      ? 'skip' 
      : (featureFlags.learning ? { minScore: 4, limit: 5 } : 'skip')
  );

  const convexDirectiveOverrides = useQuery(
    api.seedDirectiveOverrides.getByContext,
    offlineMode || skipDirectives
      ? 'skip' 
      : (featureFlags.constitutionalWrapper ? { ecosystem, channel: contentChannel } : 'skip')
  );

  // Always fetch (when online) -- brand protection is critical
  // PHASE 1: Skip if cache is fresh
  const convexTokenEnforcementRules = useQuery(
    api.tokenEnforcement.getActive,
    offlineMode || skipEnforcement ? 'skip' : {}
  );

  // ── Convex Action ───────────────────────────────────────────────────

  const convexSemanticSearch = useAction(api.embeddings.semanticSearch);
  
  // Wrap semantic search to handle offline mode
  const runSemanticSearch = useCallback(async (...args: Parameters<typeof convexSemanticSearch>) => {
    if (offlineMode) {
      console.warn('[useConvexData] Semantic search unavailable in offline mode');
      return [];
    }
    try {
      return await convexSemanticSearch(...args);
    } catch (error) {
      console.warn('[useConvexData] Semantic search failed:', error);
      return [];
    }
  }, [convexSemanticSearch]);

  // ── Injection Side-Effects ──────────────────────────────────────────
  // PHASE 1: Also update TTL cache when fresh data arrives

  useEffect(() => {
    if (convexKnowledge?.avoidWords && featureFlags.knowledgeBase) {
      const dynamicWords = convexKnowledge.avoidWords.map(item => ({
        content: item.content,
        category: item.category || 'dynamic',
        severity: item.metadata?.severity || 'warning',
      }));
      setDynamicAvoidWords(dynamicWords);
      
      // PHASE 1: Update cache with fresh data
      const cacheKey = knowledgeCacheKey(ecosystem, contentChannel);
      queryCache.set(cacheKey, convexKnowledge, CACHE_TTL.KNOWLEDGE, CACHE_STALE.KNOWLEDGE);
      console.log(`[useConvexData] Cached knowledge data for ${ecosystem}:${contentChannel}`);
    }
  }, [convexKnowledge, ecosystem, contentChannel]);

  useEffect(() => {
    if (convexKnowledge?.autoFixRules && featureFlags.knowledgeBase) {
      setDynamicAutoFixRules(convexKnowledge.autoFixRules);
    }
  }, [convexKnowledge?.autoFixRules]);

  useEffect(() => {
    if (convexTokenEnforcementRules && convexTokenEnforcementRules.length > 0) {
      setCachedEnforcementRules(convexTokenEnforcementRules as TokenEnforcementRule[]);
      
      // PHASE 1: Update cache with fresh enforcement rules
      const cacheKey = enforcementCacheKey();
      queryCache.set(cacheKey, convexTokenEnforcementRules, CACHE_TTL.ENFORCEMENT, CACHE_STALE.ENFORCEMENT);
      console.log(`[useConvexData] Cached ${convexTokenEnforcementRules.length} enforcement rules`);
    }
  }, [convexTokenEnforcementRules]);

  // PHASE 1: Cache training examples
  useEffect(() => {
    if (convexTrainingExamples && convexTrainingExamples.length > 0) {
      const cacheKey = examplesCacheKey(ecosystem, contentChannel);
      queryCache.set(cacheKey, convexTrainingExamples, CACHE_TTL.EXAMPLES, CACHE_STALE.EXAMPLES);
      console.log(`[useConvexData] Cached ${convexTrainingExamples.length} training examples`);
    }
  }, [convexTrainingExamples, ecosystem, contentChannel]);

  // PHASE 1: Cache directive overrides
  useEffect(() => {
    if (convexDirectiveOverrides && convexDirectiveOverrides.length > 0) {
      const cacheKey = directivesCacheKey(ecosystem, contentChannel);
      queryCache.set(cacheKey, convexDirectiveOverrides, CACHE_TTL.DIRECTIVES, CACHE_STALE.DIRECTIVES);
      console.log(`[useConvexData] Cached ${convexDirectiveOverrides.length} directive overrides`);
    }
  }, [convexDirectiveOverrides, ecosystem, contentChannel]);

  // PHASE 1: Cache corrections
  useEffect(() => {
    if (convexCorrections && convexCorrections.length > 0) {
      const cacheKey = correctionsCacheKey(ecosystem, contentChannel);
      queryCache.set(cacheKey, convexCorrections, CACHE_TTL.CORRECTIONS, CACHE_STALE.CORRECTIONS);
      console.log(`[useConvexData] Cached ${convexCorrections.length} corrections`);
    }
  }, [convexCorrections, ecosystem, contentChannel]);

  // Log offline mode status once
  useEffect(() => {
    if (offlineMode) {
      console.info('[useConvexData] Running in offline mode - Convex queries skipped');
    }
  }, []);
  
  // PHASE 1: Log cache stats periodically (every 5 minutes)
  useEffect(() => {
    const logStats = () => {
      const stats = queryCache.getStats();
      if (stats.hits + stats.misses > 0) {
        console.log('[useConvexData] Cache stats:', {
          ...stats,
          hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
        });
      }
    };
    
    const interval = setInterval(logStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Return ──────────────────────────────────────────────────────────
  // PHASE 1: Return cached data when query is skipped due to fresh cache

  // Get cached data if query was skipped
  const cachedKnowledge = skipKnowledge 
    ? queryCache.get(knowledgeCacheKey(ecosystem, contentChannel)) 
    : null;
  const cachedEnforcement = skipEnforcement 
    ? queryCache.get(enforcementCacheKey()) 
    : null;
  const cachedExamples = skipExamples 
    ? queryCache.get(examplesCacheKey(ecosystem, contentChannel)) 
    : null;
  const cachedDirectives = skipDirectives 
    ? queryCache.get(directivesCacheKey(ecosystem, contentChannel)) 
    : null;
  const cachedCorrections = skipCorrections 
    ? queryCache.get(correctionsCacheKey(ecosystem, contentChannel)) 
    : null;

  return {
    // Return Convex data if available, otherwise cached data
    convexKnowledge: convexKnowledge ?? cachedKnowledge,
    convexCorrections: convexCorrections ?? cachedCorrections,
    convexUserLearningProfile,
    convexTrainingExamples: convexTrainingExamples ?? cachedExamples,
    convexDirectiveOverrides: convexDirectiveOverrides ?? cachedDirectives,
    convexTokenEnforcementRules: convexTokenEnforcementRules ?? cachedEnforcement,
    runSemanticSearch,
    // PHASE 1: Expose cache status for debugging
    cacheStatus: {
      knowledgeFromCache: skipKnowledge && !!cachedKnowledge,
      enforcementFromCache: skipEnforcement && !!cachedEnforcement,
      examplesFromCache: skipExamples && !!cachedExamples,
      directivesFromCache: skipDirectives && !!cachedDirectives,
      correctionsFromCache: skipCorrections && !!cachedCorrections,
    },
  };
}
