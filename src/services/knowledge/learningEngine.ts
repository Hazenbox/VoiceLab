/**
 * Learning Engine
 * 
 * Aggregates user corrections and feedback to extract patterns
 * that improve future content generation.
 * 
 * Learning signals:
 * - thumbs_down: Content was bad → what to avoid
 * - edit: Content was partially correct → learn the delta
 * - comment: Qualitative feedback → contextual improvement
 * - thumbs_up: Content was good → reinforce patterns (save as example)
 * 
 * @module services/knowledge/learningEngine
 */

import type { RetrievedKnowledge } from './knowledgeRetriever';

// ── Types ────────────────────────────────────────────────────────

export interface CorrectionEntry {
  _id?: string;
  originalContent: string;
  editedContent?: string;
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'edit' | 'comment' | 'save_example';
  comment?: string;
  /** Structured dislike reasons (e.g., ["not accurate", "wrong tone"]) */
  reasons?: string[];
  ecosystem: string;
  channel: string;
  persona: string;
  trustScore?: number;
  timestamp: number;
}

export interface LearnedPattern {
  type: 'avoid' | 'prefer' | 'style' | 'correction';
  pattern: string;
  context: string;
  confidence: number; // 0-1
  source: 'edit_diff' | 'thumbs_down' | 'comment' | 'repeated';
}

export interface LearningInsights {
  corrections: Array<{
    original: string;
    edited: string;
    context: string;
  }>;
  avoidPatterns: string[];
  stylePreferences: string[];
  promptSection: string;
}

// ── Extract Learning from Corrections ────────────────────────────

/**
 * Analyze a set of corrections and extract learning insights
 * for prompt injection.
 */
export function extractLearningInsights(
  corrections: CorrectionEntry[],
  ecosystem?: string,
  channel?: string,
): LearningInsights {
  const insights: LearningInsights = {
    corrections: [],
    avoidPatterns: [],
    stylePreferences: [],
    promptSection: '',
  };

  if (!corrections.length) return insights;

  // Filter by context if provided. Guard against old entries missing ecosystem/channel.
  const relevant = corrections.filter((c) => {
    if (ecosystem && (!c.ecosystem || c.ecosystem !== ecosystem)) return false;
    if (channel && (!c.channel || c.channel !== channel)) return false;
    return true;
  });

  // Process edits — the strongest learning signal
  const edits = relevant.filter((c) => c.feedbackType === 'edit' && c.editedContent);
  for (const edit of edits.slice(0, 10)) {
    insights.corrections.push({
      original: truncate(edit.originalContent, 200),
      edited: truncate(edit.editedContent!, 200),
      context: `${edit.ecosystem}/${edit.channel}`,
    });
  }

  // Process thumbs down — what to avoid
  const thumbsDown = relevant.filter((c) => c.feedbackType === 'thumbs_down');
  for (const td of thumbsDown.slice(0, 5)) {
    // Build avoid pattern from structured reasons and/or free-text comment
    const parts: string[] = [];
    if (td.reasons && td.reasons.length > 0) {
      parts.push(`Reasons: ${td.reasons.join(', ')}`);
    }
    if (td.comment) {
      parts.push(td.comment);
    }
    // Only add if we have at least one signal (reasons or comment)
    if (parts.length > 0) {
      insights.avoidPatterns.push(parts.join(' | '));
    }
  }

  // Process comments — qualitative style feedback
  const comments = relevant.filter((c) => c.feedbackType === 'comment' && c.comment);
  for (const comment of comments.slice(0, 5)) {
    insights.stylePreferences.push(comment.comment!);
  }

  // Build the prompt section
  insights.promptSection = buildLearningPromptSection(insights);

  return insights;
}

/**
 * Build the learning-based prompt section for injection.
 */
function buildLearningPromptSection(insights: LearningInsights): string {
  const sections: string[] = [];

  if (insights.corrections.length > 0) {
    sections.push(`## Learned from User Corrections

Users have previously edited AI-generated content. Learn from these changes:
${insights.corrections.map((c, i) =>
  `${i + 1}. BEFORE: "${c.original}"
   AFTER: "${c.edited}"
   Context: ${c.context}`
).join('\n')}`);
  }

  if (insights.avoidPatterns.length > 0) {
    sections.push(`## User Dislikes (Thumbs Down Feedback)

Users disliked content for these reasons — avoid these patterns:
${insights.avoidPatterns.map((p) => `- ${p}`).join('\n')}`);
  }

  if (insights.stylePreferences.length > 0) {
    sections.push(`## User Style Preferences (Comments)

Users have shared these preferences:
${insights.stylePreferences.map((p) => `- ${p}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Merge learning insights into the retrieved knowledge object.
 * This allows the prompt builder to inject both knowledge + learning.
 */
export function mergeLearnedCorrections(
  knowledge: RetrievedKnowledge,
  corrections: CorrectionEntry[],
  ecosystem?: string,
  channel?: string,
): RetrievedKnowledge {
  const insights = extractLearningInsights(corrections, ecosystem, channel);

  return {
    ...knowledge,
    // Merge edit-based corrections
    corrections: insights.corrections,
    // Merge thumbs-down avoidPatterns into avoidWords
    avoidWords: [
      ...knowledge.avoidWords,
      ...insights.avoidPatterns.filter((p) => !knowledge.avoidWords.includes(p)),
    ],
    // Add style preferences from comments
    stylePreferences: insights.stylePreferences,
    // Include the fully formatted learning prompt section
    learningPromptSection: insights.promptSection || undefined,
  };
}

// ── Local Learning Cache ─────────────────────────────────────────

const LOCAL_CORRECTIONS_KEY = 'voicelab_corrections_cache';
const MAX_LOCAL_CORRECTIONS = 100;

/**
 * Store a correction locally for immediate learning availability.
 */
export function storeLocalCorrection(correction: CorrectionEntry): void {
  try {
    const stored = localStorage.getItem(LOCAL_CORRECTIONS_KEY);
    const corrections: CorrectionEntry[] = stored ? JSON.parse(stored) : [];
    corrections.unshift(correction);
    const trimmed = corrections.slice(0, MAX_LOCAL_CORRECTIONS);
    localStorage.setItem(LOCAL_CORRECTIONS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[LearningEngine] Failed to store correction (quota?):', e);
  }
}

/**
 * Get locally stored corrections.
 */
export function getLocalCorrections(
  ecosystem?: string,
  channel?: string,
): CorrectionEntry[] {
  try {
    const stored = localStorage.getItem(LOCAL_CORRECTIONS_KEY);
    if (!stored) return [];
    const corrections: CorrectionEntry[] = JSON.parse(stored);
    return corrections.filter((c) => {
      // Guard against old entries missing ecosystem/channel fields
      if (ecosystem && (!c.ecosystem || c.ecosystem !== ecosystem)) return false;
      if (channel && (!c.channel || c.channel !== channel)) return false;
      return true;
    });
  } catch {
    return [];
  }
}

/**
 * Clear local corrections cache.
 */
export function clearLocalCorrections(): void {
  try {
    localStorage.removeItem(LOCAL_CORRECTIONS_KEY);
  } catch { /* ignore */ }
}

// ── Helpers ──────────────────────────────────────────────────────

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
