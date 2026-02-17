/**
 * Convex HTTP Client for API Routes
 * 
 * Provides server-side access to Convex data for the generation pipeline.
 * Uses the Convex HTTP client instead of React hooks.
 * 
 * Phase 6B: Data fetching for /api/generate endpoint.
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import type { ServerExternalData } from '../src/services/pipeline/shared/types';

// Initialize Convex HTTP client
let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('CONVEX_URL environment variable is not set');
    }
    convexClient = new ConvexHttpClient(convexUrl);
  }
  return convexClient;
}

/**
 * Fetch knowledge data for the pipeline (avoid words, preferred words, auto-fix rules).
 */
export async function fetchKnowledge(
  ecosystem?: string,
  channel?: string
): Promise<ServerExternalData['knowledge']> {
  try {
    const client = getConvexClient();
    const result = await client.query(api.knowledge.getKnowledgeForPrompt, {
      ecosystem,
      channel,
    });
    
    return {
      avoidWords: result?.avoidWords?.map((item: { content: string }) => item.content) || [],
      preferredWords: result?.preferredWords?.map((item: { content: string }) => item.content) || [],
      autoFixRules: result?.autoFixRules?.map((item: { content: string; metadata?: { suggestion?: string } }) => ({
        content: item.content,
        metadata: item.metadata,
      })) || [],
      approvedExamples: result?.approvedExamples || [],
    };
  } catch (error) {
    console.error('[Convex] Failed to fetch knowledge:', error);
    // Return empty data on failure - pipeline has hardcoded fallbacks
    return {
      avoidWords: [],
      preferredWords: [],
      autoFixRules: [],
      approvedExamples: [],
    };
  }
}

/**
 * Fetch token enforcement rules for brand protection.
 */
export async function fetchTokenEnforcementRules(): Promise<ServerExternalData['tokenEnforcementRules']> {
  try {
    const client = getConvexClient();
    const result = await client.query(api.tokenEnforcement.getActive, {});
    return result || [];
  } catch (error) {
    console.error('[Convex] Failed to fetch token enforcement rules:', error);
    return [];
  }
}

/**
 * Fetch learning corrections for the pipeline.
 */
export async function fetchCorrections(
  deviceId?: string
): Promise<ServerExternalData['corrections']> {
  try {
    const client = getConvexClient();
    const result = await client.query(api.corrections.getLearningCorrections, {
      deviceId,
      limit: 50,
    });
    return result || [];
  } catch (error) {
    console.error('[Convex] Failed to fetch corrections:', error);
    return [];
  }
}

/**
 * Fetch training examples for few-shot learning.
 */
export async function fetchTrainingExamples(
  minScore: number = 4,
  limit: number = 10
): Promise<ServerExternalData['trainingExamples']> {
  try {
    const client = getConvexClient();
    const result = await client.query(api.seedTrainingExamples.getHighQuality, {
      minScore,
      limit,
    });
    return result?.map((ex: { inputContext: string; outputContent: string; ecosystem?: string; channel?: string }) => ({
      inputContext: ex.inputContext,
      outputContent: ex.outputContent,
      ecosystem: ex.ecosystem,
      channel: ex.channel,
    })) || [];
  } catch (error) {
    console.error('[Convex] Failed to fetch training examples:', error);
    return [];
  }
}

/**
 * Fetch directive overrides for constitutional AI.
 */
export async function fetchDirectiveOverrides(
  ecosystem?: string,
  channel?: string
): Promise<ServerExternalData['directiveOverrides']> {
  try {
    const client = getConvexClient();
    const result = await client.query(api.seedDirectiveOverrides.getByContext, {
      ecosystem,
      channel,
    });
    return result || [];
  } catch (error) {
    console.error('[Convex] Failed to fetch directive overrides:', error);
    return [];
  }
}

/**
 * Fetch user learning profile.
 */
export async function fetchUserLearningProfile(
  deviceId: string
): Promise<ServerExternalData['userLearningProfile']> {
  try {
    const client = getConvexClient();
    const result = await client.query(api.userProfiles.getProfileByDeviceId, {
      deviceId,
    });
    return result || undefined;
  } catch (error) {
    console.error('[Convex] Failed to fetch user learning profile:', error);
    return undefined;
  }
}

/**
 * Run semantic search via Convex action.
 */
export async function runSemanticSearch(
  query: string,
  limit: number = 10
): Promise<unknown[]> {
  try {
    const client = getConvexClient();
    const result = await client.action(api.embeddings.semanticSearch, {
      query,
      limit,
    });
    return result || [];
  } catch (error) {
    console.error('[Convex] Failed to run semantic search:', error);
    return [];
  }
}

/**
 * Fetch all external data needed by the pipeline in parallel.
 * This is the main entry point for the API endpoint.
 */
export async function fetchAllPipelineData(
  ecosystem?: string,
  channel?: string,
  deviceId?: string
): Promise<ServerExternalData> {
  const [
    knowledge,
    tokenEnforcementRules,
    corrections,
    trainingExamples,
    directiveOverrides,
    userLearningProfile,
  ] = await Promise.all([
    fetchKnowledge(ecosystem, channel),
    fetchTokenEnforcementRules(),
    deviceId ? fetchCorrections(deviceId) : Promise.resolve([]),
    fetchTrainingExamples(),
    fetchDirectiveOverrides(ecosystem, channel),
    deviceId ? fetchUserLearningProfile(deviceId) : Promise.resolve(undefined),
  ]);

  return {
    knowledge,
    tokenEnforcementRules,
    corrections,
    trainingExamples,
    directiveOverrides,
    userLearningProfile,
  };
}

/**
 * Create a semantic search function that can be passed to the pipeline.
 * This is needed because the pipeline expects a function, not a pre-fetched result.
 */
export function createSemanticSearchFunction(): (...args: unknown[]) => Promise<unknown> {
  return async (query: unknown, limit?: unknown) => {
    if (typeof query !== 'string') {
      throw new Error('Semantic search query must be a string');
    }
    const limitNum = typeof limit === 'number' ? limit : 10;
    return runSemanticSearch(query, limitNum);
  };
}
