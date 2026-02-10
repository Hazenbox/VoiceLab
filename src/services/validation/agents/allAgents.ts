/**
 * All Validation Agents
 * 
 * Comprehensive validation agents based on Training 1.pdf (lines 1743-2151)
 * Includes patterns for style, grammar, inclusivity, and brand alignment.
 */

import type { ValidationAgent, PatternRule, ValidationViolation, ValidationAgentId } from '../types';

// =============================================================================
// Helper
// =============================================================================

function createViolation(
  match: RegExpMatchArray,
  rule: PatternRule,
  agentId: ValidationAgentId
): ValidationViolation | null {
  if (match.index === undefined) return null;
  
  return {
    severity: rule.severity,
    rule: rule.rule,
    text: match[0],
    suggestion: rule.suggestion,
    category: rule.category,
    position: {
      start: match.index,
      end: match.index + match[0].length,
    },
    autoFixable: true,
    agentId,
  };
}

function runPatterns(content: string, patterns: PatternRule[], agentId: ValidationAgentId): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  for (const rule of patterns) {
    const matches = content.matchAll(rule.pattern);
    for (const match of matches) {
      const v = createViolation(match, rule, agentId);
      if (v) violations.push(v);
    }
  }
  
  return violations;
}

function calculateScore(violations: ValidationViolation[]): number {
  if (violations.length === 0) return 100;
  
  let deduction = 0;
  for (const v of violations) {
    deduction += v.severity === 'error' ? 15 : v.severity === 'warning' ? 7 : 2;
  }
  
  return Math.max(0, 100 - deduction);
}

// =============================================================================
// Gender Neutrality Agent (Training 1.pdf lines 1743-1785)
// =============================================================================

const GENDER_PATTERNS: PatternRule[] = [
  // Job titles
  { id: 'gn-001', pattern: /\b(chairman|chairwoman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'chairperson', category: 'job_titles' },
  { id: 'gn-002', pattern: /\b(businessman|businesswoman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'businessperson', category: 'job_titles' },
  { id: 'gn-003', pattern: /\b(fireman|policeman|mailman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'firefighter, police officer, mail carrier', category: 'job_titles' },
  { id: 'gn-004', pattern: /\b(mankind)\b/gi, severity: 'warning', rule: 'Use inclusive terms', suggestion: 'humankind', category: 'generic_terms' },
  { id: 'gn-005', pattern: /\b(manpower)\b/gi, severity: 'warning', rule: 'Use inclusive terms', suggestion: 'workforce', category: 'generic_terms' },
  // Greetings (Training 1.pdf)
  { id: 'gn-006', pattern: /\bDear Sir\b/gi, severity: 'error', rule: 'Use gender-neutral greetings', suggestion: 'Hello, Welcome, or Namaste', category: 'greetings' },
  { id: 'gn-007', pattern: /\bDear Madam\b/gi, severity: 'error', rule: 'Use gender-neutral greetings', suggestion: 'Hello, Welcome, or Namaste', category: 'greetings' },
  { id: 'gn-008', pattern: /\bDear Sir\/Madam\b/gi, severity: 'warning', rule: 'Use gender-neutral greetings', suggestion: 'Hello, Welcome, or Namaste', category: 'greetings' },
  // Pronouns (when context suggests assuming gender)
  { id: 'gn-009', pattern: /\b(he can now enjoy|she can now enjoy)\b/gi, severity: 'warning', rule: 'Use gender-neutral pronouns', suggestion: 'They can now enjoy', category: 'pronouns' },
  { id: 'gn-010', pattern: /\b(housewives)\b/gi, severity: 'error', rule: 'Use inclusive terms', suggestion: 'caregivers or homemakers', category: 'stereotypes' },
  { id: 'gn-011', pattern: /\b(working woman|working women)\b/gi, severity: 'warning', rule: 'Avoid gendered labels', suggestion: 'professional or working person', category: 'stereotypes' },
  { id: 'gn-012', pattern: /\b(man up)\b/gi, severity: 'error', rule: 'Avoid gendered idioms', suggestion: 'be brave, step up', category: 'idioms' },
  { id: 'gn-013', pattern: /\b(old wives['\u2019] tale)\b/gi, severity: 'warning', rule: 'Avoid gendered idioms', suggestion: 'common myth, misconception', category: 'idioms' },
];

export const genderNeutralityAgent: ValidationAgent = {
  id: 'gender_neutrality',
  name: 'Gender Neutrality',
  description: 'Ensures gender-neutral language',
  weight: 15,
  patterns: GENDER_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, GENDER_PATTERNS, 'gender_neutrality'),
  calculateScore,
};

// =============================================================================
// Inclusivity Agent (Training 1.pdf - Elitism + Disability, lines 1786-1838)
// =============================================================================

const INCLUSIVITY_PATTERNS: PatternRule[] = [
  // Assumptions
  { id: 'in-001', pattern: /\b(obviously|clearly|simply)\s+(you|anyone)\s+(can|should)\b/gi, severity: 'warning', rule: 'Avoid assumptions', suggestion: 'Remove qualifiers', category: 'assumptions' },
  
  // Disability-inclusive language
  { id: 'in-002', pattern: /\b(wheelchair[-\s]?bound)\b/gi, severity: 'error', rule: 'Use person-first language', suggestion: 'wheelchair user', category: 'disability' },
  { id: 'in-003', pattern: /\b(the disabled)\b/gi, severity: 'error', rule: 'Use person-first language', suggestion: 'people with disabilities', category: 'disability' },
  { id: 'in-004', pattern: /\b(suffers from|afflicted with)\b/gi, severity: 'warning', rule: 'Use neutral language', suggestion: 'has, lives with', category: 'disability' },
  { id: 'in-005', pattern: /\b(handicapped)\b/gi, severity: 'error', rule: 'Use person-first language', suggestion: 'person with a disability', category: 'disability' },
  { id: 'in-006', pattern: /\b(crippled)\b/gi, severity: 'error', rule: 'Use respectful language', suggestion: 'person with mobility difference', category: 'disability' },
  { id: 'in-007', pattern: /\b(deaf and dumb)\b/gi, severity: 'error', rule: 'Use respectful language', suggestion: 'Deaf person or non-speaking person', category: 'disability' },
  { id: 'in-008', pattern: /\b(mentally retarded)\b/gi, severity: 'error', rule: 'Use respectful language', suggestion: 'person with intellectual disability', category: 'disability' },
  { id: 'in-009', pattern: /\b(normal person)\b/gi, severity: 'warning', rule: 'Avoid normalizing language', suggestion: 'non-disabled person', category: 'disability' },
  
  // Anti-elitism patterns (Training 1.pdf lines 1792-1827)
  { id: 'in-010', pattern: /\b(tech[-\s]?savvy|power[-\s]?user)\b/gi, severity: 'warning', rule: 'Avoid tech elitism', suggestion: 'Remove term or use "user"', category: 'elitism' },
  { id: 'in-011', pattern: /\b(ping us)\b/gi, severity: 'warning', rule: 'Use everyday language', suggestion: 'message us', category: 'elitism' },
  { id: 'in-012', pattern: /\b(\d+)\s*bucks\b/gi, severity: 'warning', rule: 'Use Indian currency format', suggestion: '₹[amount]', category: 'elitism' },
  { id: 'in-013', pattern: /\bon[-\s]?the[-\s]?go\b/gi, severity: 'info', rule: 'Use simpler language', suggestion: 'anytime, anywhere', category: 'elitism' },
  { id: 'in-014', pattern: /\b(go to your dashboard)\b/gi, severity: 'warning', rule: 'Use simpler language', suggestion: 'open your account', category: 'elitism' },
  { id: 'in-015', pattern: /\b(premium living|luxury lifestyle)\b/gi, severity: 'warning', rule: 'Avoid aspirational elitism', suggestion: 'useful features, smart tools', category: 'elitism' },
  { id: 'in-016', pattern: /\b(offer drops)\b/gi, severity: 'info', rule: 'Use clearer language', suggestion: 'offer available now', category: 'elitism' },
  { id: 'in-017', pattern: /\b(steal deal|a steal)\b/gi, severity: 'info', rule: 'Use clearer language', suggestion: 'great value, ₹X off', category: 'elitism' },
  { id: 'in-018', pattern: /\b(initiate onboarding)\b/gi, severity: 'warning', rule: 'Use everyday language', suggestion: "let's get started", category: 'elitism' },
  { id: 'in-019', pattern: /\b(invite[-\s]?only)\b/gi, severity: 'warning', rule: 'Make inclusive', suggestion: 'everyone can try it', category: 'elitism' },
  { id: 'in-020', pattern: /\b(\d{2}):(\d{2})\s*hrs\b/gi, severity: 'info', rule: 'Use 12-hour time format', suggestion: 'X:XX AM/PM', category: 'elitism' },
];

export const inclusivityAgent: ValidationAgent = {
  id: 'inclusivity',
  name: 'Inclusivity',
  description: 'Ensures inclusive language',
  weight: 15,
  patterns: INCLUSIVITY_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, INCLUSIVITY_PATTERNS, 'inclusivity'),
  calculateScore,
};

// =============================================================================
// Cultural Sensitivity Agent
// =============================================================================

const CULTURAL_PATTERNS: PatternRule[] = [
  { id: 'cs-001', pattern: /\b(madrasi|bhaiya|chinki|mallu)\b/gi, severity: 'error', rule: 'Avoid regional slurs', suggestion: 'Use proper regional terms', category: 'slurs' },
  { id: 'cs-002', pattern: /\b(caste|untouchable)\b/gi, severity: 'error', rule: 'Avoid caste references', suggestion: 'Remove term', category: 'caste' },
  { id: 'cs-003', pattern: /\b(fair\s+skin|dark\s+skin|gora|kaala)\b/gi, severity: 'error', rule: 'Avoid colorism', suggestion: 'Remove skin color reference', category: 'colorism' },
];

export const culturalSensitivityAgent: ValidationAgent = {
  id: 'cultural_sensitivity',
  name: 'Cultural Sensitivity',
  description: 'Respects cultural diversity',
  weight: 15,
  patterns: CULTURAL_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, CULTURAL_PATTERNS, 'cultural_sensitivity'),
  calculateScore,
};

// =============================================================================
// Accessibility Agent
// =============================================================================

const ACCESSIBILITY_PATTERNS: PatternRule[] = [
  { id: 'ac-001', pattern: /\b(click\s+here|tap\s+here)\b/gi, severity: 'warning', rule: 'Use descriptive link text', suggestion: 'Describe the action', category: 'links' },
  { id: 'ac-002', pattern: /\b(the\s+red|the\s+green|the\s+blue)\s+(button|text)\b/gi, severity: 'warning', rule: 'Avoid color-only references', suggestion: 'Add label in addition to color', category: 'color' },
  { id: 'ac-003', pattern: /\b(see\s+the\s+image|as\s+shown)\b/gi, severity: 'warning', rule: 'Provide text alternatives', suggestion: 'Describe visual content', category: 'visual' },
];

export const accessibilityAgent: ValidationAgent = {
  id: 'accessibility',
  name: 'Accessibility',
  description: 'Ensures content accessibility',
  weight: 10,
  patterns: ACCESSIBILITY_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, ACCESSIBILITY_PATTERNS, 'accessibility'),
  calculateScore,
};

// =============================================================================
// Compliance Agent
// =============================================================================

const COMPLIANCE_PATTERNS: PatternRule[] = [
  { id: 'cp-001', pattern: /\b(guaranteed|100%|always|never\s+fails)\b/gi, severity: 'error', rule: 'Avoid absolute claims', suggestion: 'Use qualified language', category: 'claims' },
  { id: 'cp-002', pattern: /\b(free|unlimited)\b(?!\s*\*)/gi, severity: 'warning', rule: 'Add terms and conditions', suggestion: 'Add asterisk and T&C reference', category: 'claims' },
  { id: 'cp-003', pattern: /\b(best\s+in\s+India|number\s+one|#1)\b/gi, severity: 'warning', rule: 'Substantiate superlatives', suggestion: 'Add source citation', category: 'superlatives' },
];

export const complianceAgent: ValidationAgent = {
  id: 'compliance',
  name: 'Compliance',
  description: 'Ensures regulatory compliance',
  weight: 15,
  patterns: COMPLIANCE_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, COMPLIANCE_PATTERNS, 'compliance'),
  calculateScore,
};

// =============================================================================
// Style Consistency Agent (Training 1.pdf - Style & Grammar Rules, lines 1570-1628)
// =============================================================================

const STYLE_PATTERNS: PatternRule[] = [
  // Brand capitalization
  { id: 'st-001', pattern: /\bjio\b/g, severity: 'warning', rule: 'Capitalize Jio', suggestion: 'Jio', category: 'brand' },
  { id: 'st-002', pattern: /\bJIO\b/g, severity: 'warning', rule: 'Avoid all-caps', suggestion: 'Jio', category: 'brand' },
  
  // Corporate jargon avoidance
  { id: 'st-003', pattern: /\b(utilize|facilitate|leverage|synergy)\b/gi, severity: 'warning', rule: 'Avoid corporate jargon', suggestion: 'Use simpler language', category: 'jargon' },
  { id: 'st-004', pattern: /\b(in\s+order\s+to)\b/gi, severity: 'info', rule: 'Simplify phrase', suggestion: 'to', category: 'wordiness' },
  { id: 'st-005', pattern: /\b(at this point in time)\b/gi, severity: 'info', rule: 'Simplify phrase', suggestion: 'now', category: 'wordiness' },
  { id: 'st-006', pattern: /\b(due to the fact that)\b/gi, severity: 'info', rule: 'Simplify phrase', suggestion: 'because', category: 'wordiness' },
  
  // CRITICAL: Exclamation marks (Training 1.pdf - avoid unless absolutely necessary)
  { id: 'st-007', pattern: /[!]{2,}/g, severity: 'error', rule: 'Never use multiple exclamations', suggestion: 'Remove extra exclamation marks', category: 'punctuation' },
  { id: 'st-008', pattern: /!/g, severity: 'info', rule: 'Avoid exclamation marks unless absolutely necessary', suggestion: 'Consider removing or using a full stop', category: 'punctuation' },
  
  // CRITICAL: Title Case Detection (Training 1.pdf - Use sentence case only)
  // Detects patterns like "Get Started Today" or "Light Up Your Home"
  { id: 'st-009', pattern: /(?:^|[.!?]\s+)(?:[A-Z][a-z]+\s+){2,}[A-Z][a-z]+(?:\s|$|[.!?])/gm, severity: 'warning', rule: 'Use sentence case, not Title Case', suggestion: 'Lowercase non-proper nouns', category: 'capitalization' },
  
  // CRITICAL: British spellings (Training 1.pdf lines 1594-1610)
  { id: 'st-010', pattern: /\bcolor\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'colour', category: 'spelling' },
  { id: 'st-011', pattern: /\bfavorite\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'favourite', category: 'spelling' },
  { id: 'st-012', pattern: /\borganization\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'organisation', category: 'spelling' },
  { id: 'st-013', pattern: /\borganize\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'organise', category: 'spelling' },
  { id: 'st-014', pattern: /\brealize\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'realise', category: 'spelling' },
  { id: 'st-015', pattern: /\brecognize\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'recognise', category: 'spelling' },
  { id: 'st-016', pattern: /\bcustomize\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'customise', category: 'spelling' },
  { id: 'st-017', pattern: /\bcenter\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'centre', category: 'spelling' },
  { id: 'st-018', pattern: /\bdefense\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'defence', category: 'spelling' },
  { id: 'st-019', pattern: /\boffense\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'offence', category: 'spelling' },
  { id: 'st-020', pattern: /\blicense\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'licence', category: 'spelling' },
  { id: 'st-021', pattern: /\bhonor\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'honour', category: 'spelling' },
  { id: 'st-022', pattern: /\bhumor\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'humour', category: 'spelling' },
  { id: 'st-023', pattern: /\bflavor\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'flavour', category: 'spelling' },
  { id: 'st-024', pattern: /\blabor\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'labour', category: 'spelling' },
  { id: 'st-025', pattern: /\bbehavior\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'behaviour', category: 'spelling' },
  { id: 'st-026', pattern: /\banalyze\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'analyse', category: 'spelling' },
  { id: 'st-027', pattern: /\bmodeling\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'modelling', category: 'spelling' },
  { id: 'st-028', pattern: /\btraveling\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'travelling', category: 'spelling' },
  { id: 'st-029', pattern: /\bcanceled\b/gi, severity: 'warning', rule: 'Use British spelling', suggestion: 'cancelled', category: 'spelling' },
  
  // CRITICAL: Currency format (Training 1.pdf - Use ₹ symbol)
  { id: 'st-030', pattern: /\bRs\.?\s*(\d)/gi, severity: 'error', rule: 'Use ₹ symbol for Indian currency', suggestion: '₹', category: 'currency' },
  { id: 'st-031', pattern: /\bINR\s*(\d)/gi, severity: 'error', rule: 'Use ₹ symbol for Indian currency', suggestion: '₹', category: 'currency' },
  { id: 'st-032', pattern: /\bRupees?\s+(\d)/gi, severity: 'warning', rule: 'Use ₹ symbol for Indian currency', suggestion: '₹', category: 'currency' },
  
  // CRITICAL: Indian number format (1,00,000 not 100,000)
  // Detect Western format like 100,000 or 1,000,000 (groups of 3)
  { id: 'st-033', pattern: /\b(\d{1,3})(,\d{3}){2,}\b/g, severity: 'warning', rule: 'Use Indian number format (1,00,000)', suggestion: 'Use Indian grouping: X,XX,XXX', category: 'numbers' },
  
  // Straight quotes to curved quotes
  { id: 'st-034', pattern: /"([^"]*)"/g, severity: 'info', rule: 'Use curved quotes for better typography', suggestion: 'Use curved quotes', category: 'punctuation' },
  { id: 'st-035', pattern: /'([^']*?)'/g, severity: 'info', rule: 'Use curved apostrophes for better typography', suggestion: 'Use curved apostrophes', category: 'punctuation' },
  
  // En-dash for ranges (not hyphen)
  { id: 'st-036', pattern: /(\d+)-(\d+)/g, severity: 'info', rule: 'Use en-dash for number ranges', suggestion: '$1–$2', category: 'punctuation' },
  
  // Oxford comma check (Jio does NOT use Oxford comma)
  { id: 'st-037', pattern: /,\s+and\s+/gi, severity: 'info', rule: 'No Oxford comma in Jio style', suggestion: 'Consider: "A, B and C" format', category: 'punctuation' },
  
  // 24-hour time format to 12-hour (Training 1.pdf)
  { id: 'st-038', pattern: /\b([01]?\d|2[0-3]):([0-5]\d)\s*(hrs?|hours?)\b/gi, severity: 'warning', rule: 'Use 12-hour time format', suggestion: 'Use AM/PM format (e.g., 3:30 PM)', category: 'time' },
];

export const styleConsistencyAgent: ValidationAgent = {
  id: 'style_consistency',
  name: 'Style Consistency',
  description: 'Maintains brand voice',
  weight: 15,
  patterns: STYLE_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, STYLE_PATTERNS, 'style_consistency'),
  calculateScore,
};

// =============================================================================
// Brand Alignment Agent (Training 1.pdf - 10 Guardrails enforcement)
// =============================================================================

const BRAND_PATTERNS: PatternRule[] = [
  // Demanding tone (soften it)
  { id: 'ba-001', pattern: /\b(must|required|mandatory|compulsory)\b/gi, severity: 'warning', rule: 'Soften demanding tone', suggestion: 'please, we recommend', category: 'tone' },
  
  // Positive framing (Training 1.pdf - "We are positive")
  { id: 'ba-002', pattern: /\b(cannot|won\'t|don\'t)\b(?!\s+worry)/gi, severity: 'info', rule: 'Consider positive framing', suggestion: 'Rephrase positively', category: 'tone' },
  { id: 'ba-003', pattern: /\b(not available|unavailable)\b/gi, severity: 'warning', rule: 'Frame positively', suggestion: 'coming soon, available in [area]', category: 'tone' },
  { id: 'ba-004', pattern: /\b(error|failed|failure)\b/gi, severity: 'info', rule: 'Use gentler language', suggestion: "something went wrong, let's try again", category: 'tone' },
  
  // Fear-based messaging (Training 1.pdf - words to avoid)
  { id: 'ba-005', pattern: /\b(urgent|hurry|last chance|only \d+ left)\b/gi, severity: 'warning', rule: 'Avoid fear-based urgency', suggestion: 'Use positive framing', category: 'fear' },
  { id: 'ba-006', pattern: /\b(act now|limited time|expires soon)\b/gi, severity: 'info', rule: 'Avoid pressure tactics', suggestion: 'available until [date]', category: 'fear' },
  { id: 'ba-007', pattern: /\b(don\'t miss out|FOMO)\b/gi, severity: 'warning', rule: 'Avoid fear-based language', suggestion: 'You can enjoy, here for you', category: 'fear' },
  
  // Boastful language (Training 1.pdf - "We are modest")
  { id: 'ba-008', pattern: /\b(best in India|number one|#1|most trusted)\b/gi, severity: 'warning', rule: 'Avoid boastful claims', suggestion: 'Our customers trust us', category: 'modesty' },
  { id: 'ba-009', pattern: /\b(world[-\s]?class|cutting[-\s]?edge|state[-\s]?of[-\s]?the[-\s]?art)\b/gi, severity: 'warning', rule: 'Avoid buzzwords', suggestion: 'Describe specific benefit', category: 'modesty' },
  { id: 'ba-010', pattern: /\b(revolutionary|game[-\s]?changing|disruptive)\b/gi, severity: 'warning', rule: 'Avoid hyperbole', suggestion: 'Describe actual improvement', category: 'modesty' },
  
  // Complex/jargon (Training 1.pdf - "We are simple")
  { id: 'ba-011', pattern: /\b(aforementioned|henceforth|hereby|therein)\b/gi, severity: 'warning', rule: 'Use everyday language', suggestion: 'Use simpler alternative', category: 'jargon' },
  { id: 'ba-012', pattern: /\b(pursuant to|in accordance with|notwithstanding)\b/gi, severity: 'warning', rule: 'Use everyday language', suggestion: 'following, as per', category: 'jargon' },
  { id: 'ba-013', pattern: /\b(seamless|frictionless|robust|scalable)\b/gi, severity: 'info', rule: 'Avoid tech buzzwords', suggestion: 'Use specific benefit', category: 'jargon' },
  
  // Judgmental language (Training 1.pdf - "We are non-judgmental")
  { id: 'ba-014', pattern: /\b(unfortunately|regrettably|sadly)\b/gi, severity: 'info', rule: 'Avoid negative emotional framing', suggestion: 'State fact directly', category: 'judgment' },
  { id: 'ba-015', pattern: /\b(highly motivated|discerning customers|premium users)\b/gi, severity: 'warning', rule: 'Avoid exclusionary language', suggestion: 'everyone, all users', category: 'judgment' },
  
  // Marketing: Benefit-first rule (Training 1.pdf - headlines should lead with benefit)
  // This pattern catches headlines that start with event names (common mistake)
  { id: 'ba-016', pattern: /\b(Diwali|Durga Puja|Holi|Eid|Christmas|New Year|Independence Day)\s+(sale|offer|special)\b/gi, severity: 'warning', rule: 'Headlines should lead with benefit, not event', suggestion: 'Put discount/benefit first: "50% off - [Event] Special"', category: 'marketing' },
  
  // Shame-inducing words (Training 1.pdf)
  { id: 'ba-017', pattern: /\b(you forgot|you missed|you failed to)\b/gi, severity: 'warning', rule: 'Avoid blame language', suggestion: 'Here\'s a reminder, Still time to', category: 'shame' },
  { id: 'ba-018', pattern: /\b(your fault|your mistake)\b/gi, severity: 'error', rule: 'Never blame the user', suggestion: 'Something went wrong, let us help', category: 'shame' },
];

export const brandAlignmentAgent: ValidationAgent = {
  id: 'brand_alignment',
  name: 'Brand Alignment',
  description: 'Aligns with Jio brand values',
  weight: 15,
  patterns: BRAND_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, BRAND_PATTERNS, 'brand_alignment'),
  calculateScore,
};

// =============================================================================
// Readability Agent (Training 1.pdf - Grade 8 Readability Requirement)
// =============================================================================

/**
 * Count syllables in a word (approximate)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  // Count vowel groups
  const matches = word.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  
  // Adjust for silent e
  if (word.endsWith('e') && count > 1) count--;
  // Adjust for -le endings
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) count++;
  
  return Math.max(1, count);
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * Formula: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
 */
function calculateFleschKincaidGrade(text: string): number {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  
  // Split into words
  const words = text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z]/g, '').length > 0);
  const wordCount = Math.max(1, words.length);
  
  // Count syllables
  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllables(word);
  }
  
  // Calculate grade level
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  
  return Math.max(0, Math.round(gradeLevel * 10) / 10);
}

/**
 * Readability validation patterns
 */
const READABILITY_PATTERNS: PatternRule[] = [
  // Long sentences (more than 25 words)
  { id: 'rd-001', pattern: /(?:[^\s.!?]+\s+){25,}[^\s.!?]+[.!?]/g, severity: 'warning', rule: 'Sentence too long', suggestion: 'Break into shorter sentences (max 20 words)', category: 'sentence_length' },
  
  // Very long words (more than 15 characters) - may be complex
  { id: 'rd-002', pattern: /\b[a-zA-Z]{15,}\b/g, severity: 'info', rule: 'Complex word detected', suggestion: 'Consider simpler alternative', category: 'word_complexity' },
  
  // Multiple commas in one sentence (may indicate complexity)
  { id: 'rd-003', pattern: /[^.!?]*,[^.!?]*,[^.!?]*,[^.!?]*[.!?]/g, severity: 'info', rule: 'Complex sentence structure', suggestion: 'Simplify or break into multiple sentences', category: 'sentence_structure' },
];

/**
 * Readability Agent - Ensures content is at Grade 8 level or below
 * Training 1.pdf requirement: 100% of messages must test at ≤Grade 8
 */
export const readabilityAgent: ValidationAgent = {
  id: 'readability',
  name: 'Readability',
  description: 'Ensures content is readable at Grade 8 level (Training 1.pdf requirement)',
  weight: 12,
  patterns: READABILITY_PATTERNS,
  
  runPatternValidation: (content: string): ValidationViolation[] => {
    const violations: ValidationViolation[] = [];
    
    // Run pattern matching
    const patternViolations = runPatterns(content, READABILITY_PATTERNS, 'readability');
    violations.push(...patternViolations);
    
    // Calculate readability grade
    const grade = calculateFleschKincaidGrade(content);
    
    // If grade is above 8, add violation
    if (grade > 8) {
      violations.push({
        severity: grade > 10 ? 'error' : 'warning',
        rule: `Content readability is Grade ${grade} (target: ≤Grade 8)`,
        text: `Readability: Grade ${grade}`,
        suggestion: 'Use shorter sentences and simpler words to reach Grade 8 readability',
        category: 'readability_score',
        position: { start: 0, end: content.length },
        autoFixable: false,
        agentId: 'readability',
      });
    }
    
    return violations;
  },
  
  calculateScore: (violations: ValidationViolation[]): number => {
    if (violations.length === 0) return 100;
    
    let deduction = 0;
    for (const v of violations) {
      if (v.category === 'readability_score') {
        // Heavier penalty for readability score issues
        deduction += v.severity === 'error' ? 30 : 15;
      } else {
        deduction += v.severity === 'error' ? 10 : v.severity === 'warning' ? 5 : 2;
      }
    }
    
    return Math.max(0, 100 - deduction);
  },
};

// =============================================================================
// Avoid Words Agent Import
// =============================================================================

import { avoidWordsAgent } from './avoidWordsAgent';

// =============================================================================
// All Agents Export
// =============================================================================

export const ALL_AGENTS: Record<ValidationAgentId, ValidationAgent> = {
  gender_neutrality: genderNeutralityAgent,
  inclusivity: inclusivityAgent,
  cultural_sensitivity: culturalSensitivityAgent,
  accessibility: accessibilityAgent,
  compliance: complianceAgent,
  style_consistency: styleConsistencyAgent,
  brand_alignment: brandAlignmentAgent,
  readability: readabilityAgent,
  avoid_words: avoidWordsAgent,
};
