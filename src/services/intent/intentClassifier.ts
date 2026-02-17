/**
 * Intent Classifier
 * 
 * Heuristic-based intent classification for the conversational-first architecture.
 * Classifies user messages into one of three modes:
 * - general_chat: Open conversation (default)
 * - content_generation: Branded Jio content creation
 * - jio_inquiry: Questions about Jio products/services
 * 
 * Also auto-detects channel and ecosystem from the message text.
 * 
 * Design principles:
 * - Zero latency (regex/heuristic only, no LLM call)
 * - Default to general_chat (user-friendly)
 * - Static patterns for prompt caching compatibility
 * 
 * @module services/intent/intentClassifier
 */

// Unused import removed: ContentChannelType, EcosystemType
import type {
  MessageIntent,
  IntentClassification,
  ClassifyIntentOptions,
  DetectedChannel,
  DetectedEcosystem,
  IntentConfidence,
} from './types';
import { detectChannel } from '../guidelines/channels';
import { detectEcosystem } from '../guidelines/ecosystems';

// =============================================================================
// CONTENT GENERATION PATTERNS
// =============================================================================

/**
 * Verb patterns that signal content creation intent.
 * These must be followed by content type keywords to trigger content_generation.
 */
const CONTENT_VERBS = /\b(generate|write|create|draft|compose|design|prepare|make|build|craft|produce)\b/i;

/**
 * Content type keywords that, combined with verbs, indicate content generation.
 */
const CONTENT_TYPES = /\b(sms|email|push\s*notification|notification|banner|ad\s*copy|ad|flyer|whatsapp|social\s*media|social\s*post|post|copy|content|script|announcement|campaign|message\s+for|text\s+for|headline|tagline|subject\s*line|newsletter|memo|training|onboarding|faq|chatbot|ivr|voice\s*menu|voice\s*prompt)\b/i;

/**
 * Combined pattern: verb + optional filler + content type
 */
const CONTENT_GENERATION_PATTERN = new RegExp(
  `${CONTENT_VERBS.source}\\s+(?:a\\s+|an\\s+|the\\s+|some\\s+|me\\s+(?:a\\s+|an\\s+)?)?${CONTENT_TYPES.source}`,
  'i'
);

/**
 * Explicit content mode phrases (high confidence, no verb+type combo needed)
 */
const EXPLICIT_CONTENT_PATTERNS = [
  /\b(marketing|promotional|transactional)\s+(email|copy|content|message)\b/i,
  /\bcontent\s+for\s+(jio|our|the)\b/i,
  /\b(brand|branded)\s+(content|copy|message)\b/i,
  /\bgenerate\s+(?:a\s+)?(?:jio|brand)\b/i,
];

/**
 * Negative patterns: coding/programming requests that look like content generation
 * but should be treated as general_chat. These take precedence over content detection.
 * 
 * Examples:
 * - "Create a script to parse JSON" → general_chat (not content_generation)
 * - "Build an ad blocker" → general_chat (coding request, not advertising)
 * - "Write a function for sorting" → general_chat (code request)
 */
const CODING_NEGATIVE_PATTERNS = [
  // Programming language mentions
  /\b(javascript|typescript|python|java|c\+\+|ruby|php|go|rust|swift|kotlin|scala)\b/i,
  // Code-related keywords after content verbs
  /\b(create|write|build|make|generate)\s+(?:a\s+)?(?:function|class|method|api|endpoint|script|program|code|module|component|hook|util|helper|service|algorithm)\b/i,
  // Technical terms that indicate coding
  /\b(parse|compile|debug|refactor|optimize|implement|deploy|test|unittest|integration)\b/i,
  // Data structure mentions
  /\b(array|object|string|integer|boolean|json|xml|csv|database|sql|query|schema)\b/i,
  // Framework/library mentions
  /\b(react|vue|angular|express|django|flask|spring|laravel|rails|nextjs|nodejs)\b/i,
  // Common coding request patterns
  /\bcode\s+(?:for|to|that)\b/i,
  /\bscript\s+(?:for|to|that)\b/i,
  /\bfunction\s+(?:for|to|that)\b/i,
  // "ad blocker" type patterns (where "ad" is not advertising)
  /\b(?:ad|advertisement)\s*blocker\b/i,
];

// =============================================================================
// JIO INQUIRY PATTERNS
// =============================================================================

/**
 * Jio product/service names for inquiry detection
 */
const JIO_PRODUCT_NAMES = /\b(jio|jiofiber|jio\s*fiber|jiocinema|jio\s*cinema|jiomart|jio\s*mart|jiosaavn|jio\s*saavn|jiotv|jio\s*tv|jiopay|jio\s*pay|jiophone|jio\s*phone|jio\s*5g|jio\s*true\s*5g|jio\s*air\s*fiber|jio\s*airfiber|jio\s*cloud|jio\s*health|jio\s*business)\b/i;

/**
 * Question patterns that indicate informational intent
 */
const QUESTION_PATTERNS = /\b(what|how|tell\s+me|explain|when|where|which|is|does|can|should|will|would|could|why|who)\b/i;

/**
 * Combined: question + Jio product mention
 */
function isJioInquiry(text: string): { match: boolean; signals: string[] } {
  const hasQuestion = QUESTION_PATTERNS.test(text);
  const jioMatch = text.match(JIO_PRODUCT_NAMES);
  
  if (hasQuestion && jioMatch) {
    return { match: true, signals: [`question about ${jioMatch[0]}`] };
  }
  
  // Also catch "about Jio..." patterns without explicit question words
  const aboutJio = /\babout\s+(jio\w*)/i.exec(text);
  if (aboutJio) {
    return { match: true, signals: [`inquiry about ${aboutJio[1]}`] };
  }
  
  return { match: false, signals: [] };
}

// =============================================================================
// MAIN CLASSIFIER
// =============================================================================

/**
 * Classify user message intent and auto-detect entities.
 * 
 * Priority order:
 * 1. Content generation (highest - explicit request to create content)
 * 2. Jio inquiry (medium - questions about Jio products)
 * 3. General chat (default - everything else)
 * 
 * @param message - The user's message text
 * @param options - Classification context (profile defaults, manual overrides)
 * @returns Complete intent classification with detected entities
 */
export function classifyIntent(
  message: string,
  options: ClassifyIntentOptions = {},
): IntentClassification {
  const trimmedMessage = message.trim();
  
  // Short or empty messages default to general chat
  if (trimmedMessage.length < 3) {
    return buildResult('general_chat', 'high', ['message too short for classification']);
  }

  // =========================================================================
  // Step 1: Check for content generation intent
  // =========================================================================
  const contentResult = detectContentGeneration(trimmedMessage, options);
  if (contentResult) {
    return contentResult;
  }

  // =========================================================================
  // Step 2: Check for Jio inquiry
  // =========================================================================
  const jioResult = isJioInquiry(trimmedMessage);
  if (jioResult.match) {
    return buildResult('jio_inquiry', 'medium', jioResult.signals);
  }

  // =========================================================================
  // Step 3: Default to general chat
  // =========================================================================
  return buildResult('general_chat', 'high', ['no content or Jio signals detected']);
}

/**
 * Check if message contains coding/programming indicators
 * that should prevent content_generation classification
 */
function isCodingRequest(message: string): boolean {
  return CODING_NEGATIVE_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Detect content generation intent and extract channel/ecosystem
 */
function detectContentGeneration(
  message: string,
  options: ClassifyIntentOptions,
): IntentClassification | null {
  // First, check for coding patterns - these take precedence
  // "Create a script to parse JSON" should NOT be content_generation
  if (isCodingRequest(message)) {
    return null; // Let it fall through to general_chat
  }

  const signals: string[] = [];
  let confidence: IntentConfidence = 'low';

  // Check combined verb + content type pattern
  const combinedMatch = CONTENT_GENERATION_PATTERN.exec(message);
  if (combinedMatch) {
    signals.push(`matched: "${combinedMatch[0]}"`);
    confidence = 'high';
  }

  // Check explicit content patterns
  if (signals.length === 0) {
    for (const pattern of EXPLICIT_CONTENT_PATTERNS) {
      const match = pattern.exec(message);
      if (match) {
        signals.push(`explicit content pattern: "${match[0]}"`);
        confidence = 'high';
        break;
      }
    }
  }

  // Check for content verb + channel detection (medium confidence)
  if (signals.length === 0 && CONTENT_VERBS.test(message)) {
    const channelDetection = detectChannel(message);
    if (channelDetection) {
      signals.push(`verb + detected channel: ${channelDetection.channel}`);
      confidence = 'medium';
    }
  }

  // No content generation signals found
  if (signals.length === 0) {
    return null;
  }

  // Auto-detect channel and ecosystem for the content generation flow
  const detectedChannel = detectChannelFromMessage(message, options);
  const detectedEcosystem = detectEcosystemFromMessage(message, options);

  return {
    intent: 'content_generation',
    confidence,
    signals,
    detectedChannel,
    detectedEcosystem,
    shouldValidate: true,
    shouldShowTrust: true,
    shouldApplyGuardrails: true,
  };
}

/**
 * Detect channel from message, falling back to profile default
 */
function detectChannelFromMessage(
  message: string,
  options: ClassifyIntentOptions,
): DetectedChannel | null {
  const detected = detectChannel(message);
  if (detected) {
    return detected;
  }

  // If no channel detected but user has a manual override, use that
  if (options.channelManuallySet && options.profileChannel) {
    return {
      channel: options.profileChannel,
      matchedKeywords: ['manual override'],
      confidence: 'high',
    };
  }

  // Fall back to profile default
  if (options.profileChannel) {
    return {
      channel: options.profileChannel,
      matchedKeywords: ['profile default'],
      confidence: 'low',
    };
  }

  return null;
}

/**
 * Detect ecosystem from message, falling back to profile default
 */
function detectEcosystemFromMessage(
  message: string,
  options: ClassifyIntentOptions,
): DetectedEcosystem | null {
  const detected = detectEcosystem(message);
  if (detected) {
    return {
      ecosystem: detected,
      matchedKeywords: ['auto-detected from message'],
    };
  }

  // Fall back to profile default
  if (options.profileEcosystem) {
    return {
      ecosystem: options.profileEcosystem,
      matchedKeywords: ['profile default'],
    };
  }

  return null;
}

/**
 * Build a standard IntentClassification result
 */
function buildResult(
  intent: MessageIntent,
  confidence: IntentConfidence,
  signals: string[],
): IntentClassification {
  return {
    intent,
    confidence,
    signals,
    detectedChannel: null,
    detectedEcosystem: null,
    shouldValidate: intent === 'content_generation',
    shouldShowTrust: intent === 'content_generation',
    shouldApplyGuardrails: intent === 'content_generation',
  };
}

export default classifyIntent;
