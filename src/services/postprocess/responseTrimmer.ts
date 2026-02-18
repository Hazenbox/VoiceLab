/**
 * Response Length Enforcer
 *
 * Trims responses to channel-appropriate lengths at sentence boundaries.
 * Uses getChannelConfig() (AD-3 inheritance) for limits.
 * Deterministic, safe, no semantic changes.
 *
 * @module services/postprocess/responseTrimmer
 */

import type { ContentChannelType } from '../../types';
import { getChannelConfig } from '../guidelines/channels';

interface ChannelLimits {
  maxChars?: number;
  maxWords?: number;
  maxSteps?: number;
}

/**
 * Resolve channel limits from the inheritance model.
 * Character limits come from the channel's maxLength; word limits from group defaults.
 */
function resolveChannelLimits(channel: ContentChannelType): ChannelLimits {
  const config = getChannelConfig(channel);
  return {
    maxChars: config.maxLength,
    maxWords: config.maxWords,
  };
}

export interface TrimResult {
  content: string;
  wasTrimmed: boolean;
  originalLength: number;
  trimmedLength: number;
}

/**
 * Trim response to channel limits at sentence boundaries.
 */
export function trimResponse(content: string, channel: ContentChannelType): TrimResult {
  const limits = resolveChannelLimits(channel);

  let trimmed = content;
  let wasTrimmed = false;

  // Character limit
  if (limits.maxChars && trimmed.length > limits.maxChars) {
    trimmed = trimAtSentenceBoundary(trimmed, limits.maxChars);
    wasTrimmed = true;
  }

  // Word limit
  if (limits.maxWords) {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > limits.maxWords) {
      trimmed = trimAtWordLimit(trimmed, limits.maxWords);
      wasTrimmed = true;
    }
  }

  // Step limit for structured content (max 7 steps)
  const stepPattern = /(?:^|\n)\s*\d+[\.\)]/gm;
  const stepMatches = trimmed.match(stepPattern);
  if (stepMatches && stepMatches.length > 7) {
    trimmed = trimSteps(trimmed, 7);
    wasTrimmed = true;
  }

  return {
    content: trimmed,
    wasTrimmed,
    originalLength: content.length,
    trimmedLength: trimmed.length,
  };
}

/**
 * Trim at the last complete sentence before the character limit.
 */
function trimAtSentenceBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
  );

  if (lastSentenceEnd > maxChars * 0.5) {
    return truncated.slice(0, lastSentenceEnd + 1).trim();
  }

  // No good sentence boundary found -- hard cut with ellipsis
  return truncated.slice(0, maxChars - 3).trim() + '...';
}

/**
 * Trim at word limit, ending at the last complete sentence.
 */
function trimAtWordLimit(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const truncated = words.slice(0, maxWords).join(' ');
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?'),
  );

  if (lastSentenceEnd > truncated.length * 0.5) {
    return truncated.slice(0, lastSentenceEnd + 1).trim();
  }

  return truncated.trim() + '...';
}

/**
 * Trim numbered steps to maxSteps.
 */
function trimSteps(text: string, maxSteps: number): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let stepCount = 0;

  for (const line of lines) {
    if (/^\s*\d+[\.\)]/.test(line)) {
      stepCount++;
      if (stepCount > maxSteps) break;
    }
    result.push(line);
  }

  return result.join('\n');
}
