/**
 * Jio Vocabulary Library
 * 
 * Preferred words and phrases aligned with Jio brand voice.
 * Source: Training 1.pdf, lines 1359-1488 (Wording Library)
 * 
 * @module services/guidelines/vocabulary
 */

// =============================================================================
// VOCABULARY CATEGORIES (Training 1.pdf)
// =============================================================================

/**
 * Category 1: Care & Connection Words
 * Use these to express warmth, empathy, and human connection
 */
export const CARE_CONNECTION_WORDS = [
  // Warmth
  'welcome', 'glad', 'happy', 'pleased', 'wonderful', 'lovely', 'great',
  'beautiful', 'delightful', 'joy', 'warm', 'heartfelt', 'genuine',
  
  // Empathy
  'understand', 'hear', 'feel', 'care', 'matter', 'important',
  'appreciate', 'value', 'respect', 'acknowledge', 'recognize',
  
  // Connection
  'together', 'with you', 'by your side', 'here for you', 'alongside',
  'partner', 'support', 'help', 'assist', 'guide', 'walk you through',
  
  // Gratitude
  'thank you', 'grateful', 'thankful', 'appreciate', 'means a lot',
  'valued', 'cherished', 'treasured',
  
  // Reassurance
  'safe', 'secure', 'protected', 'assured', 'confident', 'reliable',
  'trusted', 'dependable', 'steady', 'stable',
  
  // Indian warmth
  'namaste', 'dhanyavaad', 'shukriya', 'swagat', 'aapka',
] as const;

/**
 * Category 2: Action & Progress Words
 * Use these to inspire action and show momentum
 */
export const ACTION_PROGRESS_WORDS = [
  // Starting
  'start', 'begin', 'launch', 'kick off', 'get going', 'take off',
  'embark', 'set out', 'dive in', 'jump in',
  
  // Movement
  'move', 'progress', 'advance', 'grow', 'build', 'expand',
  'develop', 'evolve', 'improve', 'enhance',
  
  // Achievement
  'achieve', 'accomplish', 'complete', 'finish', 'done', 'success',
  'win', 'earn', 'gain', 'reach', 'attain',
  
  // Speed (without pressure)
  'quick', 'fast', 'instant', 'ready', 'now', 'today',
  'simple', 'easy', 'smooth', 'seamless',
  
  // Enabling
  'enable', 'empower', 'unlock', 'access', 'open', 'discover',
  'explore', 'try', 'experience', 'enjoy',
  
  // Confirmation
  'confirm', 'verify', 'check', 'review', 'approve', 'accept',
  'agree', 'proceed', 'continue', 'next',
] as const;

/**
 * Category 3: Clarity & Safety Words
 * Use these for clear communication and trust
 */
export const CLARITY_SAFETY_WORDS = [
  // Clarity
  'clear', 'simple', 'easy', 'straightforward', 'plain', 'direct',
  'obvious', 'transparent', 'open', 'honest',
  
  // Understanding
  'understand', 'know', 'learn', 'see', 'find', 'get',
  'show', 'explain', 'tell', 'share',
  
  // Safety
  'safe', 'secure', 'protected', 'private', 'encrypted', 'verified',
  'authentic', 'genuine', 'real', 'official',
  
  // Trust
  'trust', 'rely', 'depend', 'count on', 'believe', 'confident',
  'sure', 'certain', 'guaranteed', 'promised',
  
  // Accuracy
  'correct', 'right', 'accurate', 'exact', 'precise', 'specific',
  'detailed', 'complete', 'full', 'comprehensive',
] as const;

/**
 * Category 4: Learning & Discovery Words
 * Use these for education and exploration contexts
 */
export const LEARNING_DISCOVERY_WORDS = [
  // Learning
  'learn', 'study', 'understand', 'master', 'practice', 'train',
  'develop', 'grow', 'improve', 'progress',
  
  // Discovery
  'discover', 'explore', 'find', 'uncover', 'reveal', 'see',
  'notice', 'observe', 'experience', 'witness',
  
  // Knowledge
  'know', 'wisdom', 'insight', 'understanding', 'awareness', 'skill',
  'expertise', 'ability', 'capability', 'competence',
  
  // Curiosity
  'curious', 'wonder', 'question', 'ask', 'seek', 'search',
  'look for', 'investigate', 'examine', 'review',
  
  // Growth
  'grow', 'expand', 'broaden', 'deepen', 'strengthen', 'enhance',
  'enrich', 'elevate', 'advance', 'evolve',
] as const;

/**
 * Category 5: Fixing & Resolution Words
 * Use these for support and problem-solving
 */
export const FIXING_RESOLUTION_WORDS = [
  // Problem acknowledgment (gentle)
  'notice', 'see', 'understand', 'hear', 'aware', 'recognize',
  'acknowledge', 'appreciate', 'get it', 'know',
  
  // Solution
  'fix', 'solve', 'resolve', 'address', 'handle', 'manage',
  'sort out', 'take care of', 'work on', 'look into',
  
  // Help
  'help', 'assist', 'support', 'guide', 'show', 'explain',
  'walk through', 'step by step', 'together', 'with you',
  
  // Restoration
  'restore', 'recover', 'return', 'bring back', 'reset', 'refresh',
  'renew', 'restart', 'reboot', 'reconnect',
  
  // Completion
  'done', 'complete', 'finished', 'sorted', 'resolved', 'fixed',
  'working', 'ready', 'good to go', 'all set',
] as const;

/**
 * Category 6: Community-First Words
 * Use these to emphasize collective benefit and inclusion
 */
export const COMMUNITY_FIRST_WORDS = [
  // Togetherness
  'together', 'we', 'us', 'our', 'all', 'everyone',
  'community', 'family', 'friends', 'neighbours',
  
  // Inclusion
  'include', 'belong', 'welcome', 'open', 'accessible', 'available',
  'for all', 'for everyone', 'no matter', 'regardless',
  
  // Sharing
  'share', 'give', 'contribute', 'participate', 'join', 'connect',
  'bring together', 'unite', 'gather', 'meet',
  
  // Collective benefit
  'benefit', 'help', 'serve', 'support', 'empower', 'enable',
  'lift', 'raise', 'grow together', 'succeed together',
  
  // Indian community values
  'seva', 'saath', 'apna', 'desh', 'parivaar', 'samaj',
  'sangathan', 'ekta', 'milan', 'sahyog',
] as const;

// =============================================================================
// INCLUSIVE LANGUAGE ALTERNATIVES (Training 1.pdf lines 1743-1785)
// =============================================================================

/**
 * Gender-neutral alternatives
 */
export const GENDER_NEUTRAL_ALTERNATIVES: Record<string, string> = {
  'Dear Sir': 'Hello',
  'Dear Madam': 'Hello',
  'Dear Sir/Madam': 'Hello',
  'he': 'they',
  'she': 'they',
  'his': 'their',
  'her': 'their',
  'himself': 'themselves',
  'herself': 'themselves',
  'chairman': 'chairperson',
  'chairwoman': 'chairperson',
  'businessman': 'businessperson',
  'businesswoman': 'businessperson',
  'fireman': 'firefighter',
  'policeman': 'police officer',
  'mailman': 'mail carrier',
  'stewardess': 'flight attendant',
  'mankind': 'humankind',
  'manpower': 'workforce',
  'man-made': 'artificial',
  'housewife': 'homemaker',
  'working mother': 'working parent',
};

/**
 * Simpler alternatives to complex words
 */
export const SIMPLE_ALTERNATIVES: Record<string, string> = {
  'utilize': 'use',
  'facilitate': 'help',
  'leverage': 'use',
  'synergy': 'working together',
  'paradigm': 'approach',
  'bandwidth': 'time',
  'circle back': 'follow up',
  'deep dive': 'look closely',
  'ping': 'message',
  'loop in': 'include',
  'dashboard': 'account',
  'onboard': 'get started',
  'optimize': 'improve',
  'streamline': 'simplify',
  'robust': 'strong',
  'scalable': 'can grow',
  'seamless': 'smooth',
  'frictionless': 'easy',
  'cutting-edge': 'latest',
  'state-of-the-art': 'modern',
  'world-class': 'excellent',
  'best-in-class': 'high quality',
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * All preferred vocabulary combined
 */
export const ALL_PREFERRED_WORDS = [
  ...CARE_CONNECTION_WORDS,
  ...ACTION_PROGRESS_WORDS,
  ...CLARITY_SAFETY_WORDS,
  ...LEARNING_DISCOVERY_WORDS,
  ...FIXING_RESOLUTION_WORDS,
  ...COMMUNITY_FIRST_WORDS,
] as const;

/**
 * Get vocabulary by category
 */
export function getVocabularyByCategory(category: string): readonly string[] {
  const categories: Record<string, readonly string[]> = {
    'care_connection': CARE_CONNECTION_WORDS,
    'action_progress': ACTION_PROGRESS_WORDS,
    'clarity_safety': CLARITY_SAFETY_WORDS,
    'learning_discovery': LEARNING_DISCOVERY_WORDS,
    'fixing_resolution': FIXING_RESOLUTION_WORDS,
    'community_first': COMMUNITY_FIRST_WORDS,
  };
  
  return categories[category] || [];
}

/**
 * Check if a word is in preferred vocabulary
 */
export function isPreferredWord(word: string): boolean {
  const lowerWord = word.toLowerCase();
  return ALL_PREFERRED_WORDS.some(w => w.toLowerCase() === lowerWord);
}

/**
 * Get simpler alternative for a word if available
 */
export function getSimplerAlternative(word: string): string | null {
  const lowerWord = word.toLowerCase();
  for (const [complex, simple] of Object.entries(SIMPLE_ALTERNATIVES)) {
    if (complex.toLowerCase() === lowerWord) {
      return simple;
    }
  }
  return null;
}

/**
 * Get gender-neutral alternative if available
 */
export function getGenderNeutralAlternative(phrase: string): string | null {
  for (const [gendered, neutral] of Object.entries(GENDER_NEUTRAL_ALTERNATIVES)) {
    if (phrase.toLowerCase().includes(gendered.toLowerCase())) {
      return neutral;
    }
  }
  return null;
}

export default {
  CARE_CONNECTION_WORDS,
  ACTION_PROGRESS_WORDS,
  CLARITY_SAFETY_WORDS,
  LEARNING_DISCOVERY_WORDS,
  FIXING_RESOLUTION_WORDS,
  COMMUNITY_FIRST_WORDS,
  ALL_PREFERRED_WORDS,
  GENDER_NEUTRAL_ALTERNATIVES,
  SIMPLE_ALTERNATIVES,
  getVocabularyByCategory,
  isPreferredWord,
  getSimplerAlternative,
  getGenderNeutralAlternative,
};
