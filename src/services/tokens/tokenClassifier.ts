/**
 * Token Classifier
 * 
 * Classifies user input and context into the 14 token categories
 * defined in the Jio Conversational AI framework (Tokens v2).
 * 
 * Categories:
 * 1. intent - inform, alert, support, action, confirm, etc.
 * 2. profile - user segment/type
 * 3. region - geographic context
 * 4. lang - primary language
 * 5. script - writing system
 * 6. lang_mix - code-mixing patterns
 * 7. literacy - communication level
 * 8. emotion.user - detected Navarasa emotion
 * 9. emotion.target - target emotion to guide toward
 * 10. persona - AI persona to use
 * 11. tone.guardrail - safety/compliance constraints
 * 12. tone.warmth - warmth level (1-4)
 * 13. tone.detail - detail level (1-3)
 * 14. ecosystem/channel/platform/context/structure/pattern/risk/signature
 * 
 * @module services/tokens/tokenClassifier
 */

import { 
  INTENT_TYPES, 
  NAVARASA, 
  SAFETY_DOMAINS,
  type IntentType,
  type NavarasaEmotion,
  type SafetyDomain,
} from '../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TokenClassification {
  // Core intent
  intent: IntentType;
  intentConfidence: number;
  
  // User profile
  profile: UserProfile;
  
  // Regional/Language
  region: string;
  lang: Language;
  script: Script;
  langMix: LanguageMixLevel;
  literacy: LiteracyLevel;
  
  // Emotion
  userEmotion: NavarasaEmotion;
  emotionConfidence: number;
  targetEmotion: NavarasaEmotion;
  
  // Persona & Tone
  persona: PersonaType;
  toneGuardrail: ToneGuardrail;
  toneWarmth: 1 | 2 | 3 | 4;
  toneDetail: 1 | 2 | 3;
  
  // Context
  ecosystem: string;
  channel: string;
  platform: string;
  context: ContextType;
  structure: StructureType;
  pattern: string[];
  risk: RiskLevel;
  
  // Safety domains detected
  safetyDomains: SafetyDomain[];
  
  // Signature (for tracing)
  signature: string;
}

export type UserProfile = 'new_user' | 'regular' | 'premium' | 'enterprise' | 'senior' | 'youth' | 'unknown';
export type Language = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'bn' | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'as' | 'hinglish' | 'other';
export type Script = 'latin' | 'devanagari' | 'tamil' | 'telugu' | 'bengali' | 'gujarati' | 'kannada' | 'malayalam' | 'gurmukhi' | 'odia' | 'assamese' | 'mixed';
export type LanguageMixLevel = 'pure' | 'light_mix' | 'heavy_mix' | 'code_switch';
export type LiteracyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
export type PersonaType = 'helper' | 'advisor' | 'guide' | 'companion' | 'expert';
export type ToneGuardrail = 'none' | 'cautious' | 'strict' | 'compliance';
export type ContextType = 'transactional' | 'informational' | 'support' | 'conversational' | 'emergency';
export type StructureType = 'single_turn' | 'multi_turn' | 'flow_based' | 'open_ended';
export type RiskLevel = 'low' | 'medium' | 'high' | 'regulated';

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const INTENT_PATTERNS: Record<IntentType, { keywords: string[]; patterns: RegExp[] }> = {
  inform: {
    keywords: ['status', 'update', 'what is', 'check', 'show', 'tell me'],
    patterns: [/what('?s| is) (my|the)/, /how much/, /show me/],
  },
  alert: {
    keywords: ['urgent', 'emergency', 'immediately', 'critical', 'warning'],
    patterns: [/urgent/, /emergency/, /right now/],
  },
  support: {
    keywords: ['help', 'issue', 'problem', 'not working', 'fix', 'error', 'failed'],
    patterns: [/not working/, /can't (do|access|use)/, /having (an? )?issue/],
  },
  action: {
    keywords: ['do', 'make', 'create', 'set', 'change', 'update', 'process'],
    patterns: [/can you (do|make|create)/, /please (do|make|set)/],
  },
  confirm: {
    keywords: ['verify', 'confirm', 'is it', 'correct', 'right'],
    patterns: [/is (this|that|it) (correct|right)/, /verify/],
  },
  delight: {
    keywords: ['thanks', 'great', 'awesome', 'love', 'amazing'],
    patterns: [/thank (you|u)/, /that('?s| is) (great|awesome)/],
  },
  engage: {
    keywords: ['hello', 'hi', 'hey', 'how are', 'what up'],
    patterns: [/^(hi|hello|hey)/, /how are you/],
  },
  onboard: {
    keywords: ['new', 'first time', 'getting started', 'setup', 'register'],
    patterns: [/first time/, /new (here|user)/, /getting started/],
  },
  explain: {
    keywords: ['how does', 'what does', 'explain', 'why', 'understand'],
    patterns: [/how does/, /what does/, /can you explain/],
  },
  verifyIdentity: {
    keywords: ['verify', 'otp', 'authenticate', 'login', 'password'],
    patterns: [/verify (my |my )?identity/, /otp/, /login/],
  },
  verifyDevice: {
    keywords: ['device', 'phone', 'trust', 'new device'],
    patterns: [/new device/, /trust (this|my) device/],
  },
  transaction: {
    keywords: ['pay', 'transfer', 'recharge', 'buy', 'purchase', 'subscribe'],
    patterns: [/pay (for|the)/, /recharge/, /buy|purchase/],
  },
  security: {
    keywords: ['security', 'hack', 'breach', 'suspicious', 'unauthorized'],
    patterns: [/security/, /hacked/, /unauthorized/],
  },
  resolve: {
    keywords: ['resolved', 'fixed', 'done', 'complete', 'finished'],
    patterns: [/is (it|this) (resolved|fixed)/, /(problem|issue) solved/],
  },
  complaint: {
    keywords: ['complaint', 'dissatisfied', 'frustrated', 'angry', 'upset', 'bad'],
    patterns: [/want to complain/, /very (frustrated|angry|upset)/],
  },
  educate: {
    keywords: ['learn', 'teach', 'how to', 'guide', 'tutorial'],
    patterns: [/how (do|to)/, /teach me/, /learn (about|how)/],
  },
  remind: {
    keywords: ['remind', 'reminder', 'schedule', 'later', 'notify'],
    patterns: [/remind me/, /set (a )?reminder/],
  },
  sell: {
    keywords: ['recommend', 'suggest', 'best', 'which', 'compare'],
    patterns: [/which (one|plan)/, /recommend/, /what('?s| is) the best/],
  },
  feedback: {
    keywords: ['feedback', 'rate', 'review', 'opinion', 'suggestion'],
    patterns: [/give feedback/, /rate (this|my)/, /my (feedback|suggestion)/],
  },
};

function classifyIntent(text: string): { intent: IntentType; confidence: number } {
  const lowerText = text.toLowerCase();
  const scores: Record<IntentType, number> = {} as Record<IntentType, number>;
  
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    
    // Keyword matching
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        score += 1;
      }
    }
    
    // Pattern matching (weighted higher)
    for (const pattern of config.patterns) {
      if (pattern.test(lowerText)) {
        score += 2;
      }
    }
    
    scores[intent as IntentType] = score;
  }
  
  // Find highest score
  let maxIntent: IntentType = 'inform';
  let maxScore = 0;
  
  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxIntent = intent as IntentType;
    }
  }
  
  // Normalize confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;
  
  return { intent: maxIntent, confidence: Math.min(1, confidence) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_PATTERNS: Record<NavarasaEmotion, { keywords: string[]; patterns: RegExp[] }> = {
  shanta: {
    keywords: ['ok', 'fine', 'alright', 'sure', 'thanks'],
    patterns: [/^(ok|okay|fine|sure)$/],
  },
  hasya: {
    keywords: ['haha', 'lol', 'great', 'awesome', 'excited', 'happy', 'wonderful'],
    patterns: [/ha(ha)+/, /lol/, /yay/],
  },
  veera: {
    keywords: ['let\'s do', 'ready', 'go ahead', 'definitely', 'absolutely'],
    patterns: [/let('?s| us) (do|go)/, /i('?m| am) ready/],
  },
  karuna: {
    keywords: ['sad', 'disappointed', 'sorry', 'unfortunately', 'regret'],
    patterns: [/i('?m| am) (sad|disappointed)/, /too bad/],
  },
  raudra: {
    keywords: ['angry', 'frustrated', 'annoyed', 'terrible', 'worst', 'unacceptable', 'ridiculous'],
    patterns: [/so (angry|frustrated)/, /this is (terrible|ridiculous|unacceptable)/],
  },
  bhayanaka: {
    keywords: ['worried', 'concerned', 'scared', 'afraid', 'anxious', 'nervous'],
    patterns: [/i('?m| am) (worried|concerned|scared|afraid)/, /what if/],
  },
  bibhatsa: {
    keywords: ['hate', 'disgusted', 'dislike', 'awful', 'gross'],
    patterns: [/i (hate|dislike)/, /this is awful/],
  },
  adbhuta: {
    keywords: ['wow', 'amazing', 'interesting', 'curious', 'wonder', 'how'],
    patterns: [/wow/, /how (does|can|is)/],
  },
  shringara: {
    keywords: ['love', 'appreciate', 'grateful', 'thank', 'dear'],
    patterns: [/i (love|appreciate)/, /thank you so much/],
  },
};

function classifyEmotion(text: string): { emotion: NavarasaEmotion; confidence: number } {
  const lowerText = text.toLowerCase();
  const scores: Record<NavarasaEmotion, number> = {} as Record<NavarasaEmotion, number>;
  
  for (const [emotion, config] of Object.entries(EMOTION_PATTERNS)) {
    let score = 0;
    
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        score += 1;
      }
    }
    
    for (const pattern of config.patterns) {
      if (pattern.test(lowerText)) {
        score += 2;
      }
    }
    
    scores[emotion as NavarasaEmotion] = score;
  }
  
  let maxEmotion: NavarasaEmotion = 'shanta';
  let maxScore = 0;
  
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion as NavarasaEmotion;
    }
  }
  
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;
  
  return { emotion: maxEmotion, confidence: Math.min(1, confidence) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANGUAGE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const HINDI_CHARS = /[\u0900-\u097F]/;
const TAMIL_CHARS = /[\u0B80-\u0BFF]/;
const TELUGU_CHARS = /[\u0C00-\u0C7F]/;
const BENGALI_CHARS = /[\u0980-\u09FF]/;
const GUJARATI_CHARS = /[\u0A80-\u0AFF]/;
const KANNADA_CHARS = /[\u0C80-\u0CFF]/;
const MALAYALAM_CHARS = /[\u0D00-\u0D7F]/;
const PUNJABI_CHARS = /[\u0A00-\u0A7F]/;

const HINGLISH_PATTERNS = [
  /\b(kya|hai|nahi|kaise|kyun|kab|kahan|kaun|kitna|bahut|accha|theek|haan|nhi)\b/i,
  /\b(please|ok|sorry|thanks|hi|hello|bye)\b.*[\u0900-\u097F]/i,
];

function detectLanguage(text: string): { lang: Language; script: Script; langMix: LanguageMixLevel } {
  const hasHindi = HINDI_CHARS.test(text);
  const hasTamil = TAMIL_CHARS.test(text);
  const hasTelugu = TELUGU_CHARS.test(text);
  const hasBengali = BENGALI_CHARS.test(text);
  const hasGujarati = GUJARATI_CHARS.test(text);
  const hasKannada = KANNADA_CHARS.test(text);
  const hasMalayalam = MALAYALAM_CHARS.test(text);
  const hasPunjabi = PUNJABI_CHARS.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  
  // Check for Hinglish (romanized Hindi)
  const isHinglish = HINGLISH_PATTERNS.some(p => p.test(text));
  
  // Determine script
  let script: Script = 'latin';
  if (hasHindi) script = 'devanagari';
  else if (hasTamil) script = 'tamil';
  else if (hasTelugu) script = 'telugu';
  else if (hasBengali) script = 'bengali';
  else if (hasGujarati) script = 'gujarati';
  else if (hasKannada) script = 'kannada';
  else if (hasMalayalam) script = 'malayalam';
  else if (hasPunjabi) script = 'gurmukhi';
  
  // Multiple scripts = mixed
  const scriptCount = [hasHindi, hasTamil, hasTelugu, hasBengali, hasGujarati, hasKannada, hasMalayalam, hasPunjabi].filter(Boolean).length;
  if (scriptCount > 1 || (scriptCount === 1 && hasLatin)) {
    script = 'mixed';
  }
  
  // Determine language
  let lang: Language = 'en';
  if (hasHindi && !hasLatin) lang = 'hi';
  else if (isHinglish || (hasHindi && hasLatin)) lang = 'hinglish';
  else if (hasTamil) lang = 'ta';
  else if (hasTelugu) lang = 'te';
  else if (hasBengali) lang = 'bn';
  else if (hasGujarati) lang = 'gu';
  else if (hasKannada) lang = 'kn';
  else if (hasMalayalam) lang = 'ml';
  else if (hasPunjabi) lang = 'pa';
  
  // Determine mix level
  let langMix: LanguageMixLevel = 'pure';
  if (script === 'mixed') {
    const indicRatio = (text.match(/[\u0900-\u0DFF]/g)?.length || 0) / text.length;
    if (indicRatio > 0.5) langMix = 'heavy_mix';
    else if (indicRatio > 0.2) langMix = 'light_mix';
    else langMix = 'code_switch';
  } else if (isHinglish) {
    langMix = 'heavy_mix';
  }
  
  return { lang, script, langMix };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LITERACY ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

function estimateLiteracy(text: string): LiteracyLevel {
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const sentenceCount = text.split(/[.!?]+/).filter(Boolean).length;
  const avgSentenceLength = words.length / Math.max(1, sentenceCount);
  
  // Simple heuristic based on complexity
  if (avgWordLength > 6 && avgSentenceLength > 15) return 'advanced';
  if (avgWordLength > 5 || avgSentenceLength > 10) return 'intermediate';
  if (words.length < 5) return 'basic';
  return 'intermediate';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassificationInput {
  text: string;
  ecosystem?: string;
  channel?: string;
  platform?: string;
  userProfile?: UserProfile;
  sessionContext?: {
    turnCount: number;
    previousEmotions: NavarasaEmotion[];
    previousIntents: IntentType[];
  };
}

export function classifyTokens(input: ClassificationInput): TokenClassification {
  const { text, ecosystem, channel, platform, userProfile, sessionContext } = input;
  
  // Intent classification
  const { intent, confidence: intentConfidence } = classifyIntent(text);
  
  // Emotion classification
  const { emotion: userEmotion, confidence: emotionConfidence } = classifyEmotion(text);
  
  // Language detection
  const { lang, script, langMix } = detectLanguage(text);
  
  // Literacy estimation
  const literacy = estimateLiteracy(text);
  
  // Target emotion (based on Navarasa rules)
  const emotionConfig = NAVARASA[userEmotion];
  const targetEmotion = emotionConfig.allowedTargets[0] as NavarasaEmotion;
  
  // Detect safety domains
  const safetyDomains: SafetyDomain[] = [];
  for (const [domain, config] of Object.entries(SAFETY_DOMAINS)) {
    const hasMatch = config.triggerKeywords.some(kw => 
      text.toLowerCase().includes(kw.toLowerCase())
    );
    if (hasMatch) {
      safetyDomains.push(domain as SafetyDomain);
    }
  }
  
  // Determine risk level
  let risk: RiskLevel = 'low';
  if (safetyDomains.length > 0) {
    const levels = safetyDomains.map(d => SAFETY_DOMAINS[d].level);
    if (levels.includes('critical')) risk = 'high';
    else if (levels.includes('high')) risk = 'high';
    else if (levels.includes('moderate')) risk = 'medium';
  }
  
  // Determine tone guardrail
  let toneGuardrail: ToneGuardrail = 'none';
  if (risk === 'high') toneGuardrail = 'strict';
  else if (risk === 'medium') toneGuardrail = 'cautious';
  
  // Determine warmth and detail
  let toneWarmth: 1 | 2 | 3 | 4 = 2;
  let toneDetail: 1 | 2 | 3 = 2;
  
  // Adjust warmth based on emotion
  if (userEmotion === 'raudra' || userEmotion === 'karuna' || userEmotion === 'bhayanaka') {
    toneWarmth = 3; // Reassuring
  } else if (userEmotion === 'hasya') {
    toneWarmth = 4; // Celebratory
  }
  
  // Adjust detail based on intent
  if (intent === 'explain' || intent === 'educate') {
    toneDetail = 3; // Expanded
  } else if (intent === 'confirm' || intent === 'resolve') {
    toneDetail = 1; // Minimal
  }
  
  // Adjust for risk
  if (risk === 'high') {
    toneWarmth = Math.min(2, toneWarmth) as 1 | 2 | 3 | 4;
  }
  
  // Determine context type
  let context: ContextType = 'informational';
  if (['transaction', 'action', 'verifyIdentity'].includes(intent)) {
    context = 'transactional';
  } else if (['support', 'complaint', 'security'].includes(intent)) {
    context = 'support';
  } else if (['engage', 'delight'].includes(intent)) {
    context = 'conversational';
  } else if (safetyDomains.some(d => SAFETY_DOMAINS[d].level === 'critical')) {
    context = 'emergency';
  }
  
  // Determine structure
  let structure: StructureType = 'single_turn';
  if (sessionContext && sessionContext.turnCount > 1) {
    structure = 'multi_turn';
  }
  if (['transaction', 'onboard', 'verifyIdentity'].includes(intent)) {
    structure = 'flow_based';
  }
  
  // Determine persona
  let persona: PersonaType = 'helper';
  if (['explain', 'educate'].includes(intent)) persona = 'guide';
  if (intent === 'sell') persona = 'advisor';
  if (risk === 'high') persona = 'expert';
  
  // Determine pattern blocks
  const pattern: string[] = ['acknowledge'];
  if (userEmotion !== 'shanta') pattern.push('empathize');
  if (intent === 'support' || intent === 'complaint') pattern.push('clarify');
  pattern.push('inform');
  if (['explain', 'educate', 'support'].includes(intent)) pattern.push('guide');
  pattern.push('nextStep');
  
  // Generate signature
  const signature = generateSignature({
    intent,
    userEmotion,
    lang,
    ecosystem: ecosystem || 'unknown',
    channel: channel || 'unknown',
    risk,
  });
  
  return {
    intent,
    intentConfidence,
    profile: userProfile || 'unknown',
    region: 'IN', // Default to India
    lang,
    script,
    langMix,
    literacy,
    userEmotion,
    emotionConfidence,
    targetEmotion,
    persona,
    toneGuardrail,
    toneWarmth,
    toneDetail,
    ecosystem: ecosystem || 'jio_platforms',
    channel: channel || 'chatbot',
    platform: platform || 'web',
    context,
    structure,
    pattern,
    risk,
    safetyDomains,
    signature,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function generateSignature(params: {
  intent: string;
  userEmotion: string;
  lang: string;
  ecosystem: string;
  channel: string;
  risk: string;
}): string {
  const timestamp = Date.now().toString(36);
  const hash = Object.values(params).join('-').slice(0, 20);
  return `jio-${timestamp}-${hash}`;
}

/**
 * Get token summary for debugging
 */
export function getTokenSummary(classification: TokenClassification): string {
  return [
    `Intent: ${classification.intent} (${Math.round(classification.intentConfidence * 100)}%)`,
    `Emotion: ${classification.userEmotion} → ${classification.targetEmotion}`,
    `Language: ${classification.lang} (${classification.script}, ${classification.langMix})`,
    `Tone: warmth=${classification.toneWarmth}, detail=${classification.toneDetail}, guardrail=${classification.toneGuardrail}`,
    `Risk: ${classification.risk}`,
    classification.safetyDomains.length > 0 ? `Safety: ${classification.safetyDomains.join(', ')}` : null,
  ].filter(Boolean).join('\n');
}
