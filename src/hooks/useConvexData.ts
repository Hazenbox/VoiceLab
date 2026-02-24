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
 */

import { useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { featureFlags } from '../services/featureFlags';
import { setDynamicAvoidWords } from '../services/validation';
import { setDynamicAutoFixRules } from '../services/trust';
import { setCachedEnforcementRules } from '../services/validation/tokenEnforcementCache';
import type { TokenEnforcementRule } from '../services/validation/tokenEnforcementAgent';
import { useConversationStore } from '../stores/conversationStore';

// Check offline mode at module level
const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';

export function useConvexData(deviceId: string | undefined) {
  const { ecosystem, contentChannel } = useConversationStore(
    useShallow((s) => ({ ecosystem: s.ecosystem, contentChannel: s.contentChannel }))
  );

  // ── Convex Queries ──────────────────────────────────────────────────
  // In offline mode, all queries skip execution by passing 'skip'

  const convexKnowledge = useQuery(
    api.knowledge.getKnowledgeForPrompt,
    offlineMode 
      ? 'skip' 
      : (featureFlags.knowledgeBase ? { ecosystem, channel: contentChannel } : 'skip')
  );

  const convexCorrections = useQuery(
    api.corrections.getLearningCorrections,
    offlineMode 
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
    offlineMode 
      ? 'skip' 
      : (featureFlags.learning ? { minScore: 4, limit: 5 } : 'skip')
  );

  const convexDirectiveOverrides = useQuery(
    api.seedDirectiveOverrides.getByContext,
    offlineMode 
      ? 'skip' 
      : (featureFlags.constitutionalWrapper ? { ecosystem, channel: contentChannel } : 'skip')
  );

  // Always fetch (when online) -- brand protection is critical
  const convexTokenEnforcementRules = useQuery(
    api.tokenEnforcement.getActive,
    offlineMode ? 'skip' : {}
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

  useEffect(() => {
    if (convexKnowledge?.avoidWords && featureFlags.knowledgeBase) {
      const dynamicWords = convexKnowledge.avoidWords.map(item => ({
        content: item.content,
        category: item.category || 'dynamic',
        severity: item.metadata?.severity || 'warning',
      }));
      setDynamicAvoidWords(dynamicWords);
    }
  }, [convexKnowledge?.avoidWords]);

  useEffect(() => {
    if (convexKnowledge?.autoFixRules && featureFlags.knowledgeBase) {
      setDynamicAutoFixRules(convexKnowledge.autoFixRules);
    }
  }, [convexKnowledge?.autoFixRules]);

  useEffect(() => {
    if (convexTokenEnforcementRules && convexTokenEnforcementRules.length > 0) {
      setCachedEnforcementRules(convexTokenEnforcementRules as TokenEnforcementRule[]);
    }
  }, [convexTokenEnforcementRules]);

  // Log offline mode status once
  useEffect(() => {
    if (offlineMode) {
      console.info('[useConvexData] Running in offline mode - Convex queries skipped');
    }
  }, []);

  // ── Return ──────────────────────────────────────────────────────────

  return {
    convexKnowledge,
    convexCorrections,
    convexUserLearningProfile,
    convexTrainingExamples,
    convexDirectiveOverrides,
    convexTokenEnforcementRules,
    runSemanticSearch,
  };
}
