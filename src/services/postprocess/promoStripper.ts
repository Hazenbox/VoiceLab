/**
 * Night-Time Promotional Stripper
 *
 * Removes promotional sentences from content generated during late-night hours.
 * KB mandates no selling/upselling during late_night timing context.
 *
 * @module services/postprocess/promoStripper
 */

const PROMO_TRIGGERS = [
  'upgrade',
  'special offer',
  'limited time',
  'exclusive deal',
  'check out',
  'don\'t miss',
  'hurry',
  'offer ends',
  'subscribe now',
  'get started with',
  'try our',
  'switch to',
  'unlock premium',
  'free trial',
  'discount',
  'cashback',
  'bonus',
  'save up to',
  'starting at just',
];

export interface StripResult {
  content: string;
  strippedCount: number;
  strippedSentences: string[];
}

/**
 * Check if a sentence is promotional.
 */
function isPromotionalSentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return PROMO_TRIGGERS.some(trigger => lower.includes(trigger));
}

/**
 * Strip promotional content from a response.
 * Only removes full sentences -- never modifies partial sentences.
 */
export function stripPromoContent(content: string): StripResult {
  // Split into sentences (respecting common patterns)
  const sentencePattern = /(?<=[.!?])\s+|(?<=\n)/;
  const sentences = content.split(sentencePattern).filter(s => s.trim());

  const kept: string[] = [];
  const stripped: string[] = [];

  for (const sentence of sentences) {
    if (isPromotionalSentence(sentence)) {
      stripped.push(sentence.trim());
    } else {
      kept.push(sentence);
    }
  }

  // If we'd strip everything, keep the original
  if (kept.length === 0) {
    return { content, strippedCount: 0, strippedSentences: [] };
  }

  return {
    content: kept.join(' ').replace(/ {2,}/g, ' ').trim(),
    strippedCount: stripped.length,
    strippedSentences: stripped,
  };
}

/**
 * Check if current time is late night (10 PM - 6 AM).
 */
export function isLateNight(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 6;
}

/**
 * Conditionally strip promo content based on time.
 * Only strips during late-night hours.
 */
export function conditionalPromoStrip(
  content: string,
  timePeriod?: string,
): StripResult {
  const shouldStrip = timePeriod === 'late_night' || (!timePeriod && isLateNight());

  if (!shouldStrip) {
    return { content, strippedCount: 0, strippedSentences: [] };
  }

  return stripPromoContent(content);
}
