/**
 * Knowledge Retriever
 * 
 * Queries the Convex knowledgeItems table and builds prompt-ready sections.
 * Falls back to hardcoded code defaults when Convex is unavailable.
 * 
 * This is the bridge between the knowledge base and the prompt builder.
 * 
 * @module services/knowledge/knowledgeRetriever
 */

import { ALL_WORDS_TO_AVOID, WORD_CATEGORIES } from '../guidelines/avoidWords';
import { ALL_PREFERRED_WORDS, SIMPLE_ALTERNATIVES, GENDER_NEUTRAL_ALTERNATIVES } from '../guidelines/vocabulary';
import { getLocalExamples } from './saveExample';

// ── Types ────────────────────────────────────────────────────────

export interface KnowledgeItem {
  _id: string;
  type: string;
  category: string;
  content: string;
  metadata: {
    ecosystem?: string;
    channel?: string;
    persona?: string;
    severity?: string;
    suggestion?: string;
    source?: string;
  };
  tags: string[];
  isActive: boolean;
}

export interface RetrievedKnowledge {
  avoidWords: string[];
  preferredWords: string[];
  autoFixRules: Array<{ from: string; to: string }>;
  approvedExamples: string[];
  corrections: Array<{ original: string; edited: string; context: string }>;
  /** Style preferences from user comments (Phase 3) */
  stylePreferences?: string[];
  /** Pre-built learning prompt section combining corrections, avoidPatterns, stylePreferences */
  learningPromptSection?: string;
  /** Semantically relevant items from vector search (Phase 4) */
  semanticResults?: SemanticSearchResult[];
  source: 'convex' | 'code_defaults' | 'convex_with_rag';
}

/** Result from Convex vector search with relevance score */
export interface SemanticSearchResult {
  _id: string;
  type: string;
  category: string;
  content: string;
  metadata: {
    ecosystem?: string;
    channel?: string;
    persona?: string;
    severity?: string;
    suggestion?: string;
    source?: string;
  };
  tags: string[];
  _score: number;
}

// ── Local Cache ──────────────────────────────────────────────────

interface CacheEntry {
  data: KnowledgeItem[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCached(key: string): KnowledgeItem[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: KnowledgeItem[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Convex Query Hook Result Type ────────────────────────────────
// The retriever accepts pre-fetched Convex data (from useQuery hooks)
// This avoids the retriever needing to know about Convex client internals.

export type ConvexKnowledgeData = {
  avoidWords?: KnowledgeItem[];
  preferredWords?: KnowledgeItem[];
  autoFixRules?: KnowledgeItem[];
  approvedExamples?: KnowledgeItem[];
} | null;

// ── Retriever ────────────────────────────────────────────────────

/**
 * Retrieve knowledge for prompt injection.
 * 
 * @param convexData - Pre-fetched data from Convex useQuery hooks (null if unavailable)
 * @param ecosystem - Current ecosystem for filtering
 * @param channel - Current channel for filtering
 */
export function retrieveKnowledge(
  convexData: ConvexKnowledgeData,
  ecosystem?: string,
  channel?: string,
): RetrievedKnowledge {
  // If Convex data is available, use it
  if (convexData) {
    const avoidWords = (convexData.avoidWords || [])
      .filter((item) => item.isActive)
      .map((item) => item.content);

    const preferredWords = (convexData.preferredWords || [])
      .filter((item) => item.isActive)
      .map((item) => item.content);

    const autoFixRules = (convexData.autoFixRules || [])
      .filter((item) => item.isActive && item.metadata.suggestion)
      .map((item) => ({
        from: item.content,
        to: item.metadata.suggestion!,
      }));

    const approvedExamples = (convexData.approvedExamples || [])
      .filter((item) => {
        if (!item.isActive) return false;
        // Filter by ecosystem/channel if specified
        if (ecosystem && item.metadata.ecosystem && item.metadata.ecosystem !== ecosystem) return false;
        if (channel && item.metadata.channel && item.metadata.channel !== channel) return false;
        return true;
      })
      .map((item) => item.content);

    return {
      avoidWords,
      preferredWords,
      autoFixRules,
      approvedExamples,
      corrections: [], // Will be populated in Phase 3
      source: 'convex',
    };
  }

  // Fallback: use code defaults
  return getCodeDefaults();
}

/**
 * Get code-level defaults (used when Convex is unavailable).
 */
export function getCodeDefaults(ecosystem?: string, channel?: string): RetrievedKnowledge {
  return {
    avoidWords: [...ALL_WORDS_TO_AVOID],
    preferredWords: [...ALL_PREFERRED_WORDS],
    autoFixRules: [
      ...Object.entries(SIMPLE_ALTERNATIVES).map(([from, to]) => ({ from, to })),
      ...Object.entries(GENDER_NEUTRAL_ALTERNATIVES).map(([from, to]) => ({ from, to })),
    ],
    approvedExamples: getLocalExamples(ecosystem, channel),
    corrections: [],
    source: 'code_defaults',
  };
}

// ── Prompt Sections ──────────────────────────────────────────────

/**
 * Build the knowledge-based prompt section for injection.
 * This is added to the system prompt alongside existing brand guardrails.
 */
export function buildKnowledgePromptSection(knowledge: RetrievedKnowledge): string {
  const sections: string[] = [];

  // Avoid words (cap at 50 for prompt length)
  if (knowledge.avoidWords.length > 0) {
    const sample = knowledge.avoidWords.slice(0, 50);
    sections.push(`## Words & Phrases to Avoid (${knowledge.avoidWords.length} total)

Avoid these words/phrases. They make content feel cold, complex, or pressuring:
${sample.map((w) => `- "${w}"`).join('\n')}
${knowledge.avoidWords.length > 50 ? `\n...and ${knowledge.avoidWords.length - 50} more. Check with the content guidelines.` : ''}`);
  }

  // Preferred words (cap at 30)
  if (knowledge.preferredWords.length > 0) {
    const sample = knowledge.preferredWords.slice(0, 30);
    sections.push(`## Preferred Vocabulary

Use these words when appropriate -- they align with Jio's warm, caring brand voice:
${sample.join(', ')}`);
  }

  // Auto-fix suggestions
  if (knowledge.autoFixRules.length > 0) {
    const sample = knowledge.autoFixRules.slice(0, 15);
    sections.push(`## Preferred Alternatives

When you use the word on the left, prefer the word on the right:
${sample.map((r) => `- "${r.from}" → "${r.to}"`).join('\n')}`);
  }

  // Approved examples
  if (knowledge.approvedExamples.length > 0) {
    const sample = knowledge.approvedExamples.slice(0, 5);
    sections.push(`## Approved Content Examples

These examples have been approved as good Jio content. Use them as reference for tone and style:
${sample.map((ex, i) => `${i + 1}. "${ex}"`).join('\n')}`);
  }

  // Learned corrections
  if (knowledge.corrections.length > 0) {
    const sample = knowledge.corrections.slice(0, 5);
    sections.push(`## Learned Preferences (From User Feedback)

Previous content was edited by users. Learn from these corrections:
${sample.map((c) => `- Original: "${c.original}" → Edited: "${c.edited}" (Context: ${c.context})`).join('\n')}`);
  }

  // Style preferences from user comments
  if (knowledge.stylePreferences && knowledge.stylePreferences.length > 0) {
    sections.push(`## User Style Preferences (From Comments)

Users have shared these preferences -- apply them to generated content:
${knowledge.stylePreferences.map((p) => `- ${p}`).join('\n')}`);
  }

  // Pre-built learning prompt section (includes avoidPatterns + more from learningEngine)
  if (knowledge.learningPromptSection) {
    sections.push(knowledge.learningPromptSection);
  }

  if (sections.length === 0) {
    return '';
  }

  return sections.join('\n\n');
}

/**
 * Get avoid words grouped by category for UI display.
 */
export function getAvoidWordsByCategory(knowledge: RetrievedKnowledge): Array<{
  category: string;
  severity: string;
  words: string[];
}> {
  // When using code defaults, use the existing category structure
  if (knowledge.source === 'code_defaults') {
    return WORD_CATEGORIES.map((cat) => ({
      category: cat.name,
      severity: cat.severity,
      words: [...cat.words],
    }));
  }

  // For Convex data, we'd need to reconstruct categories
  // For now, return as a single group
  return [{
    category: 'All Avoid Words',
    severity: 'warning',
    words: knowledge.avoidWords,
  }];
}

// ── Semantic Search Enrichment (Phase 4) ─────────────────────────

/**
 * Enrich existing knowledge with semantic search results.
 * Called after the Convex semanticSearch action returns results.
 * 
 * @param baseKnowledge - The base knowledge (from type-based retrieval or code defaults)
 * @param semanticResults - Results from Convex vector search
 * @param minScore - Minimum similarity score to include (0-1)
 */
export function enrichWithSemanticResults(
  baseKnowledge: RetrievedKnowledge,
  semanticResults: SemanticSearchResult[],
  minScore: number = 0.3,
): RetrievedKnowledge {
  // Filter by minimum relevance score
  const relevant = semanticResults.filter((r) => r._score >= minScore);

  if (relevant.length === 0) {
    return baseKnowledge;
  }

  // Categorize results and merge into knowledge
  const newAvoidWords: string[] = [];
  const newPreferredWords: string[] = [];
  const newAutoFix: Array<{ from: string; to: string }> = [];
  const newExamples: string[] = [];

  for (const item of relevant) {
    switch (item.type) {
      case 'avoid_word':
        if (!baseKnowledge.avoidWords.includes(item.content)) {
          newAvoidWords.push(item.content);
        }
        break;
      case 'preferred_word':
        if (!baseKnowledge.preferredWords.includes(item.content)) {
          newPreferredWords.push(item.content);
        }
        break;
      case 'auto_fix':
        if (item.metadata.suggestion) {
          newAutoFix.push({ from: item.content, to: item.metadata.suggestion });
        }
        break;
      case 'approved_example':
        if (!baseKnowledge.approvedExamples.includes(item.content)) {
          newExamples.push(item.content);
        }
        break;
    }
  }

  return {
    ...baseKnowledge,
    avoidWords: [...baseKnowledge.avoidWords, ...newAvoidWords],
    preferredWords: [...baseKnowledge.preferredWords, ...newPreferredWords],
    autoFixRules: [...baseKnowledge.autoFixRules, ...newAutoFix],
    approvedExamples: [...baseKnowledge.approvedExamples, ...newExamples],
    semanticResults: relevant,
    source: 'convex_with_rag',
  };
}

/**
 * Build a prompt section specifically for semantically relevant knowledge.
 * This provides contextual rules that are most relevant to the user's query.
 */
export function buildSemanticPromptSection(results: SemanticSearchResult[]): string {
  if (!results || results.length === 0) return '';

  const sections: string[] = [];

  // Group by type for organized display
  const byType = new Map<string, SemanticSearchResult[]>();
  for (const r of results) {
    const group = byType.get(r.type) || [];
    group.push(r);
    byType.set(r.type, group);
  }

  // Build sections for each type
  const typeLabels: Record<string, string> = {
    avoid_word: 'Words to Avoid (Contextually Relevant)',
    preferred_word: 'Preferred Words (Contextually Relevant)',
    auto_fix: 'Suggested Replacements (Contextually Relevant)',
    product_definition: 'Product Context',
    festival: 'Cultural Context',
    approved_example: 'Reference Examples',
  };

  for (const [type, items] of byType) {
    const label = typeLabels[type] || type;
    const itemLines = items.map((item) => {
      if (item.metadata.suggestion) {
        return `- "${item.content}" → "${item.metadata.suggestion}"`;
      }
      return `- ${item.content}`;
    });

    sections.push(`### ${label}\n${itemLines.join('\n')}`);
  }

  if (sections.length === 0) return '';

  return `## Contextually Retrieved Knowledge (RAG)\n\nThe following rules and guidelines are semantically relevant to this specific request:\n\n${sections.join('\n\n')}`;
}

// ── Cache Management ─────────────────────────────────────────────

export function clearKnowledgeCache(): void {
  cache.clear();
}

export { getCached, setCache };
