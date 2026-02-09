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
  source: 'convex' | 'code_defaults';
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
export function getCodeDefaults(): RetrievedKnowledge {
  return {
    avoidWords: [...ALL_WORDS_TO_AVOID],
    preferredWords: [...ALL_PREFERRED_WORDS],
    autoFixRules: [
      ...Object.entries(SIMPLE_ALTERNATIVES).map(([from, to]) => ({ from, to })),
      ...Object.entries(GENDER_NEUTRAL_ALTERNATIVES).map(([from, to]) => ({ from, to })),
    ],
    approvedExamples: [],
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

// ── Cache Management ─────────────────────────────────────────────

export function clearKnowledgeCache(): void {
  cache.clear();
}

export { getCached, setCache };
