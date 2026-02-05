/**
 * User Profile Engine
 * 
 * Manages user profiling and tone adjustments based on:
 * - Age group (digital confident vs digital cautious)
 * - Region (15 Indian regions)
 * - Language (15 supported languages)
 * - Literacy level (low vs high)
 * 
 * @module services/guidelines/userProfile
 */

import type { 
  UserProfile, 
  AgeGroup, 
  IndianRegion, 
  SupportedLanguage, 
  LiteracyLevel 
} from '../../types';

// =============================================================================
// TONE ADJUSTMENTS
// =============================================================================

/**
 * Tone adjustments applied based on user profile
 */
export interface ToneAdjustments {
  useContractions: boolean;        // "you'll" vs "you will"
  sentenceLength: 'short' | 'medium';
  useEmoji: boolean;
  useStepByStep: boolean;          // Numbered instructions
  useLocalIdioms: boolean;         // Regional expressions
  honorifics: boolean;             // "ji" suffix
  technicalTerms: boolean;         // OTP, UPI, KYC allowed
  formalRegister: boolean;         // Formal vs casual
  useNumerals: boolean;            // "3" vs "three"
}

/**
 * Default tone adjustments
 */
export const DEFAULT_TONE_ADJUSTMENTS: ToneAdjustments = {
  useContractions: true,
  sentenceLength: 'medium',
  useEmoji: false,
  useStepByStep: false,
  useLocalIdioms: false,
  honorifics: false,
  technicalTerms: true,
  formalRegister: false,
  useNumerals: true,
};

// =============================================================================
// LANGUAGE CONFIGURATIONS
// =============================================================================

/**
 * Language configuration with script and regional notes
 */
export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  nativeName: string;
  script: string;
  hinglishSupport: boolean;
  formalRegisterForElders: boolean;
  notes: string;
}

/**
 * 15 Supported Indian languages
 */
export const LANGUAGES: readonly LanguageConfig[] = [
  {
    id: 'english',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    hinglishSupport: false,
    formalRegisterForElders: false,
    notes: 'Indian English preferred. British spellings.',
  },
  {
    id: 'hindi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    hinglishSupport: true,
    formalRegisterForElders: true,
    notes: 'Include romanized option for younger users.',
  },
  {
    id: 'hinglish',
    name: 'Hinglish',
    nativeName: 'हिंग्लिश',
    script: 'Latin',
    hinglishSupport: true,
    formalRegisterForElders: false,
    notes: 'Hindi-English mix. Informal, conversational.',
  },
  {
    id: 'tamil',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    hinglishSupport: false,
    formalRegisterForElders: true,
    notes: 'Formal register for elders. Rich literary tradition.',
  },
  {
    id: 'telugu',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    hinglishSupport: false,
    formalRegisterForElders: true,
    notes: 'Respectful honorifics important.',
  },
  {
    id: 'kannada',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    hinglishSupport: false,
    formalRegisterForElders: true,
    notes: 'Karnataka focus. Respectful tone.',
  },
  {
    id: 'malayalam',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    hinglishSupport: false,
    formalRegisterForElders: true,
    notes: 'Kerala focus. High literacy region.',
  },
  {
    id: 'marathi',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    hinglishSupport: true,
    formalRegisterForElders: true,
    notes: 'Maharashtra focus. Mix with English common.',
  },
  {
    id: 'gujarati',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    hinglishSupport: true,
    formalRegisterForElders: true,
    notes: 'Gujarat focus. Business community.',
  },
  {
    id: 'bengali',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    hinglishSupport: true,
    formalRegisterForElders: true,
    notes: 'West Bengal/Bangladesh. Literary tradition.',
  },
  {
    id: 'punjabi',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    hinglishSupport: true,
    formalRegisterForElders: true,
    notes: 'Punjab focus. Warm, expressive culture.',
  },
  {
    id: 'odia',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Odia',
    hinglishSupport: false,
    formalRegisterForElders: true,
    notes: 'Odisha focus. Respectful communication.',
  },
  {
    id: 'assamese',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Assamese',
    hinglishSupport: false,
    formalRegisterForElders: true,
    notes: 'Northeast focus. Cultural sensitivity important.',
  },
  {
    id: 'urdu',
    name: 'Urdu',
    nativeName: 'اردو',
    script: 'Nastaliq',
    hinglishSupport: false,
    formalRegisterForElders: true,
    notes: 'Formal, poetic option. Respectful tone.',
  },
  {
    id: 'konkani',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    script: 'Devanagari',
    hinglishSupport: false,
    formalRegisterForElders: true,
    notes: 'Goa/coastal focus. Catholic community.',
  },
] as const;

// =============================================================================
// REGION CONFIGURATIONS
// =============================================================================

/**
 * Region configuration with communication preferences
 */
export interface RegionConfig {
  id: IndianRegion;
  name: string;
  languages: SupportedLanguage[];
  localIdioms: boolean;
  hinglishAcceptance: 'low' | 'medium' | 'high';
  notes: string;
}

/**
 * 12 Indian regions
 */
export const REGIONS: readonly RegionConfig[] = [
  {
    id: 'pan_india',
    name: 'Pan-India',
    languages: ['english', 'hindi', 'hinglish'],
    localIdioms: false,
    hinglishAcceptance: 'high',
    notes: 'Neutral phrasing. No regional references.',
  },
  {
    id: 'north',
    name: 'North India',
    languages: ['hindi', 'hinglish', 'punjabi', 'english'],
    localIdioms: true,
    hinglishAcceptance: 'high',
    notes: 'UP, Uttarakhand, HP, J&K. Hindi dominant.',
  },
  {
    id: 'south',
    name: 'South India',
    languages: ['tamil', 'telugu', 'kannada', 'malayalam', 'english'],
    localIdioms: true,
    hinglishAcceptance: 'low',
    notes: 'TN, KA, KL, AP, TS. English often preferred over Hindi.',
  },
  {
    id: 'east',
    name: 'East India',
    languages: ['bengali', 'odia', 'hindi', 'english'],
    localIdioms: true,
    hinglishAcceptance: 'medium',
    notes: 'WB, Bihar, Jharkhand, Odisha. Bengali cultural pride.',
  },
  {
    id: 'west',
    name: 'West India',
    languages: ['marathi', 'gujarati', 'hindi', 'english'],
    localIdioms: true,
    hinglishAcceptance: 'high',
    notes: 'MH, Gujarat, Goa, Rajasthan. Business-oriented.',
  },
  {
    id: 'northeast',
    name: 'Northeast India',
    languages: ['assamese', 'english', 'hindi'],
    localIdioms: false,
    hinglishAcceptance: 'medium',
    notes: 'Assam, Meghalaya, etc. Cultural sensitivity critical.',
  },
  {
    id: 'delhi',
    name: 'Delhi NCR',
    languages: ['hindi', 'hinglish', 'english', 'punjabi'],
    localIdioms: true,
    hinglishAcceptance: 'high',
    notes: 'Capital region. Fast-paced, direct communication.',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    languages: ['hindi', 'marathi', 'english', 'hinglish'],
    localIdioms: true,
    hinglishAcceptance: 'high',
    notes: 'Financial capital. Cosmopolitan, time-sensitive.',
  },
  {
    id: 'bangalore',
    name: 'Bangalore',
    languages: ['kannada', 'english', 'hindi', 'tamil'],
    localIdioms: false,
    hinglishAcceptance: 'medium',
    notes: 'Tech hub. English common. Diverse population.',
  },
  {
    id: 'chennai',
    name: 'Chennai',
    languages: ['tamil', 'english'],
    localIdioms: true,
    hinglishAcceptance: 'low',
    notes: 'Tamil pride. English preferred over Hindi.',
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    languages: ['bengali', 'hindi', 'english'],
    localIdioms: true,
    hinglishAcceptance: 'medium',
    notes: 'Cultural capital. Literary sensibility.',
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    languages: ['telugu', 'urdu', 'hindi', 'english'],
    localIdioms: true,
    hinglishAcceptance: 'medium',
    notes: 'Tech + traditional. Deccan culture.',
  },
] as const;

// =============================================================================
// PROFILE-BASED TONE CALCULATION
// =============================================================================

/**
 * Get tone adjustments based on user profile
 */
export function getToneAdjustments(profile: UserProfile): ToneAdjustments {
  const language = getLanguage(profile.language);
  const region = getRegion(profile.region);
  
  // Start with defaults
  const adjustments: ToneAdjustments = { ...DEFAULT_TONE_ADJUSTMENTS };
  
  // Age group adjustments
  if (profile.ageGroup === 'digital_cautious') {
    adjustments.useContractions = false;
    adjustments.sentenceLength = 'short';
    adjustments.useStepByStep = true;
    adjustments.honorifics = true;
    adjustments.technicalTerms = false;
    adjustments.formalRegister = true;
  }
  
  // Literacy level adjustments
  if (profile.literacyLevel === 'low') {
    adjustments.sentenceLength = 'short';
    adjustments.useEmoji = true;
    adjustments.useStepByStep = true;
    adjustments.technicalTerms = false;
    adjustments.useNumerals = true;
  }
  
  // Language-specific adjustments
  if (language.formalRegisterForElders && profile.ageGroup === 'digital_cautious') {
    adjustments.formalRegister = true;
    adjustments.honorifics = true;
  }
  
  // Region-specific adjustments
  if (region.localIdioms && profile.language !== 'english') {
    adjustments.useLocalIdioms = true;
  }
  
  return adjustments;
}

/**
 * Get prompt instructions based on tone adjustments
 */
export function getToneInstructions(adjustments: ToneAdjustments): string {
  const instructions: string[] = [];
  
  if (adjustments.useContractions) {
    instructions.push("Use contractions (you'll, we're, it's)");
  } else {
    instructions.push("Avoid contractions (use 'you will' not 'you'll')");
  }
  
  if (adjustments.sentenceLength === 'short') {
    instructions.push('Keep sentences short (max 12 words)');
    instructions.push('One idea per sentence');
  }
  
  if (adjustments.useEmoji) {
    instructions.push('Use emoji to support key points (✅, 📱, 💰)');
  } else {
    instructions.push('Do not use emoji');
  }
  
  if (adjustments.useStepByStep) {
    instructions.push('Use numbered step-by-step format');
    instructions.push('Repeat key information');
  }
  
  if (adjustments.useLocalIdioms) {
    instructions.push('Use local expressions and idioms naturally');
  } else {
    instructions.push('Use neutral pan-India phrasing');
  }
  
  if (adjustments.honorifics) {
    instructions.push("Use respectful honorifics ('ji' suffix for names)");
    instructions.push('Address user with respect');
  }
  
  if (!adjustments.technicalTerms) {
    instructions.push('Expand technical acronyms (OTP → One-Time Password)');
    instructions.push('Avoid jargon, explain in simple terms');
  }
  
  if (adjustments.formalRegister) {
    instructions.push('Use formal, respectful register');
  } else {
    instructions.push('Use friendly, conversational register');
  }
  
  return instructions.join('\n- ');
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get language configuration by ID
 */
export function getLanguage(id: SupportedLanguage): LanguageConfig {
  const language = LANGUAGES.find(l => l.id === id);
  if (!language) {
    throw new Error(`Unknown language: ${id}`);
  }
  return language;
}

/**
 * Get region configuration by ID
 */
export function getRegion(id: IndianRegion): RegionConfig {
  const region = REGIONS.find(r => r.id === id);
  if (!region) {
    throw new Error(`Unknown region: ${id}`);
  }
  return region;
}

/**
 * Get languages for dropdown
 */
export function getLanguageOptions(): Array<{ value: SupportedLanguage; label: string; native: string }> {
  return LANGUAGES.map(l => ({
    value: l.id,
    label: l.name,
    native: l.nativeName,
  }));
}

/**
 * Get regions for dropdown
 */
export function getRegionOptions(): Array<{ value: IndianRegion; label: string }> {
  return REGIONS.map(r => ({
    value: r.id,
    label: r.name,
  }));
}

/**
 * Get age group options for dropdown
 */
export function getAgeGroupOptions(): Array<{ value: AgeGroup; label: string; description: string }> {
  return [
    {
      value: 'digital_confident',
      label: 'Digital Confident',
      description: 'Comfortable with technology, prefers quick interactions',
    },
    {
      value: 'digital_cautious',
      label: 'Digital Cautious',
      description: 'Prefers step-by-step guidance, respectful tone',
    },
  ];
}

/**
 * Get literacy level options for dropdown
 */
export function getLiteracyOptions(): Array<{ value: LiteracyLevel; label: string; description: string }> {
  return [
    {
      value: 'high',
      label: 'High',
      description: 'Can understand technical terms and complex sentences',
    },
    {
      value: 'low',
      label: 'Low',
      description: 'Needs simple language, icons, and step-by-step guidance',
    },
  ];
}

/**
 * Create default user profile
 */
export function createDefaultProfile(): UserProfile {
  return {
    ageGroup: 'digital_confident',
    region: 'pan_india',
    language: 'english',
    literacyLevel: 'high',
  };
}

export default {
  LANGUAGES,
  REGIONS,
  getToneAdjustments,
  getToneInstructions,
  getLanguage,
  getRegion,
  getLanguageOptions,
  getRegionOptions,
  getAgeGroupOptions,
  getLiteracyOptions,
  createDefaultProfile,
};
