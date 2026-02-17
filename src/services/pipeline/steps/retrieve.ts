/**
 * Pipeline Step: Retrieve
 *
 * Retrieves knowledge context for prompt injection.
 * Includes: Convex knowledge, local corrections, semantic search (RAG).
 * Pure function -- no side effects beyond logging.
 */

import {
  retrieveKnowledge,
  getCodeDefaults,
  mergeLearnedCorrections,
  getLocalCorrections,
  enrichWithSemanticResults,
  type RetrievedKnowledge,
  type SemanticSearchResult,
} from '../../knowledge';
import {
  expandQueryFull,
  rankResults,
} from '../../rag';
import type { PipelineInput, RetrieveResult } from '../types';

const SEMANTIC_SEARCH_TIMEOUT_MS = 2000;

export async function retrieve(input: PipelineInput): Promise<RetrieveResult> {
  if (!input.featureFlags.knowledgeBase) {
    return { knowledge: null, retrievalCount: 0 };
  }

  try {
    const effectiveEcosystem = input.ecosystem;
    const effectiveChannel = input.contentChannel;

    // Start with code-level defaults or Convex data
    let knowledge: RetrievedKnowledge;

    if (input.externalData?.knowledge) {
      knowledge = retrieveKnowledge(
        {
          avoidWords: input.externalData.knowledge.avoidWords,
          preferredWords: input.externalData.knowledge.preferredWords,
          autoFixRules: input.externalData.knowledge.autoFixRules,
          approvedExamples: input.externalData.knowledge.approvedExamples,
          corrections: input.externalData.corrections || undefined,
        },
        effectiveEcosystem,
        effectiveChannel,
      );
    } else {
      knowledge = getCodeDefaults(effectiveEcosystem, effectiveChannel);
    }

    // Merge local corrections for immediate learning
    if (input.featureFlags.learning) {
      const localCorrections = getLocalCorrections(effectiveEcosystem, effectiveChannel);
      knowledge = mergeLearnedCorrections(knowledge, localCorrections, effectiveEcosystem, effectiveChannel);
    }

    // RAG: Semantic search enrichment
    if (input.externalData?.runSemanticSearch) {
      try {
        knowledge = await enrichWithRAG(
          input,
          knowledge,
          effectiveEcosystem,
          effectiveChannel,
        );
      } catch (ragError) {
        console.warn('[Pipeline:Retrieve] RAG enrichment failed:', ragError);
      }
    }

    const itemCount = (knowledge.avoidWords?.length ?? 0)
      + (knowledge.preferredWords?.length ?? 0)
      + (knowledge.corrections?.length ?? 0);

    return { knowledge, retrievalCount: itemCount };
  } catch (error) {
    console.warn('[Pipeline:Retrieve] Knowledge retrieval failed:', error);
    return { knowledge: null, retrievalCount: 0 };
  }
}

/** Internal: Parallel semantic search with timeout + ranking */
async function enrichWithRAG(
  input: PipelineInput,
  knowledge: RetrievedKnowledge,
  ecosystem: string,
  channel: string,
): Promise<RetrievedKnowledge> {
  const runSearch = input.externalData!.runSemanticSearch!;
  let searchQuery = input.message;

  // Query expansion
  if (input.featureFlags.ragQueryExpansion) {
    const expansion = expandQueryFull(input.message, {
      channel,
      ecosystem,
      maxExpansions: 3,
    });
    if (expansion.wasExpanded) {
      searchQuery = expansion.expanded;
    }
  }

  // Parallel searches with timeout
  const searchPromises = [
    runSearch({ query: searchQuery, limit: 20, filterActiveOnly: true }),
    runSearch({ query: searchQuery, limit: 30, filterType: 'avoid_word', filterActiveOnly: true }),
    runSearch({ query: searchQuery, limit: 20, filterType: 'preferred_word', filterActiveOnly: true }),
    runSearch({ query: searchQuery, limit: 20, filterType: 'auto_fix', filterActiveOnly: true }),
  ];

  const timeoutPromise = new Promise<null>(resolve =>
    setTimeout(() => resolve(null), SEMANTIC_SEARCH_TIMEOUT_MS)
  );

  const raceResult = await Promise.race([
    Promise.all(searchPromises),
    timeoutPromise,
  ]);

  if (!raceResult) {
    console.warn('[Pipeline:Retrieve] Semantic search timed out');
    return knowledge;
  }

  const [generalResults, avoidResults, preferredResults, autoFixResults] =
    raceResult as SemanticSearchResult[][];

  // Deduplicate and merge
  const seenIds = new Set<string>();
  const merged: SemanticSearchResult[] = [];
  for (const result of [...avoidResults, ...autoFixResults, ...preferredResults, ...generalResults]) {
    if (result._id && !seenIds.has(result._id)) {
      seenIds.add(result._id);
      merged.push(result);
    }
  }

  if (merged.length === 0) return knowledge;

  // Optional ranking
  let finalResults = merged;
  if (input.featureFlags.ragResultRanking) {
    finalResults = rankResults(
      merged,
      {
        ecosystem,
        channel,
        persona: input.featureFlags.persona ? input.userProfile?.role : undefined,
        query: input.message,
      },
      50,
    );
  }

  return enrichWithSemanticResults(knowledge, finalResults, 0.3);
}
