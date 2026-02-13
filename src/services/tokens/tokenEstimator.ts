/**
 * Token Estimation Service
 * 
 * Provides pre-request token counting and context overflow prevention.
 * Uses character-based heuristics for fast estimation without external APIs.
 * 
 * Based on typical tokenization patterns:
 * - English: ~4 characters per token (GPT-style)
 * - Indic scripts: ~2-3 characters per token
 * - Code: ~3.5 characters per token
 * - Numbers/punctuation: ~2 characters per token
 * 
 * @module services/tokens/tokenEstimator
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const TOKEN_LIMITS = {
  /** Google Gemini 1.5 Flash default context */
  gemini_flash: 128_000,
  /** Google Gemini 1.5 Pro */
  gemini_pro: 1_000_000,
  /** OpenAI GPT-4 Turbo */
  gpt4_turbo: 128_000,
  /** OpenAI GPT-3.5 Turbo */
  gpt35_turbo: 16_385,
  /** Claude 3 */
  claude3: 200_000,
  /** Default fallback */
  default: 32_000,
} as const;

export type ModelType = keyof typeof TOKEN_LIMITS;

export const ESTIMATION_CONFIG = {
  /** Characters per token for English text */
  englishCharsPerToken: 4,
  /** Characters per token for Indic scripts (Devanagari, etc.) */
  indicCharsPerToken: 2.5,
  /** Characters per token for code/technical content */
  codeCharsPerToken: 3.5,
  /** Characters per token for numbers/punctuation */
  specialCharsPerToken: 2,
  /** Safety margin percentage (reserve for response) */
  safetyMarginPercent: 20,
  /** Warning threshold percentage */
  warningThresholdPercent: 80,
  /** Critical threshold percentage */
  criticalThresholdPercent: 95,
  /** Minimum reserved tokens for response */
  minResponseTokens: 1000,
  /** Maximum response tokens to reserve */
  maxResponseTokens: 4000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TokenEstimate {
  /** Estimated total tokens */
  totalTokens: number;
  /** Breakdown by component */
  breakdown: {
    systemPrompt: number;
    conversationHistory: number;
    userMessage: number;
    knowledgeContext: number;
    other: number;
  };
  /** Context limit for the model */
  contextLimit: number;
  /** Available tokens for response */
  availableForResponse: number;
  /** Usage percentage */
  usagePercent: number;
  /** Status assessment */
  status: 'ok' | 'warning' | 'critical' | 'overflow';
  /** Recommendations if any */
  recommendations: string[];
}

export interface EstimationInput {
  /** System prompt/instructions */
  systemPrompt?: string;
  /** Conversation history messages */
  conversationHistory?: Array<{ role: string; content: string }>;
  /** Current user message */
  userMessage?: string;
  /** Knowledge/RAG context */
  knowledgeContext?: string;
  /** Additional context (directives, examples, etc.) */
  additionalContext?: string;
  /** Target model */
  model?: ModelType;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect if text contains significant Indic script content
 */
function hasIndicScript(text: string): boolean {
  // Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Punjabi
  const indicPattern = /[\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F]/;
  return indicPattern.test(text);
}

/**
 * Detect if text is primarily code
 */
function isCodeContent(text: string): boolean {
  // Check for common code patterns
  const codePatterns = [
    /\bfunction\b/,
    /\bconst\b|\blet\b|\bvar\b/,
    /\bimport\b.*\bfrom\b/,
    /\bexport\b/,
    /\bclass\b.*\{/,
    /\bif\s*\(.*\)\s*\{/,
    /\breturn\b/,
    /=>/,
    /\{\s*\n/,
  ];
  
  const matches = codePatterns.filter(p => p.test(text)).length;
  return matches >= 3;
}

/**
 * Count special characters (numbers, punctuation)
 */
function countSpecialChars(text: string): number {
  const specialPattern = /[0-9\.\,\!\?\:\;\-\(\)\[\]\{\}\"\'\/\\@#\$%\^&\*\+\=\<\>\|`~]/g;
  return (text.match(specialPattern) || []).length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estimate tokens for a text string using character-based heuristics
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  
  const length = text.length;
  
  // Detect content type for appropriate estimation
  const hasIndic = hasIndicScript(text);
  const isCode = isCodeContent(text);
  const specialCount = countSpecialChars(text);
  
  // Calculate weighted average based on content composition
  let estimate: number;
  
  if (isCode) {
    // Code content
    estimate = length / ESTIMATION_CONFIG.codeCharsPerToken;
  } else if (hasIndic) {
    // Indic script content (more tokens per character)
    const indicChars = (text.match(/[\u0900-\u0D7F]/g) || []).length;
    const englishChars = length - indicChars - specialCount;
    
    estimate = 
      (indicChars / ESTIMATION_CONFIG.indicCharsPerToken) +
      (englishChars / ESTIMATION_CONFIG.englishCharsPerToken) +
      (specialCount / ESTIMATION_CONFIG.specialCharsPerToken);
  } else {
    // Standard English content
    const regularChars = length - specialCount;
    
    estimate = 
      (regularChars / ESTIMATION_CONFIG.englishCharsPerToken) +
      (specialCount / ESTIMATION_CONFIG.specialCharsPerToken);
  }
  
  // Round up for safety
  return Math.ceil(estimate);
}

/**
 * Estimate tokens for conversation history
 */
export function estimateConversationTokens(
  messages: Array<{ role: string; content: string }>
): number {
  if (!messages || messages.length === 0) return 0;
  
  let total = 0;
  
  for (const message of messages) {
    // Add overhead for role tokens (~4 tokens per message for role/formatting)
    total += 4;
    total += estimateTokens(message.content);
  }
  
  return total;
}

/**
 * Get context limit for a model
 */
export function getContextLimit(model?: ModelType): number {
  return TOKEN_LIMITS[model || 'default'] || TOKEN_LIMITS.default;
}

/**
 * Calculate available tokens for response
 */
export function calculateAvailableTokens(
  usedTokens: number,
  contextLimit: number
): number {
  const safetyMargin = contextLimit * (ESTIMATION_CONFIG.safetyMarginPercent / 100);
  const available = contextLimit - usedTokens - safetyMargin;
  
  // Clamp to reasonable bounds
  return Math.max(
    ESTIMATION_CONFIG.minResponseTokens,
    Math.min(available, ESTIMATION_CONFIG.maxResponseTokens)
  );
}

/**
 * Get status assessment based on usage
 */
function getStatus(usagePercent: number): TokenEstimate['status'] {
  if (usagePercent >= 100) return 'overflow';
  if (usagePercent >= ESTIMATION_CONFIG.criticalThresholdPercent) return 'critical';
  if (usagePercent >= ESTIMATION_CONFIG.warningThresholdPercent) return 'warning';
  return 'ok';
}

/**
 * Generate recommendations based on status
 */
function getRecommendations(
  estimate: Omit<TokenEstimate, 'recommendations'>,
  breakdown: TokenEstimate['breakdown']
): string[] {
  const recommendations: string[] = [];
  
  if (estimate.status === 'overflow') {
    recommendations.push('Context limit exceeded. Truncation required.');
    
    // Identify largest component
    const largest = Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (largest[0] === 'conversationHistory' && largest[1] > 1000) {
      recommendations.push('Truncate conversation history (remove older messages).');
    }
    if (largest[0] === 'knowledgeContext' && largest[1] > 500) {
      recommendations.push('Reduce knowledge context (fewer RAG results).');
    }
    if (largest[0] === 'systemPrompt' && largest[1] > 2000) {
      recommendations.push('Consider using selective directive loading.');
    }
  } else if (estimate.status === 'critical') {
    recommendations.push('Approaching context limit. Consider reducing context.');
    
    if (breakdown.conversationHistory > estimate.contextLimit * 0.5) {
      recommendations.push('Conversation history is using over 50% of context.');
    }
  } else if (estimate.status === 'warning') {
    recommendations.push('Context usage is high. Monitor for overflow.');
  }
  
  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ESTIMATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estimate total tokens for a complete request
 * 
 * @example
 * ```ts
 * const estimate = estimateRequestTokens({
 *   systemPrompt: systemInstructions,
 *   conversationHistory: messages,
 *   userMessage: currentInput,
 *   knowledgeContext: ragResults,
 *   model: 'gemini_flash',
 * });
 * 
 * if (estimate.status === 'overflow') {
 *   // Truncate conversation history
 * }
 * ```
 */
export function estimateRequestTokens(input: EstimationInput): TokenEstimate {
  const contextLimit = getContextLimit(input.model);
  
  // Estimate each component
  const breakdown: TokenEstimate['breakdown'] = {
    systemPrompt: estimateTokens(input.systemPrompt || ''),
    conversationHistory: estimateConversationTokens(input.conversationHistory || []),
    userMessage: estimateTokens(input.userMessage || ''),
    knowledgeContext: estimateTokens(input.knowledgeContext || ''),
    other: estimateTokens(input.additionalContext || ''),
  };
  
  // Calculate totals
  const totalTokens = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  const usagePercent = (totalTokens / contextLimit) * 100;
  const status = getStatus(usagePercent);
  const availableForResponse = calculateAvailableTokens(totalTokens, contextLimit);
  
  // Build partial estimate for recommendations
  const partialEstimate = {
    totalTokens,
    breakdown,
    contextLimit,
    availableForResponse,
    usagePercent,
    status,
  };
  
  const recommendations = getRecommendations(partialEstimate, breakdown);
  
  return {
    ...partialEstimate,
    recommendations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRUNCATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate how many messages to keep from conversation history
 * to fit within a target token budget
 */
export function calculateMessagesToKeep(
  messages: Array<{ role: string; content: string }>,
  targetTokens: number
): number {
  if (!messages || messages.length === 0) return 0;
  
  let tokens = 0;
  let keepCount = 0;
  
  // Count from the end (keep most recent messages)
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = 4 + estimateTokens(messages[i].content);
    
    if (tokens + messageTokens <= targetTokens) {
      tokens += messageTokens;
      keepCount++;
    } else {
      break;
    }
  }
  
  return keepCount;
}

/**
 * Truncate conversation history to fit within token budget
 * Keeps the most recent messages and optionally preserves the first message
 */
export function truncateConversationHistory<T extends { role: string; content: string }>(
  messages: T[],
  targetTokens: number,
  options: {
    /** Preserve the first message (often contains important context) */
    preserveFirst?: boolean;
    /** Minimum messages to keep */
    minMessages?: number;
  } = {}
): T[] {
  const { preserveFirst = false, minMessages = 2 } = options;
  
  if (!messages || messages.length === 0) return [];
  if (messages.length <= minMessages) return messages;
  
  // If preserving first, calculate tokens for it
  let reservedTokens = 0;
  if (preserveFirst && messages.length > 0) {
    reservedTokens = 4 + estimateTokens(messages[0].content);
  }
  
  const availableTokens = targetTokens - reservedTokens;
  
  // Calculate how many recent messages we can keep
  const recentMessages = preserveFirst ? messages.slice(1) : messages;
  const keepCount = calculateMessagesToKeep(recentMessages, availableTokens);
  
  // Ensure we keep at least minMessages
  const actualKeepCount = Math.max(keepCount, minMessages - (preserveFirst ? 1 : 0));
  
  // Build result
  const kept = recentMessages.slice(-actualKeepCount);
  
  if (preserveFirst && messages.length > 0) {
    return [messages[0], ...kept];
  }
  
  return kept;
}

/**
 * Suggest optimal configuration based on context usage
 */
export function suggestOptimalConfig(
  estimate: TokenEstimate
): {
  maxConversationTokens: number;
  maxKnowledgeTokens: number;
  maxResponseTokens: number;
} {
  const contextLimit = estimate.contextLimit;
  const safetyMargin = contextLimit * 0.1; // 10% safety margin
  
  // Reserve for response
  const responseTokens = Math.min(
    ESTIMATION_CONFIG.maxResponseTokens,
    contextLimit * 0.1
  );
  
  // System prompt is usually fixed
  const systemTokens = estimate.breakdown.systemPrompt;
  
  // Remaining budget for conversation and knowledge
  const remainingBudget = contextLimit - safetyMargin - responseTokens - systemTokens;
  
  // Split remaining: 70% conversation, 30% knowledge
  const conversationBudget = Math.floor(remainingBudget * 0.7);
  const knowledgeBudget = Math.floor(remainingBudget * 0.3);
  
  return {
    maxConversationTokens: conversationBudget,
    maxKnowledgeTokens: knowledgeBudget,
    maxResponseTokens: Math.floor(responseTokens),
  };
}
