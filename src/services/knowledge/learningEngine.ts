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
import { createLogger } from '../../utils/logger';
import { safeStorage } from '../safeStorage';

const log = createLogger('LearningEngine');

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
const LOCAL_REJECTED_IDS_KEY = 'voicelab_rejected_corrections'; // P0-FIX: Track rejected IDs
const LOCAL_REJECTION_SYNC_KEY = 'voicelab_rejection_sync_ts'; // P0-FIX: Last sync timestamp
const MAX_LOCAL_CORRECTIONS = 100;

/**
 * P0-FIX: Rejected correction info from admin sync
 */
export interface RejectedCorrectionInfo {
  id: string;
  originalContent: string; // Truncated for matching
  ecosystem: string;
  channel: string;
  timestamp: number;
}

/**
 * P0-FIX: Store rejected correction IDs from admin sync
 * These will be filtered out during learning retrieval
 */
export function storeRejectedCorrections(rejectedInfos: RejectedCorrectionInfo[]): void {
  try {
    const stored = safeStorage.getItem(LOCAL_REJECTED_IDS_KEY);
    const existing: RejectedCorrectionInfo[] = stored ? JSON.parse(stored) : [];
    
    // Merge new rejections (deduplicate by id)
    const existingIds = new Set(existing.map(r => r.id));
    const newRejections = rejectedInfos.filter(r => !existingIds.has(r.id));
    
    const merged = [...existing, ...newRejections].slice(-500); // Keep last 500
    safeStorage.setItem(LOCAL_REJECTED_IDS_KEY, JSON.stringify(merged));
    
    // Update sync timestamp
    safeStorage.setItem(LOCAL_REJECTION_SYNC_KEY, String(Date.now()));
    
    log.debug(`Stored ${newRejections.length} new rejections`, { total: merged.length });
  } catch (e) {
    log.warn('Failed to store rejected corrections', { error: String(e) });
  }
}

/**
 * P0-FIX: Get rejected correction fingerprints for filtering
 * Returns truncated originalContent strings for matching
 */
export function getRejectedFingerprints(ecosystem?: string, channel?: string): Set<string> {
  try {
    const stored = safeStorage.getItem(LOCAL_REJECTED_IDS_KEY);
    if (!stored) return new Set();
    
    const rejections: RejectedCorrectionInfo[] = JSON.parse(stored);
    
    // Filter by context if provided
    const relevant = rejections.filter(r => {
      if (ecosystem && r.ecosystem !== ecosystem) return false;
      if (channel && r.channel !== channel) return false;
      return true;
    });
    
    // Return set of truncated originalContent for matching
    return new Set(relevant.map(r => r.originalContent));
  } catch {
    return new Set();
  }
}

/**
 * P0-FIX: Get last rejection sync timestamp
 */
export function getLastRejectionSyncTimestamp(): number {
  try {
    const ts = safeStorage.getItem(LOCAL_REJECTION_SYNC_KEY);
    return ts ? parseInt(ts, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * P0-FIX: Clear rejected corrections cache
 */
export function clearRejectedCorrections(): void {
  try {
    safeStorage.removeItem(LOCAL_REJECTED_IDS_KEY);
    safeStorage.removeItem(LOCAL_REJECTION_SYNC_KEY);
  } catch { /* ignore */ }
}

/**
 * P1: Generate a fingerprint for deduplication
 * Based on original content + feedback type + ecosystem/channel
 */
export function generateCorrectionFingerprint(correction: Omit<CorrectionEntry, '_id' | 'timestamp'>): string {
  const content = correction.originalContent.slice(0, 100).toLowerCase().trim();
  const type = correction.feedbackType;
  const context = `${correction.ecosystem}-${correction.channel}`;
  
  // Simple hash function
  let hash = 0;
  const str = `${content}|${type}|${context}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * P1: Check if a similar correction already exists
 */
export function isDuplicateCorrection(
  correction: Omit<CorrectionEntry, '_id' | 'timestamp'>,
  existingCorrections: CorrectionEntry[]
): boolean {
  const newFingerprint = generateCorrectionFingerprint(correction);
  
  for (const existing of existingCorrections) {
    const existingFingerprint = generateCorrectionFingerprint(existing);
    if (newFingerprint === existingFingerprint) {
      return true;
    }
  }
  
  return false;
}

/**
 * Store a correction locally for immediate learning availability.
 * P1: Now includes fingerprint-based deduplication
 */
export function storeLocalCorrection(correction: CorrectionEntry): void {
  try {
    const stored = safeStorage.getItem(LOCAL_CORRECTIONS_KEY);
    const corrections: CorrectionEntry[] = stored ? JSON.parse(stored) : [];
    
    // P1: Check for duplicates before adding
    if (isDuplicateCorrection(correction, corrections)) {
      log.debug('Duplicate correction detected, skipping');
      return;
    }
    
    corrections.unshift(correction);
    const trimmed = corrections.slice(0, MAX_LOCAL_CORRECTIONS);
    safeStorage.setItem(LOCAL_CORRECTIONS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    log.warn('Failed to store correction (quota?)', { error: String(e) });
  }
}

/**
 * Get locally stored corrections.
 * P0-FIX: Now filters out admin-rejected corrections
 */
export function getLocalCorrections(
  ecosystem?: string,
  channel?: string,
): CorrectionEntry[] {
  try {
    const stored = safeStorage.getItem(LOCAL_CORRECTIONS_KEY);
    if (!stored) return [];
    const corrections: CorrectionEntry[] = JSON.parse(stored);
    
    // P0-FIX: Get rejected fingerprints to filter out
    const rejectedFingerprints = getRejectedFingerprints(ecosystem, channel);
    
    return corrections.filter((c) => {
      // Guard against old entries missing ecosystem/channel fields
      if (ecosystem && (!c.ecosystem || c.ecosystem !== ecosystem)) return false;
      if (channel && (!c.channel || c.channel !== channel)) return false;
      
      // P0-FIX: Filter out rejected corrections by matching truncated content
      if (rejectedFingerprints.size > 0) {
        const fingerprint = c.originalContent.slice(0, 100);
        if (rejectedFingerprints.has(fingerprint)) {
          return false; // Skip rejected correction
        }
      }
      
      return true;
    });
  } catch (error) {
    log.warn('Failed to read local corrections', { error: String(error) });
    return [];
  }
}

/**
 * Clear local corrections cache.
 */
export function clearLocalCorrections(): void {
  try {
    safeStorage.removeItem(LOCAL_CORRECTIONS_KEY);
  } catch { /* ignore */ }
}

// ── Helpers ──────────────────────────────────────────────────────

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
