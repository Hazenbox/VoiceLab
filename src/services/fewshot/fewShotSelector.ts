/**
 * Few-Shot Example Selector
 *
 * Selects the most relevant single training example for injection into
 * the LLM prompt. Only triggers for complaint, multi-step, or escalation
 * intents with similarity >= 0.7.
 *
 * NOT injected for: SMS, push, or short-response channels.
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface TrainingExample {
  inputContext: string;
  outputContent: string;
  tags?: string[];
  ecosystem?: string;
  channel?: string;
}

export interface FewShotResult {
  shouldInject: boolean;
  example: TrainingExample | null;
  similarity: number;
  reason: string;
}

// ── Config ───────────────────────────────────────────────────────────────

const MIN_SIMILARITY = 0.7;
const MAX_EXAMPLE_TOKENS = 150; // ~600 chars
const CHARS_PER_TOKEN = 4;

// Intents eligible for few-shot injection
const ELIGIBLE_INTENTS = new Set([
  'complaint',
  'multi_step',
  'escalation',
  'troubleshoot',
  'service_issue',
]);

// Channels that should NEVER get few-shot (short-form)
const EXCLUDED_CHANNELS = new Set([
  'sms',
  'push_notification',
  'push',
  'ivr',
]);

// ── Similarity ───────────────────────────────────────────────────────────

/**
 * Simple word-overlap similarity (Jaccard-like).
 * Fast and deterministic -- no embedding model needed.
 */
function computeSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Tag-based boost: if example tags overlap with detected intent/emotion,
 * add a similarity bonus.
 */
function tagBoost(tags: string[] | undefined, intent: string, emotion?: string): number {
  if (!tags || tags.length === 0) return 0;

  let boost = 0;
  const lowerTags = tags.map(t => t.toLowerCase());

  // Intent match
  if (intent === 'complaint' && lowerTags.some(t => t.includes('emotion-angry') || t.includes('frustration'))) {
    boost += 0.15;
  }
  if (intent === 'escalation' && lowerTags.some(t => t.includes('escalation'))) {
    boost += 0.2;
  }
  if (intent === 'multi_step' && lowerTags.some(t => t.includes('workflow') || t.includes('multi'))) {
    boost += 0.15;
  }

  // Emotion match
  if (emotion && lowerTags.some(t => t.includes(emotion))) {
    boost += 0.1;
  }

  return Math.min(boost, 0.3); // cap boost
}

// ── Truncation ───────────────────────────────────────────────────────────

function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;

  // Trim at sentence boundary
  const truncated = text.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > maxChars * 0.5) {
    return truncated.substring(0, lastPeriod + 1);
  }
  return truncated + '...';
}

// ── Main Selector ────────────────────────────────────────────────────────

export function selectFewShot(
  userMessage: string,
  intent: string,
  channel: string,
  examples: TrainingExample[],
  emotion?: string,
): FewShotResult {
  // Gate 1: Channel exclusion
  if (EXCLUDED_CHANNELS.has(channel)) {
    return { shouldInject: false, example: null, similarity: 0, reason: `channel "${channel}" excluded from few-shot` };
  }

  // Gate 2: Intent eligibility
  if (!ELIGIBLE_INTENTS.has(intent)) {
    return { shouldInject: false, example: null, similarity: 0, reason: `intent "${intent}" not eligible for few-shot` };
  }

  // Gate 3: Need examples to select from
  if (!examples || examples.length === 0) {
    return { shouldInject: false, example: null, similarity: 0, reason: 'no training examples available' };
  }

  // Score each example
  let bestExample: TrainingExample | null = null;
  let bestScore = 0;

  for (const example of examples) {
    const textSimilarity = computeSimilarity(userMessage, example.inputContext);
    const boost = tagBoost(example.tags, intent, emotion);
    const score = Math.min(textSimilarity + boost, 1.0);

    if (score > bestScore) {
      bestScore = score;
      bestExample = example;
    }
  }

  // Gate 4: Minimum similarity threshold
  if (bestScore < MIN_SIMILARITY || !bestExample) {
    return {
      shouldInject: false,
      example: null,
      similarity: bestScore,
      reason: `best match score ${bestScore.toFixed(2)} below threshold ${MIN_SIMILARITY}`,
    };
  }

  // Truncate output to stay within token budget
  const truncatedOutput = truncateToTokenLimit(bestExample.outputContent, MAX_EXAMPLE_TOKENS);

  return {
    shouldInject: true,
    example: {
      ...bestExample,
      outputContent: truncatedOutput,
    },
    similarity: bestScore,
    reason: `matched with score ${bestScore.toFixed(2)}`,
  };
}

/**
 * Format the selected few-shot example for prompt injection.
 * Framed as calibration, NOT as a template to copy.
 */
export function formatFewShotForPrompt(result: FewShotResult): string {
  if (!result.shouldInject || !result.example) return '';

  return [
    '## tone calibration example',
    'here is an example of the right tone for this context. adapt the approach, do not copy structure.',
    '',
    `user: "${result.example.inputContext}"`,
    `response: "${result.example.outputContent}"`,
  ].join('\n');
}
