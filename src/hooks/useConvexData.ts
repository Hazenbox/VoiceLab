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
 */

import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { featureFlags } from '../services/featureFlags';
import { setDynamicAvoidWords } from '../services/validation';
import { setDynamicAutoFixRules } from '../services/trust';
import { setCachedEnforcementRules } from '../services/validation/tokenEnforcementCache';
import type { TokenEnforcementRule } from '../services/validation/tokenEnforcementAgent';
import { useConversationStore } from '../stores/conversationStore';

export function useConvexData(deviceId: string | undefined) {
  const { ecosystem, contentChannel } = useConversationStore(
    useShallow((s) => ({ ecosystem: s.ecosystem, contentChannel: s.contentChannel }))
  );

  // ── Convex Queries ──────────────────────────────────────────────────

  const convexKnowledge = useQuery(
    featureFlags.knowledgeBase ? api.knowledge.getKnowledgeForPrompt : undefined,
    featureFlags.knowledgeBase ? { ecosystem, channel: contentChannel } : 'skip'
  );

  const convexCorrections = useQuery(
    featureFlags.learning ? api.corrections.getLearningCorrections : undefined,
    featureFlags.learning ? { ecosystem, channel: contentChannel, limit: 20 } : 'skip'
  );

  const convexUserLearningProfile = useQuery(
    featureFlags.learning && deviceId ? api.userProfiles.getProfileByDeviceId : undefined,
    featureFlags.learning && deviceId ? { deviceId } : 'skip'
  );

  const convexTrainingExamples = useQuery(
    featureFlags.learning ? api.seedTrainingExamples.getHighQuality : undefined,
    featureFlags.learning ? { minScore: 4, limit: 5 } : 'skip'
  );

  const convexDirectiveOverrides = useQuery(
    featureFlags.constitutionalWrapper ? api.seedDirectiveOverrides.getByContext : undefined,
    featureFlags.constitutionalWrapper ? { ecosystem, channel: contentChannel } : 'skip'
  );

  // Always fetch -- brand protection is critical
  const convexTokenEnforcementRules = useQuery(
    api.tokenEnforcement.getActive,
    {}
  );

  // ── Convex Action ───────────────────────────────────────────────────

  const runSemanticSearch = useAction(api.embeddings.semanticSearch);

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
