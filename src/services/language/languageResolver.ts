/**
 * Language Resolver
 * 
 * Resolves language tokens: lang, script, lang_mix, literacy.
 * Handles code-mixing and multilingual inputs common in India.
 * 
 * @module services/language/languageResolver
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported languages
 */
export type SupportedLanguage =
  | 'english'
  | 'hindi'
  | 'hinglish'  // Hindi-English mix
  | 'bengali'
  | 'telugu'
  | 'marathi'
  | 'tamil'
  | 'gujarati'
  | 'kannada'
  | 'odia'
  | 'malayalam'
  | 'punjabi'
  | 'unknown';

/**
 * Script types
 */
export type ScriptType =
  | 'latin'       // English, romanized
  | 'devanagari'  // Hindi, Marathi, Sanskrit
  | 'bengali'     // Bengali, Assamese
  | 'telugu'
  | 'tamil'
  | 'gujarati'
  | 'kannada'
  | 'odia'
  | 'malayalam'
  | 'gurmukhi'    // Punjabi
  | 'mixed'
  | 'unknown';

/**
 * Language mixing patterns
 */
export type LanguageMix =
  | 'pure'        // Single language
  | 'code_switch' // Switch between sentences
  | 'code_mix'    // Mix within sentence
  | 'transliteration'; // Native words in Latin script

/**
 * Literacy/formality level
 */
export type LiteracyLevel =
  | 'formal'      // Professional, proper grammar
  | 'standard'    // Normal conversational
  | 'casual'      // Informal, abbreviations
  | 'basic';      // Simple vocabulary needed

/**
 * Resolved language context
 */
export interface ResolvedLanguage {
  /** Primary detected language */
  language: SupportedLanguage;
  /** Script used */
  script: ScriptType;
  /** Mixing pattern */
  languageMix: LanguageMix;
  /** Literacy/formality level */
  literacy: LiteracyLevel;
  /** Secondary language if mixed */
  secondaryLanguage: SupportedLanguage | null;
  /** Confidence score */
  confidence: number;
  /** Response language recommendation */
  responseLanguage: SupportedLanguage;
  /** Response script recommendation */
  responseScript: ScriptType;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Script detection patterns (Unicode ranges)
 */
const SCRIPT_PATTERNS: Record<ScriptType, RegExp> = {
  devanagari: /[\u0900-\u097F]/,
  bengali: /[\u0980-\u09FF]/,
  telugu: /[\u0C00-\u0C7F]/,
  tamil: /[\u0B80-\u0BFF]/,
  gujarati: /[\u0A80-\u0AFF]/,
  kannada: /[\u0C80-\u0CFF]/,
  odia: /[\u0B00-\u0B7F]/,
  malayalam: /[\u0D00-\u0D7F]/,
  gurmukhi: /[\u0A00-\u0A7F]/,
  latin: /[a-zA-Z]/,
  mixed: /.*/,
  unknown: /.*/,
};

/**
 * Hindi words commonly used in Hinglish (romanized)
 */
const HINDI_WORDS = [
  'kya', 'hai', 'hain', 'ho', 'kaise', 'kab', 'kaha', 'kyu', 'kyun',
  'mera', 'meri', 'mere', 'aapka', 'tumhara', 'hamara',
  'nahi', 'nahin', 'nhi', 'haan', 'ji', 'acha', 'achha', 'theek', 'thik',
  'karo', 'karna', 'dena', 'lena', 'batao', 'bolo', 'dekho', 'suno',
  'abhi', 'baad', 'pehle', 'kal', 'aaj', 'parso',
  'bohot', 'bahut', 'zyada', 'kam', 'thoda', 'sab', 'kuch',
  'paisa', 'rupee', 'rupay', 'paise',
  'bhai', 'behen', 'didi', 'anna', 'akka',
  'matlab', 'isliye', 'lekin', 'aur', 'ya', 'phir',
  'sim', 'recharge', 'balance', 'plan', 'data', 'network',
];

/**
 * Common Hindi phrases (romanized)
 */
const HINDI_PHRASES = [
  /\bkya\s+(hua|hoga|kar|kare)\b/i,
  /\b(mujhe|mujhko|humko)\s+\w+\s+(chahiye|do|dena)\b/i,
  /\b(kaise|kab|kaha)\s+(karu|kare|hoga|milega)\b/i,
  /\b(nahi|nahin)\s+(ho|hua|hota|milta|aata)\b/i,
  /\bkitna\s+(hai|hoga|lagega|milega)\b/i,
  /\b(ye|yeh|woh|wo)\s+(kya|kaisa|kaise)\b/i,
];

/**
 * Formal language indicators
 */
const FORMAL_INDICATORS = [
  /\b(kindly|please|request|regarding|concerned|hereby|therefore|hence)\b/i,
  /\b(sir|ma'am|madam|dear)\b/i,
  /\b(i\s+would|could\s+you|would\s+you)\b/i,
];

/**
 * Casual language indicators
 */
const CASUAL_INDICATORS = [
  /\b(pls|plz|u|ur|r|b4|2day|tmrw|thx|thnx|ty|btw|asap)\b/i,
  /!{2,}/,
  /\.\.\./,
  /😊|😔|😠|👍|🙏/,
];

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect script used in text
 */
export function detectScript(text: string): { primary: ScriptType; secondary: ScriptType | null } {
  const scripts: { script: ScriptType; count: number }[] = [];
  
  for (const [script, pattern] of Object.entries(SCRIPT_PATTERNS)) {
    if (script === 'mixed' || script === 'unknown') continue;
    const matches = text.match(new RegExp(pattern.source, 'g'));
    if (matches && matches.length > 0) {
      scripts.push({ script: script as ScriptType, count: matches.length });
    }
  }
  
  scripts.sort((a, b) => b.count - a.count);
  
  if (scripts.length === 0) {
    return { primary: 'unknown', secondary: null };
  }
  
  if (scripts.length === 1) {
    return { primary: scripts[0].script, secondary: null };
  }
  
  // If multiple scripts and similar counts, it's mixed
  if (scripts[1].count > scripts[0].count * 0.3) {
    return { primary: 'mixed', secondary: scripts[1].script };
  }
  
  return { primary: scripts[0].script, secondary: scripts.length > 1 ? scripts[1].script : null };
}

/**
 * Detect Hindi/Hinglish in romanized text
 */
export function detectHinglish(text: string): { isHinglish: boolean; hindiWordCount: number; ratio: number } {
  const words = text.toLowerCase().split(/\s+/);
  const hindiWordCount = words.filter(w => 
    HINDI_WORDS.includes(w.replace(/[^a-z]/g, ''))
  ).length;
  
  // Also check phrases
  const phraseMatches = HINDI_PHRASES.filter(p => p.test(text)).length;
  
  const totalScore = hindiWordCount + (phraseMatches * 2);
  const ratio = words.length > 0 ? totalScore / words.length : 0;
  
  return {
    isHinglish: ratio > 0.15 || phraseMatches > 0,
    hindiWordCount,
    ratio,
  };
}

/**
 * Detect language mix pattern
 */
export function detectLanguageMix(text: string): LanguageMix {
  const { primary, secondary } = detectScript(text);
  
  // Pure script (but might still be transliterated)
  if (!secondary && primary === 'latin') {
    const hinglish = detectHinglish(text);
    if (hinglish.isHinglish) {
      return hinglish.ratio > 0.5 ? 'code_mix' : 'code_switch';
    }
    return 'pure';
  }
  
  // Non-Latin pure script
  if (!secondary && primary !== 'latin' && primary !== 'unknown') {
    return 'pure';
  }
  
  // Mixed scripts
  if (primary === 'mixed' || secondary) {
    return 'code_mix';
  }
  
  return 'pure';
}

/**
 * Detect literacy/formality level
 */
export function detectLiteracy(text: string): LiteracyLevel {
  // Check formal indicators
  if (FORMAL_INDICATORS.some(p => p.test(text))) {
    return 'formal';
  }
  
  // Check casual indicators
  const casualMatches = CASUAL_INDICATORS.filter(p => p.test(text)).length;
  if (casualMatches >= 2) {
    return 'casual';
  }
  if (casualMatches >= 1) {
    return 'standard';
  }
  
  // Check message length and complexity
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);
  
  if (avgWordLength < 3.5 && words.length < 10) {
    return 'basic';
  }
  
  if (avgWordLength > 5 && words.length > 15) {
    return 'formal';
  }
  
  return 'standard';
}

/**
 * Map script to language
 */
function scriptToLanguage(script: ScriptType): SupportedLanguage {
  const mapping: Record<ScriptType, SupportedLanguage> = {
    devanagari: 'hindi',
    bengali: 'bengali',
    telugu: 'telugu',
    tamil: 'tamil',
    gujarati: 'gujarati',
    kannada: 'kannada',
    odia: 'odia',
    malayalam: 'malayalam',
    gurmukhi: 'punjabi',
    latin: 'english',
    mixed: 'hinglish',
    unknown: 'unknown',
  };
  return mapping[script];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve complete language context
 */
export function resolveLanguage(text: string): ResolvedLanguage {
  // Detect script
  const { primary: script, secondary: secondaryScript } = detectScript(text);
  
  // Detect language mix
  const languageMix = detectLanguageMix(text);
  
  // Detect literacy level
  const literacy = detectLiteracy(text);
  
  // Determine primary language
  let language: SupportedLanguage;
  let secondaryLanguage: SupportedLanguage | null = null;
  let confidence = 0.7;
  
  if (script === 'latin') {
    const hinglish = detectHinglish(text);
    if (hinglish.isHinglish) {
      language = 'hinglish';
      secondaryLanguage = hinglish.ratio > 0.5 ? 'english' : 'hindi';
      confidence = 0.6 + (hinglish.ratio * 0.3);
    } else {
      language = 'english';
      confidence = 0.85;
    }
  } else if (script === 'mixed') {
    language = 'hinglish';
    secondaryLanguage = secondaryScript ? scriptToLanguage(secondaryScript) : null;
    confidence = 0.65;
  } else {
    language = scriptToLanguage(script);
    if (secondaryScript === 'latin') {
      secondaryLanguage = 'english';
    }
    confidence = 0.8;
  }
  
  // Determine response language and script
  let responseLanguage: SupportedLanguage = language;
  let responseScript: ScriptType = script;
  
  // If Hinglish, respond in Hinglish
  if (language === 'hinglish') {
    responseLanguage = 'hinglish';
    responseScript = 'latin';
  }
  
  // If native script, can respond in native or romanized based on literacy
  if (script !== 'latin' && script !== 'unknown' && script !== 'mixed') {
    if (literacy === 'casual' || literacy === 'basic') {
      responseScript = 'latin'; // Romanized
    } else {
      responseScript = script;
    }
  }
  
  return {
    language,
    script,
    languageMix,
    literacy,
    secondaryLanguage,
    confidence,
    responseLanguage,
    responseScript,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format language context for prompt injection
 */
export function formatLanguageForPrompt(lang: ResolvedLanguage): string {
  const lines = [
    '## language context',
    `detected: ${lang.language}`,
    `script: ${lang.script}`,
    `mix_pattern: ${lang.languageMix}`,
    `literacy: ${lang.literacy}`,
    `confidence: ${(lang.confidence * 100).toFixed(0)}%`,
    '',
    '### response guidelines',
    `respond in: ${lang.responseLanguage}`,
    `use script: ${lang.responseScript}`,
  ];
  
  if (lang.languageMix === 'code_mix' || lang.languageMix === 'code_switch') {
    lines.push('');
    lines.push('**note**: user is code-mixing - can naturally mix languages in response');
  }
  
  if (lang.literacy === 'basic') {
    lines.push('');
    lines.push('**note**: use simple vocabulary and short sentences');
  } else if (lang.literacy === 'formal') {
    lines.push('');
    lines.push('**note**: maintain professional tone');
  }
  
  return lines.join('\n');
}

/**
 * Get language-appropriate greeting
 */
export function getLanguageGreeting(lang: ResolvedLanguage): string {
  const greetings: Record<SupportedLanguage, string> = {
    english: 'hello',
    hindi: 'namaste',
    hinglish: 'hello',
    bengali: 'namaskar',
    telugu: 'namaskaram',
    marathi: 'namaskar',
    tamil: 'vanakkam',
    gujarati: 'namaste',
    kannada: 'namaskara',
    odia: 'namaskar',
    malayalam: 'namaskaram',
    punjabi: 'sat sri akal',
    unknown: 'hello',
  };
  return greetings[lang.language];
}

/**
 * Check if language is supported for full responses
 */
export function isFullySupported(language: SupportedLanguage): boolean {
  const fullSupport: SupportedLanguage[] = ['english', 'hindi', 'hinglish'];
  return fullSupport.includes(language);
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    english: 'english',
    hindi: 'hindi',
    hinglish: 'hinglish (hindi-english)',
    bengali: 'bengali',
    telugu: 'telugu',
    marathi: 'marathi',
    tamil: 'tamil',
    gujarati: 'gujarati',
    kannada: 'kannada',
    odia: 'odia',
    malayalam: 'malayalam',
    punjabi: 'punjabi',
    unknown: 'unknown',
  };
  return names[language];
}
