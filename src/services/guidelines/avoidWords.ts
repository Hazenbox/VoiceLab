/**
 * Words to Avoid Library
 * 
 * Words and phrases that should be avoided in Jio content.
 * Source: Training 1.pdf, lines 1428-1488 (Words to Avoid)
 * 
 * @module services/guidelines/avoidWords
 */

// =============================================================================
// WORDS TO AVOID CATEGORIES (Training 1.pdf)
// =============================================================================

/**
 * Category 1: Complex Words
 * These make content harder to understand
 */
export const COMPLEX_WORDS = [
  // Jargon
  'utilize', 'leverage', 'synergy', 'paradigm', 'bandwidth',
  'avail', 'availing', 'availed',  // Common in Indian telecom copy
  'deep dive', 'circle back', 'touch base', 'take offline',
  'move the needle', 'low-hanging fruit', 'boil the ocean',
  
  // Unnecessary complexity
  'aforementioned', 'henceforth', 'hereby', 'therein', 'whereby',
  'pursuant to', 'in accordance with', 'notwithstanding',
  'in lieu of', 'with respect to', 'pertaining to',
  
  // Redundant phrases
  'in order to', 'for the purpose of', 'at this point in time',
  'due to the fact that', 'in the event that', 'with regard to',
  'as a matter of fact', 'it should be noted that',
  
  // Overly formal
  'kindly', 'hereby', 'furthermore', 'moreover', 'nevertheless',
  'hitherto', 'whereas', 'inasmuch', 'insofar', 'heretofore',
] as const;

/**
 * Category 2: Robotic Words
 * These sound impersonal and cold
 */
export const ROBOTIC_WORDS = [
  // Automated-sounding
  'auto-generated', 'system generated', 'do not reply',
  'this is an automated', 'no-reply', 'unsubscribe',
  
  // Impersonal phrases
  'as per our records', 'for your reference', 'please note',
  'be advised', 'be informed', 'please be notified',
  'it has come to our attention', 'we wish to inform',
  
  // Transaction-speak
  'your request has been', 'your query has been',
  'reference number', 'ticket number', 'case number',
  'please wait', 'please hold', 'your call is important',
  
  // Generic closings
  'regards', 'best regards', 'yours faithfully', 'yours sincerely',
  'thanking you', 'hoping for your cooperation',
] as const;

/**
 * Category 3: Fear-Based Words
 * These create anxiety or pressure
 */
export const FEAR_BASED_WORDS = [
  // Urgency pressure
  'urgent', 'hurry', 'rush', 'immediate', 'now or never',
  'last chance', 'final warning', 'act now', 'limited time',
  'running out', 'expires soon', 'only X left',
  
  // FOMO triggers
  "don't miss", "don't miss out", 'FOMO', 'everyone is',
  'others are already', "you'll regret", 'never again',
  
  // Threat-adjacent
  'consequences', 'penalty', 'forfeit', 'lose', 'lose out',
  'terminated', 'suspended', 'blocked', 'denied', 'rejected',
  
  // Negative framing
  'problem', 'issue', 'error', 'failure', 'mistake',
  'wrong', 'bad', 'poor', 'terrible', 'awful',
] as const;

/**
 * Category 4: Bureaucratic Words
 * These sound official and unapproachable
 */
export const BUREAUCRATIC_WORDS = [
  // Legal-sounding
  'terms and conditions apply', 'subject to', 'binding',
  'liability', 'indemnify', 'warrant', 'covenant',
  'force majeure', 'in perpetuity', 'non-transferable',
  
  // Process-heavy
  'procedure', 'protocol', 'compliance', 'mandate',
  'regulation', 'stipulation', 'provision', 'clause',
  
  // Official-speak
  'hereby', 'herewith', 'thereto', 'therewith', 'thereof',
  'aforementioned', 'abovementioned', 'undersigned',
  
  // Distance-creating
  'the management', 'the company', 'the organization',
  'corporate policy', 'internal policy', 'standard procedure',
] as const;

/**
 * Category 5: Technical Words (when unnecessary)
 * These alienate non-technical users
 */
export const TECHNICAL_WORDS = [
  // Tech jargon
  'backend', 'frontend', 'API', 'SDK', 'cache',
  'latency', 'throughput', 'bandwidth', 'protocol',
  'encryption', 'algorithm', 'parameter', 'configuration',
  
  // Developer-speak
  'deploy', 'integrate', 'implement', 'initialize',
  'authenticate', 'authorize', 'validate', 'parse',
  
  // System terms
  'server', 'database', 'query', 'token', 'session',
  'endpoint', 'payload', 'response', 'request',
  
  // Acronyms (without explanation)
  'OTP', 'API', 'SDK', 'UI', 'UX', 'SSL', 'HTTP',
  'DNS', 'IP', 'URL', 'SQL', 'JSON', 'XML',
] as const;

/**
 * Category 6: Shame-Inducing Words
 * These make users feel bad about themselves
 */
export const SHAME_INDUCING_WORDS = [
  // Blame language
  'you forgot', 'you missed', 'you failed', 'your fault',
  'your mistake', 'your error', 'you should have',
  'why didn\'t you', 'you need to', 'you must',
  
  // Judgment
  'obviously', 'clearly', 'simply', 'just', 'easily',
  'anyone can', 'it\'s easy', 'as you know',
  
  // Condescension
  'as I mentioned', 'as I said', 'again', 'once more',
  'let me explain again', 'to clarify', 'to be clear',
  
  // Comparison shame
  'others have already', 'most users', 'unlike you',
  'your peers', 'competitors', 'falling behind',
  
  // Financial shame
  'overdue', 'delinquent', 'defaulter', 'outstanding balance',
  'failure to pay', 'non-payment', 'debt', 'owed',
] as const;

// =============================================================================
// ADDITIONAL CATEGORIES
// =============================================================================

/**
 * Marketing Jargon & Buzzwords (from vocabulary.ts SIMPLE_ALTERNATIVES)
 * These should be replaced with simpler alternatives
 * 
 * Note: These terms overlap with vocabulary.ts to ensure detection by avoidWordsAgent.
 * Having them here enables scanForAvoidWords() to flag them, which then allows
 * the auto-fix preview system to suggest replacements from vocabulary.ts.
 */
export const MARKETING_JARGON_WORDS = [
  // Tech buzzwords (from SIMPLE_ALTERNATIVES)
  'cutting-edge', 'state-of-the-art', 'world-class', 'best-in-class',
  'seamless', 'frictionless', 'robust', 'scalable',
  
  // Business jargon (from SIMPLE_ALTERNATIVES)
  'utilize', 'leverage', 'synergy', 'paradigm', 'bandwidth',
  'circle back', 'deep dive', 'ping', 'loop in',
  'dashboard', 'onboard', 'optimize', 'streamline',
  
  // Gender-specific terms (from GENDER_NEUTRAL_ALTERNATIVES)
  // These need replacement with gender-neutral alternatives
  'chairman', 'chairwoman', 'businessman', 'businesswoman',
  'fireman', 'policeman', 'mailman', 'stewardess',
  'mankind', 'manpower', 'man-made', 'housewife',
] as const;

/**
 * Elitist Words (Training 1.pdf lines 1792-1827)
 * These exclude users based on tech-savviness or lifestyle
 */
export const ELITIST_WORDS = [
  // Tech elitism
  'tech-savvy', 'power user', 'early adopter', 'digital native',
  'influencer', 'thought leader', 'disruptor', 'innovator',
  
  // Lifestyle elitism
  'premium', 'exclusive', 'elite', 'VIP', 'luxury',
  'high-end', 'upscale', 'sophisticated', 'discerning',
  
  // Exclusionary
  'invite-only', 'members only', 'select few', 'chosen',
  'privileged', 'special access', 'limited membership',
  
  // Money-based
  'affluent', 'high net worth', 'wealthy', 'rich',
  'premium living', 'luxury lifestyle', 'aspirational',
] as const;

/**
 * American English (Use British Instead)
 * These should be replaced with British spellings
 */
export const AMERICAN_SPELLINGS = [
  // -ize vs -ise
  'organize', 'realize', 'recognize', 'customize', 'optimize',
  'analyze', 'categorize', 'prioritize', 'synchronize',
  
  // -or vs -our
  'color', 'favor', 'flavor', 'honor', 'humor',
  'labor', 'neighbor', 'behavior',
  
  // -er vs -re
  'center', 'theater', 'meter', 'fiber',
  
  // -ense vs -ence
  'defense', 'offense', 'license', 'pretense',
  
  // Others
  'canceled', 'traveled', 'modeling', 'jewelry',
  'catalog', 'dialog', 'program',
] as const;

/**
 * Incorrect Currency/Number Formats
 */
export const INCORRECT_FORMATS = [
  'Rs.', 'Rs', 'INR', 'Rupees', 'rupees',
  '100,000', '1,000,000', // Western number format
  '15:30', '23:00', // 24-hour time
] as const;

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * All words to avoid combined
 */
export const ALL_WORDS_TO_AVOID = [
  ...COMPLEX_WORDS,
  ...ROBOTIC_WORDS,
  ...FEAR_BASED_WORDS,
  ...BUREAUCRATIC_WORDS,
  ...TECHNICAL_WORDS,
  ...SHAME_INDUCING_WORDS,
  ...ELITIST_WORDS,
  ...MARKETING_JARGON_WORDS,
] as const;

/**
 * Word categories with metadata
 */
export interface WordCategory {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  words: readonly string[];
}

export const WORD_CATEGORIES: WordCategory[] = [
  {
    id: 'complex',
    name: 'Complex Words',
    description: 'Words that make content harder to understand',
    severity: 'warning',
    words: COMPLEX_WORDS,
  },
  {
    id: 'robotic',
    name: 'Robotic Words',
    description: 'Words that sound impersonal and cold',
    severity: 'warning',
    words: ROBOTIC_WORDS,
  },
  {
    id: 'fear_based',
    name: 'Fear-Based Words',
    description: 'Words that create anxiety or pressure',
    severity: 'error',
    words: FEAR_BASED_WORDS,
  },
  {
    id: 'bureaucratic',
    name: 'Bureaucratic Words',
    description: 'Words that sound official and unapproachable',
    severity: 'warning',
    words: BUREAUCRATIC_WORDS,
  },
  {
    id: 'technical',
    name: 'Technical Words',
    description: 'Words that alienate non-technical users',
    severity: 'info',
    words: TECHNICAL_WORDS,
  },
  {
    id: 'shame_inducing',
    name: 'Shame-Inducing Words',
    description: 'Words that make users feel bad about themselves',
    severity: 'error',
    words: SHAME_INDUCING_WORDS,
  },
  {
    id: 'elitist',
    name: 'Elitist Words',
    description: 'Words that exclude based on tech-savviness or lifestyle',
    severity: 'warning',
    words: ELITIST_WORDS,
  },
  {
    id: 'marketing_jargon',
    name: 'Marketing Jargon',
    description: 'Buzzwords and jargon that should be replaced with simpler alternatives',
    severity: 'warning',
    words: MARKETING_JARGON_WORDS,
  },
];

/**
 * Check if a word should be avoided
 */
export function shouldAvoidWord(word: string): { avoid: boolean; category?: string; severity?: string } {
  const lowerWord = word.toLowerCase();
  
  for (const category of WORD_CATEGORIES) {
    const found = category.words.some(w => 
      lowerWord.includes(w.toLowerCase())
    );
    
    if (found) {
      return {
        avoid: true,
        category: category.name,
        severity: category.severity,
      };
    }
  }
  
  return { avoid: false };
}

/**
 * Get category for a word
 */
export function getWordCategory(word: string): WordCategory | null {
  const lowerWord = word.toLowerCase();
  
  for (const category of WORD_CATEGORIES) {
    const found = category.words.some(w => 
      lowerWord.includes(w.toLowerCase())
    );
    
    if (found) {
      return category;
    }
  }
  
  return null;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scan text for words to avoid using word-boundary matching
 * Uses regex with \b word boundaries to prevent false positives
 * (e.g., "just" should not match inside "adjust", "justice", "justify")
 */
export function scanForAvoidWords(text: string): Array<{
  word: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  position: { start: number; end: number };
}> {
  const results: Array<{
    word: string;
    category: string;
    severity: 'error' | 'warning' | 'info';
    position: { start: number; end: number };
  }> = [];
  
  for (const category of WORD_CATEGORIES) {
    for (const word of category.words) {
      // Use word boundary regex to avoid false positives
      // e.g., "just" should not match "adjust", "justice"
      const escapedWord = escapeRegex(word);
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      
      let match;
      while ((match = regex.exec(text)) !== null) {
        results.push({
          word: match[0], // Use the actual matched text (preserves case)
          category: category.name,
          severity: category.severity,
          position: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }
  }
  
  // Sort by position start
  results.sort((a, b) => a.position.start - b.position.start);
  
  return results;
}

export default {
  COMPLEX_WORDS,
  ROBOTIC_WORDS,
  FEAR_BASED_WORDS,
  BUREAUCRATIC_WORDS,
  TECHNICAL_WORDS,
  SHAME_INDUCING_WORDS,
  ELITIST_WORDS,
  AMERICAN_SPELLINGS,
  INCORRECT_FORMATS,
  ALL_WORDS_TO_AVOID,
  WORD_CATEGORIES,
  shouldAvoidWord,
  getWordCategory,
  scanForAvoidWords,
};
