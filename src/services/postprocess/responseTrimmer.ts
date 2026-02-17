/**
 * Response Length Enforcer
 *
 * Trims responses to channel-appropriate lengths at sentence boundaries.
 * Deterministic, safe, no semantic changes.
 *
 * @module services/postprocess/responseTrimmer
 */

import type { ContentChannelType } from '../../types';

interface ChannelLimits {
  maxChars?: number;
  maxWords?: number;
  maxSteps?: number;
}

const CHANNEL_LIMITS: Partial<Record<ContentChannelType, ChannelLimits>> = {
  sms: { maxChars: 160 },
  push_notification: { maxChars: 100 },
  whatsapp_alert: { maxChars: 256 },
  customer_care_chat: { maxWords: 180 },
  whatsapp_support: { maxWords: 180 },
  chatbot_faq: { maxWords: 180 },
  ivr_voice_menu: { maxChars: 200 },
  voice_assistant: { maxWords: 100 },
  voice_prompts: { maxChars: 100 },
  marketing_email: { maxWords: 400 },
  transactional_email: { maxWords: 300 },
  social_media_post: { maxChars: 280 },
  digital_ads: { maxChars: 150 },
  app_notification: { maxChars: 150 },
};

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
  const limits = CHANNEL_LIMITS[channel];
  if (!limits) {
    return { content, wasTrimmed: false, originalLength: content.length, trimmedLength: content.length };
  }

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
