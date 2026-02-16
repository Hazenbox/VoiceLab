/**
 * Save as Example
 * 
 * Allows users to save approved AI-generated content as an "approved example"
 * in the knowledge base. These examples are then retrieved and injected into
 * future prompts as reference material.
 * 
 * @module services/knowledge/saveExample
 */

import { getSyncService } from '../sync/convexSync';
import { createLogger } from '../../utils/logger';

const log = createLogger('SaveExample');

export interface SaveExamplePayload {
  content: string;
  ecosystem: string;
  channel: string;
  persona?: string;
  trustScore?: number;
}

/**
 * Save approved content as an example in the knowledge base.
 * Uses the sync service to send to Convex (non-blocking).
 * Also stores locally for immediate availability.
 */
export async function saveAsExample(payload: SaveExamplePayload): Promise<boolean> {
  // Store locally for immediate availability
  storeLocalExample(payload);

  // Send to Convex via sync service
  const syncService = getSyncService();
  if (syncService) {
    try {
      // The sync service mutation call will be handled via the injected mutationFn
      await syncService.logCorrection({
        messageContent: payload.content,
        originalContent: payload.content,
        feedbackType: 'save_example',
        ecosystem: payload.ecosystem,
        channel: payload.channel,
        persona: payload.persona || '',
        trustScore: payload.trustScore,
      });
      return true;
    } catch (error) {
      log.warn('Failed to sync to Convex', { error: String(error) });
      // Local save still succeeded
      return true;
    }
  }

  return true; // Local-only save
}

// ── Local Storage for Examples ───────────────────────────────────

const LOCAL_EXAMPLES_KEY = 'voicelab_saved_examples';
const MAX_LOCAL_EXAMPLES = 50;

interface LocalExample extends SaveExamplePayload {
  timestamp: number;
}

function storeLocalExample(payload: SaveExamplePayload): void {
  try {
    const stored = localStorage.getItem(LOCAL_EXAMPLES_KEY);
    const examples: LocalExample[] = stored ? JSON.parse(stored) : [];
    
    // Avoid duplicates
    const isDuplicate = examples.some(
      (e) => e.content === payload.content && e.ecosystem === payload.ecosystem
    );
    if (isDuplicate) return;

    examples.unshift({ ...payload, timestamp: Date.now() });

    // Trim to max
    const trimmed = examples.slice(0, MAX_LOCAL_EXAMPLES);
    localStorage.setItem(LOCAL_EXAMPLES_KEY, JSON.stringify(trimmed));
  } catch (e) {
    log.warn('Failed to store example (quota?)', { error: String(e) });
  }
}

/**
 * Get locally stored examples for a given ecosystem/channel.
 */
export function getLocalExamples(
  ecosystem?: string,
  channel?: string,
): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_EXAMPLES_KEY);
    if (!stored) return [];

    const examples: LocalExample[] = JSON.parse(stored);
    return examples
      .filter((e) => {
        if (ecosystem && e.ecosystem !== ecosystem) return false;
        if (channel && e.channel !== channel) return false;
        return true;
      })
      .map((e) => e.content);
  } catch (error) {
    log.warn('Failed to read local examples', { error: String(error) });
    return [];
  }
}

/**
 * Clear all local examples.
 */
export function clearLocalExamples(): void {
  try {
    localStorage.removeItem(LOCAL_EXAMPLES_KEY);
  } catch { /* ignore */ }
}
