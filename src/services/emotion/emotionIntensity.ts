/**
 * Emotion Intensity Detector
 * 
 * Detects the intensity level of detected emotions (low, moderate, high, extreme).
 * Provides calibrated response strategies based on intensity.
 * 
 * @module services/emotion/emotionIntensity
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Emotion intensity levels
 */
export type EmotionIntensity = 'low' | 'moderate' | 'high' | 'extreme';

/**
 * Intensity detection result
 */
export interface IntensityResult {
  /** Detected intensity level */
  intensity: EmotionIntensity;
  /** Confidence score 0-1 */
  confidence: number;
  /** Factors that contributed to the intensity */
  factors: IntensityFactor[];
  /** Raw intensity score 0-1 */
  rawScore: number;
  /** Response strategy recommendation */
  strategy: ResponseStrategy;
}

/**
 * Factors contributing to intensity detection
 */
export interface IntensityFactor {
  type: 'punctuation' | 'caps' | 'repetition' | 'intensifier' | 'emotion_word' | 'length' | 'escalation';
  description: string;
  weight: number;
}

/**
 * Response strategy based on intensity
 */
export interface ResponseStrategy {
  /** Warmth level to use */
  warmthLevel: number; // 1-4
  /** Whether to lead with empathy */
  leadWithEmpathy: boolean;
  /** Whether to offer escalation */
  offerEscalation: boolean;
  /** Pace of response */
  pace: 'slow' | 'normal' | 'quick';
  /** Key phrases to consider using */
  suggestedPhrases: string[];
  /** Patterns to avoid */
  avoid: string[];
}

/**
 * Input for intensity detection
 */
export interface IntensityInput {
  message: string;
  emotion: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  turnNumber?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Intensifier words that amplify emotion
 */
const INTENSIFIERS = {
  extreme: ['extremely', 'absolutely', 'totally', 'completely', 'utterly', 'entirely', 'worst', 'terrible', 'horrible', 'disgusting', 'unbearable'],
  high: ['very', 'really', 'so', 'super', 'incredibly', 'highly', 'awful', 'dreadful', 'unacceptable'],
  moderate: ['quite', 'fairly', 'pretty', 'rather', 'somewhat', 'bad', 'poor', 'frustrating'],
  low: ['a bit', 'slightly', 'kind of', 'sort of', 'minor', 'small'],
};

/**
 * Emotion words by intensity
 */
const EMOTION_WORDS = {
  extreme: ['furious', 'enraged', 'livid', 'devastated', 'traumatized', 'heartbroken', 'terrified', 'panic'],
  high: ['angry', 'upset', 'frustrated', 'worried', 'anxious', 'distressed', 'helpless', 'hopeless'],
  moderate: ['annoyed', 'bothered', 'concerned', 'confused', 'disappointed', 'uncomfortable'],
  low: ['curious', 'wondering', 'unsure', 'uncertain', 'puzzled'],
};

/**
 * Escalation phrases indicating mounting frustration
 */
const ESCALATION_PHRASES = [
  /\b(again|still|yet another|once again|for the (nth|hundredth) time)\b/i,
  /\b(how many times|already told|keep (telling|asking|saying))\b/i,
  /\b(been waiting|waiting for|days now|weeks now)\b/i,
  /\b(fed up|had enough|can't take|done with)\b/i,
  /\b(lawyer|legal|consumer court|trai|complaint to)\b/i,
  /\b(social media|twitter|facebook|public)\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect intensity from punctuation
 */
function detectPunctuationIntensity(message: string): IntensityFactor | null {
  const exclamations = (message.match(/!/g) || []).length;
  const questions = (message.match(/\?/g) || []).length;
  const multiPunctuation = (message.match(/[!?]{2,}/g) || []).length;
  
  if (multiPunctuation > 0 || exclamations >= 3) {
    return {
      type: 'punctuation',
      description: 'excessive punctuation detected',
      weight: 0.25,
    };
  }
  if (exclamations >= 2 || (exclamations >= 1 && questions >= 2)) {
    return {
      type: 'punctuation',
      description: 'emphatic punctuation detected',
      weight: 0.15,
    };
  }
  return null;
}

/**
 * Detect intensity from capitalization
 */
function detectCapsIntensity(message: string): IntensityFactor | null {
  // Remove URLs and common acronyms
  const cleaned = message.replace(/https?:\/\/\S+/gi, '').replace(/\b(SMS|OTP|SIM|ID|KYC|UPI|ATM|PIN)\b/g, '');
  
  // Count uppercase words (3+ chars to avoid acronyms)
  const words = cleaned.split(/\s+/);
  const capsWords = words.filter(w => w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
  const capsRatio = capsWords.length / Math.max(words.length, 1);
  
  if (capsRatio > 0.3 || capsWords.length >= 3) {
    return {
      type: 'caps',
      description: 'significant capitalization (shouting)',
      weight: 0.3,
    };
  }
  if (capsWords.length >= 1) {
    return {
      type: 'caps',
      description: 'some emphasis through caps',
      weight: 0.1,
    };
  }
  return null;
}

/**
 * Detect intensity from word repetition
 */
function detectRepetitionIntensity(message: string): IntensityFactor | null {
  const text = message.toLowerCase();
  
  // Check for repeated words
  const repeatedWords = text.match(/\b(\w+)\s+\1\b/gi) || [];
  
  // Check for repeated characters (e.g., "sooooo")
  const elongated = text.match(/(\w)\1{2,}/g) || [];
  
  if (repeatedWords.length >= 2 || elongated.length >= 2) {
    return {
      type: 'repetition',
      description: 'word/character repetition for emphasis',
      weight: 0.2,
    };
  }
  if (repeatedWords.length >= 1 || elongated.length >= 1) {
    return {
      type: 'repetition',
      description: 'some repetition detected',
      weight: 0.1,
    };
  }
  return null;
}

/**
 * Detect intensity from intensifier words
 */
function detectIntensifierWords(message: string): IntensityFactor | null {
  const text = message.toLowerCase();
  
  // Check each intensity level
  for (const word of INTENSIFIERS.extreme) {
    if (text.includes(word)) {
      return {
        type: 'intensifier',
        description: `extreme intensifier "${word}" detected`,
        weight: 0.35,
      };
    }
  }
  
  for (const word of INTENSIFIERS.high) {
    if (text.includes(word)) {
      return {
        type: 'intensifier',
        description: `high intensifier "${word}" detected`,
        weight: 0.25,
      };
    }
  }
  
  for (const word of INTENSIFIERS.moderate) {
    if (text.includes(word)) {
      return {
        type: 'intensifier',
        description: `moderate intensifier "${word}" detected`,
        weight: 0.15,
      };
    }
  }
  
  return null;
}

/**
 * Detect intensity from emotion words
 */
function detectEmotionWords(message: string): IntensityFactor | null {
  const text = message.toLowerCase();
  
  for (const word of EMOTION_WORDS.extreme) {
    if (text.includes(word)) {
      return {
        type: 'emotion_word',
        description: `extreme emotion word "${word}" detected`,
        weight: 0.4,
      };
    }
  }
  
  for (const word of EMOTION_WORDS.high) {
    if (text.includes(word)) {
      return {
        type: 'emotion_word',
        description: `high emotion word "${word}" detected`,
        weight: 0.3,
      };
    }
  }
  
  for (const word of EMOTION_WORDS.moderate) {
    if (text.includes(word)) {
      return {
        type: 'emotion_word',
        description: `moderate emotion word "${word}" detected`,
        weight: 0.2,
      };
    }
  }
  
  return null;
}

/**
 * Detect escalation patterns
 */
function detectEscalation(message: string, conversationHistory?: Array<{ role: string; content: string }>): IntensityFactor | null {
  // Check for escalation phrases
  for (const pattern of ESCALATION_PHRASES) {
    if (pattern.test(message)) {
      return {
        type: 'escalation',
        description: 'escalation language detected',
        weight: 0.3,
      };
    }
  }
  
  // Check for increasing intensity in conversation
  if (conversationHistory && conversationHistory.length >= 3) {
    const userMessages = conversationHistory
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content.length);
    
    // If messages are getting longer, may indicate escalation
    if (userMessages.length >= 2 && 
        userMessages[userMessages.length - 1] > userMessages[0] * 1.5) {
      return {
        type: 'escalation',
        description: 'message length increasing (possible escalation)',
        weight: 0.15,
      };
    }
  }
  
  return null;
}

/**
 * Get base intensity from emotion type
 */
function getBaseEmotionIntensity(emotion: string): number {
  const highIntensityEmotions = ['raudra', 'bhayanak'];
  const moderateIntensityEmotions = ['karun', 'bibhatsa', 'adbhut'];
  const lowIntensityEmotions = ['shant', 'hasya', 'veer', 'shringar'];
  
  if (highIntensityEmotions.includes(emotion)) return 0.4;
  if (moderateIntensityEmotions.includes(emotion)) return 0.25;
  if (lowIntensityEmotions.includes(emotion)) return 0.1;
  return 0.15; // neutral
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect emotion intensity from message
 */
export function detectEmotionIntensity(input: IntensityInput): IntensityResult {
  const { message, emotion, conversationHistory, turnNumber } = input;
  
  const factors: IntensityFactor[] = [];
  
  // Run all detectors
  const punctuation = detectPunctuationIntensity(message);
  if (punctuation) factors.push(punctuation);
  
  const caps = detectCapsIntensity(message);
  if (caps) factors.push(caps);
  
  const repetition = detectRepetitionIntensity(message);
  if (repetition) factors.push(repetition);
  
  const intensifiers = detectIntensifierWords(message);
  if (intensifiers) factors.push(intensifiers);
  
  const emotionWords = detectEmotionWords(message);
  if (emotionWords) factors.push(emotionWords);
  
  const escalation = detectEscalation(message, conversationHistory);
  if (escalation) factors.push(escalation);
  
  // Calculate raw score
  const baseScore = getBaseEmotionIntensity(emotion);
  const factorScore = factors.reduce((sum, f) => sum + f.weight, 0);
  
  // Turn number adjustment (frustration builds over time)
  const turnAdjustment = turnNumber && turnNumber > 5 ? 0.1 : 0;
  
  const rawScore = Math.min(baseScore + factorScore + turnAdjustment, 1);
  
  // Determine intensity level
  let intensity: EmotionIntensity;
  if (rawScore >= 0.7) intensity = 'extreme';
  else if (rawScore >= 0.5) intensity = 'high';
  else if (rawScore >= 0.25) intensity = 'moderate';
  else intensity = 'low';
  
  // Calculate confidence
  const confidence = factors.length > 0 
    ? Math.min(0.5 + (factors.length * 0.15), 0.95)
    : 0.6;
  
  return {
    intensity,
    confidence,
    factors,
    rawScore,
    strategy: getResponseStrategy(intensity, emotion),
  };
}

/**
 * Get response strategy for intensity level
 */
function getResponseStrategy(intensity: EmotionIntensity, emotion: string): ResponseStrategy {
  const strategies: Record<EmotionIntensity, ResponseStrategy> = {
    extreme: {
      warmthLevel: 4,
      leadWithEmpathy: true,
      offerEscalation: true,
      pace: 'slow',
      suggestedPhrases: [
        'i can hear how {frustrated/worried/upset} you are',
        'this is absolutely not the experience you should be having',
        'let me personally ensure this gets resolved',
        'i understand this is urgent',
      ],
      avoid: [
        'asking multiple questions',
        'technical jargon',
        'suggesting self-service',
        'defensive language',
      ],
    },
    high: {
      warmthLevel: 4,
      leadWithEmpathy: true,
      offerEscalation: false,
      pace: 'normal',
      suggestedPhrases: [
        'i understand this is frustrating',
        'let me help you sort this out right away',
        "you're right to be concerned",
        "here's what we can do",
      ],
      avoid: [
        'multiple steps at once',
        'policy language',
        'suggesting patience',
      ],
    },
    moderate: {
      warmthLevel: 3,
      leadWithEmpathy: true,
      offerEscalation: false,
      pace: 'normal',
      suggestedPhrases: [
        'i understand',
        "let's get this sorted",
        'i can help with that',
      ],
      avoid: [
        'being dismissive',
        'overly casual tone',
      ],
    },
    low: {
      warmthLevel: 2,
      leadWithEmpathy: false,
      offerEscalation: false,
      pace: 'quick',
      suggestedPhrases: [
        'sure, i can help',
        "here's what you need",
      ],
      avoid: [],
    },
  };
  
  return strategies[intensity];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format intensity for prompt injection
 */
export function formatIntensityForPrompt(result: IntensityResult): string {
  const lines = [
    `## emotion intensity`,
    `level: ${result.intensity}`,
    `confidence: ${(result.confidence * 100).toFixed(0)}%`,
  ];
  
  if (result.factors.length > 0) {
    lines.push(`factors: ${result.factors.map(f => f.type).join(', ')}`);
  }
  
  lines.push('');
  lines.push('### response strategy');
  lines.push(`warmth: ${result.strategy.warmthLevel}/4`);
  lines.push(`pace: ${result.strategy.pace}`);
  
  if (result.strategy.leadWithEmpathy) {
    lines.push('**lead with empathy before solutions**');
  }
  
  if (result.strategy.offerEscalation) {
    lines.push('**offer human escalation option**');
  }
  
  if (result.strategy.avoid.length > 0) {
    lines.push('');
    lines.push('avoid:');
    result.strategy.avoid.forEach(a => lines.push(`- ${a}`));
  }
  
  return lines.join('\n');
}

/**
 * Check if intensity requires immediate attention
 */
export function requiresImmediateAttention(result: IntensityResult): boolean {
  return result.intensity === 'extreme' || result.intensity === 'high';
}

/**
 * Get intensity display label
 */
export function getIntensityLabel(intensity: EmotionIntensity): string {
  const labels: Record<EmotionIntensity, string> = {
    low: 'calm',
    moderate: 'concerned',
    high: 'upset',
    extreme: 'distressed',
  };
  return labels[intensity];
}
