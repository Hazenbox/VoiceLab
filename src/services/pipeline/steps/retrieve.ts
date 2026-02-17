/**
 * Pipeline Step: Retrieve
 *
 * Retrieves knowledge context for prompt injection.
 * Calls: knowledge/ layer only
 */

import {
  retrieveKnowledge,
  getCodeDefaults,
  mergeLearnedCorrections,
  type RetrievedKnowledge,
} from '../../knowledge';
import type { PipelineInput, RetrieveResult } from '../types';

export function retrieve(input: PipelineInput): RetrieveResult {
  if (!input.featureFlags.knowledgeBase) {
    return { knowledge: null, retrievalCount: 0 };
  }

  try {
    const codeDefaults = getCodeDefaults(input.ecosystem);

    const convexItems = input.externalData?.knowledgeItems;
    const corrections = input.externalData?.corrections;

    let knowledge: RetrievedKnowledge = codeDefaults;

    if (convexItems && Array.isArray(convexItems) && convexItems.length > 0) {
      knowledge = retrieveKnowledge(convexItems as Parameters<typeof retrieveKnowledge>[0], input.ecosystem);
    }

    if (corrections && Array.isArray(corrections) && corrections.length > 0) {
      knowledge = mergeLearnedCorrections(knowledge, corrections as Parameters<typeof mergeLearnedCorrections>[1]);
    }

    const itemCount = (knowledge.avoidWords?.length ?? 0)
      + (knowledge.preferredWords?.length ?? 0)
      + (knowledge.products?.length ?? 0);

    return {
      knowledge,
      retrievalCount: itemCount,
    };
  } catch (error) {
    console.warn('[Pipeline:Retrieve] Knowledge retrieval failed:', error);
    return { knowledge: null, retrievalCount: 0 };
  }
}
