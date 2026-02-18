/**
 * Safety Classifier
 * 
 * Classifies user input into safety domains with risk levels.
 * This runs BEFORE generation to determine routing and advisory boundaries.
 * 
 * Based on:
 * - 24 safety domains from Tokens v2 spec
 * - 4 risk levels: critical, high, moderate, low
 * - Advisory boundaries that control response behavior
 * 
 * @module services/safety/safetyClassifier
 */

import { 
  SAFETY_DOMAINS, 
  type SafetyDomain, 
  type SafetyLevel, 
  type AdvisoryBoundary 
} from '../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SafetyClassification {
  /** Primary detected safety domain */
  domain: SafetyDomain | 'none';
  /** Risk level of the domain */
  level: SafetyLevel;
  /** How the system should advise/respond */
  advisoryBoundary: AdvisoryBoundary;
  /** Confidence score 0-1 */
  confidence: number;
  /** All detected domains (may have multiple) */
  allDetectedDomains: Array<{
    domain: SafetyDomain;
    confidence: number;
    matchedPatterns: string[];
  }>;
  /** Whether this requires immediate action */
  requiresImmediateAction: boolean;
  /** Whether nudging is blocked */
  nudgingBlocked: boolean;
  /** Suggested escalation if needed */
  escalationSuggestion?: string;
}

export interface ClassifierConfig {
  /** Minimum confidence to trigger domain detection */
  minConfidence?: number;
  /** Whether to use fuzzy matching */
  useFuzzyMatching?: boolean;
  /** Custom patterns to add */
  additionalPatterns?: Record<SafetyDomain, string[]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE COMPOUND PHRASES (to prevent false positives)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safe compound phrases that contain concerning keywords but are NOT safety risks.
 * These are checked BEFORE keyword matching to prevent false positives.
 * 
 * Example: "cutting-edge" contains "cutting" but is not self-harm.
 */
const SAFE_COMPOUND_PHRASES = [
  // "cutting" in non-harmful contexts
  'cutting-edge', 'cutting edge', 'cutting costs', 'cutting down on',
  'cutting back', 'budget cuts', 'tax cuts', 'price cuts', 'cutting corners',
  'cut to the chase', 'cut above', 'clear cut', 'final cut', 'director\'s cut',
  // "hurt" in non-harmful contexts  
  'hurt feelings', 'hurt the business', 'hurt sales', 'hurt performance',
  // "harm" in non-harmful contexts
  'no harm', 'without harm', 'harm reduction', 'do no harm',
  // "kill" in non-harmful contexts
  'kill time', 'kill the process', 'kill the app', 'kill two birds',
  'killing it', 'time to kill',
] as const;

/**
 * Check if text contains any safe compound phrases that should exclude keyword matching
 */
function containsSafeCompoundPhrase(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  
  // Only check safe phrases that contain the keyword
  for (const phrase of SAFE_COMPOUND_PHRASES) {
    if (phrase.toLowerCase().includes(lowerKeyword) && lowerText.includes(phrase.toLowerCase())) {
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENDED PATTERN LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extended keyword patterns for each safety domain.
 * These complement the basic trigger keywords in coreRules.ts
 */
const EXTENDED_PATTERNS: Record<SafetyDomain, {
  keywords: string[];
  phrases: string[];
  regexPatterns: RegExp[];
}> = {
  // ── Critical Level ─────────────────────────────────────────────────
  self_harm: {
    // Note: "cutting" alone removed - too many false positives with "cutting-edge"
    // Instead, we rely on more specific phrases like "cut myself"
    // "my self" (two words) variants added to catch common typos/spacing
    keywords: ['cut myself', 'hurt myself', 'self harm', 'self-harm', 'cut my self', 'hurt my self', 'harm my self'],
    phrases: ['want to hurt', 'harm myself', 'punish myself', 'pain myself', 'harm my self', 'punish my self'],
    regexPatterns: [
      /\b(i|im|i'm)\s+(want|going|trying)\s+to\s+(hurt|harm|cut)\s+(myself|my\s+self|me)\b/i,
      /\bself[\s-]?(harm|injury|mutilation)\b/i,
    ],
  },
  suicide_risk: {
    keywords: ['suicide', 'kill myself', 'end my life', 'want to die', 'take my life'],
    phrases: ['better off dead', 'no reason to live', 'end it all', 'cant go on', "can't go on"],
    regexPatterns: [
      /\b(i|im|i'm)\s+(want|going|trying|planning)\s+to\s+(kill|end)\s+(myself|my life)\b/i,
      /\b(want|wish)\s+(i\s+was|to\s+be)\s+dead\b/i,
      /\b(no\s+point|no\s+reason)\s+(in\s+)?(living|life)\b/i,
    ],
  },
  child_safety: {
    keywords: ['child abuse', 'minor', 'underage', 'inappropriate with child'],
    phrases: ['hurt a child', 'abuse children', 'images of children', 'pictures of minors'],
    regexPatterns: [
      /\b(abuse|harm|hurt)\s+(a\s+)?(child|children|minor|kid)\b/i,
      /\b(underage|minor)\s+(content|material|images|pictures)\b/i,
    ],
  },
  sexual_minors: {
    keywords: [],
    phrases: [],
    regexPatterns: [
      /\b(sexual|explicit)\s+(content|material|images)?\s*(with|of|involving)?\s*(minor|child|underage)\b/i,
    ],
  },
  violence: {
    keywords: ['kill', 'murder', 'attack', 'bomb', 'hurt someone', 'shoot', 'stab'],
    phrases: ['want to kill', 'going to attack', 'make a bomb', 'hurt them', 'beat someone'],
    regexPatterns: [
      /\b(i|im|i'm)\s+(want|going|planning)\s+to\s+(kill|murder|attack|hurt)(?!\s+(myself|my\s*self|me)\b)/i,
      /\bhow\s+to\s+(make|build)\s+(a\s+)?(bomb|explosive|weapon)\b/i,
      /\b(threaten|threatening)\s+(to\s+)?(kill|harm|hurt)\b/i,
    ],
  },

  // ── High Level ─────────────────────────────────────────────────────
  health_emergency: {
    keywords: ['emergency', 'heart attack', 'cant breathe', "can't breathe", 'unconscious', 'stroke', 'seizure'],
    phrases: ['having a heart attack', 'not breathing', 'choking', 'severe pain', 'collapsed'],
    regexPatterns: [
      /\b(heart\s+attack|stroke|seizure|choking|collapsed)\b/i,
      /\b(cant|can't|cannot)\s+(breathe|breath)\b/i,
      /\b(severe|extreme)\s+(chest\s+)?pain\b/i,
      /\b(unconscious|unresponsive)\b/i,
    ],
  },
  mental_health: {
    keywords: ['depressed', 'depression', 'anxiety', 'panic attack', 'mental health', 'bipolar', 'ptsd'],
    phrases: ['feeling hopeless', 'cant cope', "can't cope", 'mental breakdown', 'losing my mind'],
    regexPatterns: [
      /\b(severe|clinical|major)\s+(depression|anxiety)\b/i,
      /\b(panic|anxiety)\s+attack\b/i,
      /\b(i|im|i'm)\s+(so\s+)?(depressed|anxious)\b/i,
    ],
  },
  legal_advice: {
    keywords: ['legal advice', 'sue', 'court case', 'lawyer', 'lawsuit', 'legal action'],
    phrases: ['should I sue', 'need a lawyer', 'legal rights', 'take to court', 'file a case'],
    regexPatterns: [
      /\b(should|can)\s+i\s+sue\b/i,
      /\b(need|find|get)\s+(a\s+)?lawyer\b/i,
      /\b(legal|court)\s+(advice|action|case)\b/i,
    ],
  },
  investment_advice: {
    keywords: ['invest', 'stock tips', 'financial advice', 'should I buy', 'trading advice'],
    phrases: ['where to invest', 'best stocks', 'crypto advice', 'investment recommendation'],
    regexPatterns: [
      /\b(should|where)\s+(i|to)\s+(invest|buy|sell)\b/i,
      /\b(stock|crypto|investment)\s+(tips?|advice|recommendation)\b/i,
      /\bguaranteed\s+(returns?|profit)\b/i,
    ],
  },
  fraud_scam: {
    keywords: ['scam', 'fraud', 'stolen money', 'hacked account', 'phishing'],
    phrases: ['someone stole', 'money missing', 'fraudulent transaction', 'fake website'],
    regexPatterns: [
      /\b(been|got)\s+(scammed|defrauded|hacked)\b/i,
      /\b(money|funds)\s+(stolen|missing|disappeared)\b/i,
      /\b(suspicious|fraudulent)\s+(transaction|activity|link)\b/i,
    ],
  },
  identity_theft: {
    keywords: ['identity stolen', 'someone using my', 'impersonation', 'identity fraud'],
    phrases: ['using my identity', 'someone pretending', 'stole my identity', 'fake account in my name'],
    regexPatterns: [
      /\b(identity|id)\s+(stolen|theft|fraud)\b/i,
      /\bsomeone\s+(using|stole)\s+my\s+(identity|account|information)\b/i,
      /\b(fake|fraudulent)\s+account\s+(in\s+)?my\s+name\b/i,
    ],
  },

  // ── Moderate Level ─────────────────────────────────────────────────
  health_general: {
    keywords: ['symptoms', 'medicine', 'diagnosis', 'treatment', 'disease', 'illness'],
    phrases: ['what are symptoms', 'should I take', 'is this normal', 'health concern'],
    regexPatterns: [
      /\b(what|which)\s+(medicine|medication|treatment)\b/i,
      /\b(symptoms|signs)\s+of\b/i,
      /\bis\s+(this|it)\s+(normal|serious|dangerous)\b/i,
    ],
  },
  finance_general: {
    keywords: ['loan', 'credit', 'insurance', 'tax', 'emi', 'interest rate'],
    phrases: ['apply for loan', 'credit score', 'insurance claim', 'tax filing'],
    regexPatterns: [
      /\b(home|personal|car)\s+loan\b/i,
      /\b(credit\s+)?score\b/i,
      /\b(file|filing)\s+(taxes?|returns?)\b/i,
    ],
  },
  legal_general: {
    keywords: ['legal', 'rights', 'law', 'regulation', 'compliance'],
    phrases: ['is it legal', 'what are my rights', 'against the law', 'legally allowed'],
    regexPatterns: [
      /\bis\s+(it|this)\s+(legal|illegal|allowed)\b/i,
      /\b(my|consumer|employee)\s+rights\b/i,
      /\bagainst\s+(the\s+)?law\b/i,
    ],
  },
  privacy_personal_data: {
    keywords: ['privacy', 'data leak', 'personal information', 'data breach'],
    phrases: ['my data leaked', 'personal info exposed', 'privacy violation', 'data stolen'],
    regexPatterns: [
      /\b(data|privacy)\s+(breach|leak|violation)\b/i,
      /\b(personal|private)\s+(data|information)\s+(leaked|exposed|stolen)\b/i,
    ],
  },
  biometric_data: {
    keywords: ['fingerprint', 'face id', 'biometric', 'aadhaar', 'facial recognition'],
    phrases: ['biometric data', 'fingerprint scan', 'aadhaar linked', 'face recognition'],
    regexPatterns: [
      /\b(biometric|fingerprint|facial)\s+(data|scan|verification)\b/i,
      /\baadhaar\s+(link|verification|number)\b/i,
    ],
  },
  cybersecurity: {
    keywords: ['hacked', 'virus', 'malware', 'phishing', 'ransomware', 'cyber attack'],
    phrases: ['been hacked', 'computer virus', 'suspicious link', 'malware detected'],
    regexPatterns: [
      /\b(been|got)\s+hacked\b/i,
      /\b(virus|malware|ransomware)\s+(detected|found|infection)\b/i,
      /\b(suspicious|phishing)\s+(link|email|message)\b/i,
    ],
  },
  political_persuasion: {
    keywords: ['vote for', 'political party', 'election', 'government criticism'],
    phrases: ['which party', 'who to vote', 'support this party', 'political opinion'],
    regexPatterns: [
      /\b(who|which)\s+(to\s+)?vote\s+(for)?\b/i,
      /\b(support|join)\s+(this|the)\s+(party|movement)\b/i,
      /\b(political|government)\s+(opinion|view|stance)\b/i,
    ],
  },
  misinformation: {
    keywords: ['fake news', 'conspiracy', 'they dont want you to know', 'cover up'],
    phrases: ['truth they hide', 'media lies', 'real facts', 'what they wont tell'],
    regexPatterns: [
      /\b(fake|false)\s+news\b/i,
      /\bconspiracy\s+(theory|theories)\b/i,
      /\b(they|government|media)\s+(dont|don't|wont|won't)\s+(want|tell)\s+(you|us)\b/i,
    ],
  },

  // ── Low Level ──────────────────────────────────────────────────────
  hate_harassment: {
    keywords: ['hate', 'harass', 'discriminate', 'slur', 'racist', 'sexist'],
    phrases: ['hate speech', 'harassment', 'discriminate against', 'offensive language'],
    regexPatterns: [
      /\b(racist|sexist|homophobic|transphobic)\b/i,
      /\b(hate|harass)\s+(speech|them|this\s+group)\b/i,
    ],
  },
  sexual_content: {
    keywords: [],
    phrases: [],
    regexPatterns: [
      /\b(explicit|adult|sexual)\s+(content|material|images)\b/i,
      /\b(porn|pornograph(y|ic))\b/i,
    ],
  },
  dangerous_activity: {
    keywords: ['dangerous', 'risky', 'illegal activity', 'break in', 'trespass'],
    phrases: ['how to break in', 'dangerous stunt', 'illegal but', 'risky activity'],
    regexPatterns: [
      /\bhow\s+to\s+(break\s+in|trespass|steal)\b/i,
      /\b(dangerous|risky)\s+(stunt|activity|challenge)\b/i,
    ],
  },
  weapons: {
    keywords: ['gun', 'weapon', 'explosive', 'bomb making', 'firearm'],
    phrases: ['buy a gun', 'make explosive', 'weapon purchase', 'ammunition'],
    regexPatterns: [
      /\b(buy|purchase|get)\s+(a\s+)?(gun|weapon|firearm)\b/i,
      /\bhow\s+to\s+make\s+(a\s+)?(bomb|explosive|weapon)\b/i,
    ],
  },
  substance_use: {
    keywords: ['drugs', 'alcohol', 'addiction', 'overdose', 'narcotics'],
    phrases: ['drug use', 'substance abuse', 'getting high', 'withdrawal symptoms'],
    regexPatterns: [
      /\b(drug|substance)\s+(use|abuse|addiction)\b/i,
      /\b(overdose|withdrawal)\s+(symptoms)?\b/i,
      /\bhow\s+to\s+get\s+(high|drugs)\b/i,
    ],
  },
  regulated_products: {
    keywords: ['prescription', 'controlled substance', 'regulated', 'restricted'],
    phrases: ['without prescription', 'controlled medication', 'buy prescription'],
    regexPatterns: [
      /\b(without|no)\s+prescription\b/i,
      /\b(buy|get)\s+(prescription|controlled)\s+(drugs?|medication)\b/i,
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFIER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: Required<ClassifierConfig> = {
  minConfidence: 0.3,
  useFuzzyMatching: true,
  additionalPatterns: {} as Record<SafetyDomain, string[]>,
};

/**
 * Normalize text for matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate confidence based on match quality
 */
function calculateConfidence(
  keywordMatches: number,
  phraseMatches: number,
  regexMatches: number,
  textLength: number
): number {
  // Weight different match types
  const keywordWeight = 0.3;
  const phraseWeight = 0.4;
  const regexWeight = 0.5;
  
  // Base confidence from matches
  let confidence = 0;
  confidence += Math.min(keywordMatches * keywordWeight, 0.6);
  confidence += Math.min(phraseMatches * phraseWeight, 0.7);
  confidence += Math.min(regexMatches * regexWeight, 0.9);
  
  // Adjust for text length (shorter texts with matches = higher confidence)
  const lengthFactor = Math.min(100 / textLength, 1.5);
  confidence *= lengthFactor;
  
  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * Detect safety domains in text
 */
function detectDomains(
  text: string,
  config: Required<ClassifierConfig>
): Array<{ domain: SafetyDomain; confidence: number; matchedPatterns: string[] }> {
  const normalizedText = normalizeText(text);
  const results: Array<{ domain: SafetyDomain; confidence: number; matchedPatterns: string[] }> = [];
  
  const domains = Object.keys(EXTENDED_PATTERNS) as SafetyDomain[];
  
  for (const domain of domains) {
    const patterns = EXTENDED_PATTERNS[domain];
    const additionalKeywords = config.additionalPatterns[domain] || [];
    const matchedPatterns: string[] = [];
    
    let keywordMatches = 0;
    let phraseMatches = 0;
    let regexMatches = 0;
    
    // Check keywords (with safe compound phrase exclusion)
    const allKeywords = [...patterns.keywords, ...additionalKeywords];
    for (const keyword of allKeywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        // Skip if this keyword is part of a safe compound phrase
        if (containsSafeCompoundPhrase(text, keyword)) {
          continue;
        }
        keywordMatches++;
        matchedPatterns.push(`keyword: ${keyword}`);
      }
    }
    
    // Check phrases
    for (const phrase of patterns.phrases) {
      if (normalizedText.includes(phrase.toLowerCase())) {
        phraseMatches++;
        matchedPatterns.push(`phrase: ${phrase}`);
      }
    }
    
    // Check regex patterns
    for (const regex of patterns.regexPatterns) {
      if (regex.test(text)) {
        regexMatches++;
        matchedPatterns.push(`pattern: ${regex.source}`);
      }
    }
    
    // Only include if any matches
    if (keywordMatches > 0 || phraseMatches > 0 || regexMatches > 0) {
      const confidence = calculateConfidence(
        keywordMatches,
        phraseMatches,
        regexMatches,
        normalizedText.length
      );
      
      if (confidence >= config.minConfidence) {
        results.push({ domain, confidence, matchedPatterns });
      }
    }
  }
  
  // Sort by confidence (highest first)
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get level priority for sorting (critical = highest)
 */
function getLevelPriority(level: SafetyLevel): number {
  const priorities: Record<SafetyLevel, number> = {
    critical: 4,
    high: 3,
    moderate: 2,
    low: 1,
    none: 0,
  };
  return priorities[level];
}

/**
 * Main classifier function
 * 
 * @param text - User input text to classify
 * @param config - Optional configuration overrides
 * @returns Safety classification result
 */
export function classifySafety(
  text: string,
  config: ClassifierConfig = {}
): SafetyClassification {
  const mergedConfig: Required<ClassifierConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  
  // Detect all domains
  const detectedDomains = detectDomains(text, mergedConfig);
  
  // No safety concerns detected
  if (detectedDomains.length === 0) {
    return {
      domain: 'none',
      level: 'none',
      advisoryBoundary: 'normal_information',
      confidence: 1.0,
      allDetectedDomains: [],
      requiresImmediateAction: false,
      nudgingBlocked: false,
    };
  }
  
  // Sort by level priority first, then confidence
  const sortedDomains = [...detectedDomains].sort((a, b) => {
    const levelA = getLevelPriority(SAFETY_DOMAINS[a.domain].level);
    const levelB = getLevelPriority(SAFETY_DOMAINS[b.domain].level);
    if (levelA !== levelB) return levelB - levelA;
    return b.confidence - a.confidence;
  });
  
  // Primary domain is the highest priority
  const primaryDomain = sortedDomains[0].domain;
  const primaryConfig = SAFETY_DOMAINS[primaryDomain];
  const level = primaryConfig.level;
  const advisoryBoundary = primaryConfig.advisoryBoundary;
  
  // Determine if immediate action required
  const requiresImmediateAction = 
    level === 'critical' || 
    advisoryBoundary === 'emergency_redirect' ||
    advisoryBoundary === 'refuse_and_redirect';
  
  // Determine if nudging is blocked
  const nudgingBlocked = level === 'critical' || level === 'high';
  
  // Generate escalation suggestion for high/critical
  let escalationSuggestion: string | undefined;
  if (level === 'critical') {
    if (primaryDomain === 'suicide_risk' || primaryDomain === 'self_harm') {
      escalationSuggestion = 'Provide immediate crisis resources (AASRA: 9820466726, iCall: 9152987821)';
    } else if (primaryDomain === 'health_emergency') {
      escalationSuggestion = 'Direct to emergency services (108/102) immediately';
    } else if (primaryDomain === 'violence') {
      escalationSuggestion = 'Do not provide assistance, redirect to authorities if threat is credible';
    } else if (primaryDomain === 'child_safety' || primaryDomain === 'sexual_minors') {
      escalationSuggestion = 'Refuse request, log for review, do not engage';
    }
  } else if (level === 'high') {
    escalationSuggestion = 'Suggest consulting appropriate professional';
  }
  
  return {
    domain: primaryDomain,
    level,
    advisoryBoundary,
    confidence: sortedDomains[0].confidence,
    allDetectedDomains: detectedDomains,
    requiresImmediateAction,
    nudgingBlocked,
    escalationSuggestion,
  };
}

/**
 * Quick check if text contains any critical safety concerns
 * Faster than full classification for pre-screening
 */
export function hasCriticalSafetyConcern(text: string): boolean {
  const criticalDomains: SafetyDomain[] = [
    'self_harm',
    'suicide_risk',
    'child_safety',
    'sexual_minors',
    'violence',
  ];
  
  const normalizedText = normalizeText(text);
  
  for (const domain of criticalDomains) {
    const patterns = EXTENDED_PATTERNS[domain];
    
    // Quick keyword check (with safe compound phrase exclusion)
    for (const keyword of patterns.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        // Skip if this keyword is part of a safe compound phrase
        if (containsSafeCompoundPhrase(text, keyword)) {
          continue;
        }
        return true;
      }
    }
    
    // Quick regex check
    for (const regex of patterns.regexPatterns) {
      if (regex.test(text)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get all patterns for a specific domain (for debugging/admin)
 */
export function getDomainPatterns(domain: SafetyDomain): {
  keywords: string[];
  phrases: string[];
  regexPatterns: string[];
} {
  const patterns = EXTENDED_PATTERNS[domain];
  return {
    keywords: patterns.keywords,
    phrases: patterns.phrases,
    regexPatterns: patterns.regexPatterns.map(r => r.source),
  };
}

/**
 * Export for testing
 */
export const _internal = {
  normalizeText,
  calculateConfidence,
  detectDomains,
  getLevelPriority,
  EXTENDED_PATTERNS,
};
