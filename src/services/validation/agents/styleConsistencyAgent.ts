/**
 * Style Consistency Agent
 * Training 1.pdf - Style & Grammar Rules, lines 1570-1628
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const STYLE_PATTERNS: PatternRule[] = [
  // Brand capitalization
  { id: 'st-001', pattern: /\bjio\b/g, severity: 'warning', rule: 'Capitalize Jio', suggestion: 'Jio', category: 'brand' },
  { id: 'st-002', pattern: /\bJIO\b/g, severity: 'warning', rule: 'Avoid all-caps', suggestion: 'Jio', category: 'brand' },
  
  // Corporate jargon avoidance
  { id: 'st-003', pattern: /\b(utilize|facilitate|leverage|synergy)\b/gi, severity: 'warning', rule: 'Avoid corporate jargon', suggestion: 'Use simpler language', category: 'jargon' },
  { id: 'st-004', pattern: /\b(in\s+order\s+to)\b/gi, severity: 'info', rule: 'Simplify phrase', suggestion: 'to', category: 'wordiness' },
  { id: 'st-005', pattern: /\b(at this point in time)\b/gi, severity: 'info', rule: 'Simplify phrase', suggestion: 'now', category: 'wordiness' },
  { id: 'st-006', pattern: /\b(due to the fact that)\b/gi, severity: 'info', rule: 'Simplify phrase', suggestion: 'because', category: 'wordiness' },
  
  // Exclamation marks
  { id: 'st-007', pattern: /[!]{2,}/g, severity: 'error', rule: 'Never use multiple exclamations', suggestion: 'Remove extra exclamation marks', category: 'punctuation' },
  { id: 'st-008', pattern: /!/g, severity: 'info', rule: 'Avoid exclamation marks unless absolutely necessary', suggestion: '.', category: 'punctuation' },
  
  // Title Case Detection
  { id: 'st-009', pattern: /(?:^|[.!?]\s+)(?:[A-Z][a-z]+\s+){2,}[A-Z][a-z]+(?:\s|$|[.!?])/gm, severity: 'warning', rule: 'Use sentence case, not Title Case', suggestion: 'Lowercase non-proper nouns', category: 'capitalization' },
  
  // British spellings
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
  
  // Currency format
  { id: 'st-030', pattern: /\bRs\.?\s*(\d)/gi, severity: 'error', rule: 'Use ₹ symbol for Indian currency', suggestion: '₹', category: 'currency' },
  { id: 'st-031', pattern: /\bINR\s*(\d)/gi, severity: 'error', rule: 'Use ₹ symbol for Indian currency', suggestion: '₹', category: 'currency' },
  { id: 'st-032', pattern: /\bRupees?\s+(\d)/gi, severity: 'warning', rule: 'Use ₹ symbol for Indian currency', suggestion: '₹', category: 'currency' },
  
  // Indian number format
  { id: 'st-033', pattern: /\b(\d{1,3})(,\d{3}){2,}\b/g, severity: 'warning', rule: 'Use Indian number format (1,00,000)', suggestion: 'Use Indian grouping: X,XX,XXX', category: 'numbers' },
  
  // Quotes
  { id: 'st-034', pattern: /"([^"]*)"/g, severity: 'info', rule: 'Use curved quotes for better typography', suggestion: 'Use curved quotes', category: 'punctuation' },
  { id: 'st-035', pattern: /'([^']*?)'/g, severity: 'info', rule: 'Use curved apostrophes for better typography', suggestion: 'Use curved apostrophes', category: 'punctuation' },
  
  // En-dash for ranges (exclude phone numbers: negative lookbehind/lookahead for adjacent digit-hyphen patterns)
  { id: 'st-036', pattern: /(?<!\d[-–])(\d+)-(\d+)(?![-–]\d)/g, severity: 'info', rule: 'Use en-dash for number ranges', suggestion: '$1–$2', category: 'punctuation' },
  
  // Oxford comma
  { id: 'st-037', pattern: /,\s+and\s+/gi, severity: 'info', rule: 'No Oxford comma in Jio style', suggestion: 'Consider: "A, B and C" format', category: 'punctuation' },
  
  // 24-hour time
  { id: 'st-038', pattern: /\b([01]?\d|2[0-3]):([0-5]\d)\s*(hrs?|hours?)\b/gi, severity: 'warning', rule: 'Use 12-hour time format', suggestion: 'Use AM/PM format (e.g., 3:30 PM)', category: 'time' },
  
  // Additional style patterns
  { id: 'st-039', pattern: /^[A-Z][^.!?\n]{20,}[^.!?\n\d]$/gm, severity: 'info', rule: 'Sentences should end with proper punctuation', suggestion: 'Add period (.) at the end', category: 'punctuation' },
  { id: 'st-040', pattern: /\s&\s(?!(?:T|D|M)\b)/g, severity: 'warning', rule: 'Use "and" instead of "&" in body text', suggestion: 'and', category: 'punctuation' },
  { id: 'st-041', pattern: /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|month|year|GB|MB|minute|hour|week|user|plan|call|message|sms|time)s?\b/gi, severity: 'warning', rule: 'Use numerals for quantities', suggestion: 'Replace with numeral (1, 2, 3...)', category: 'numbers' },
  { id: 'st-042', pattern: /\s{2,}/g, severity: 'info', rule: 'Remove extra spaces', suggestion: 'Use single space', category: 'spacing' },
  { id: 'st-043', pattern: /[.!?]\s+[a-z]/g, severity: 'warning', rule: 'Capitalize first letter after sentence end', suggestion: 'Capitalize the letter', category: 'capitalization' },
  { id: 'st-044', pattern: /--/g, severity: 'info', rule: 'Use proper em-dash (—) instead of double hyphen', suggestion: '—', category: 'punctuation' },
  { id: 'st-045', pattern: /\.{3,}/g, severity: 'info', rule: 'Use proper ellipsis character (…)', suggestion: '…', category: 'punctuation' },
  { id: 'st-046', pattern: /^\s*[,;:]/gm, severity: 'warning', rule: 'Remove leading punctuation', suggestion: 'Remove the punctuation', category: 'punctuation' },
  
  // Emoji patterns
  { id: 'st-047', pattern: /(?:[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}].*){4,}/gu, severity: 'warning', rule: 'Too many emojis', suggestion: 'Use max 2-3 emojis per message', category: 'emoji' },
  { id: 'st-048', pattern: /(?:terms|conditions|policy|privacy|legal|agreement|warranty)[\s\S]{0,50}[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/giu, severity: 'warning', rule: 'Avoid emojis in legal/formal content', suggestion: 'Remove emoji from formal sections', category: 'emoji' },
  { id: 'st-049', pattern: /(?:error|failed|failure|issue|problem)[\s\S]{0,30}(?:🎉|✨|🎊|👏|🙌)/giu, severity: 'warning', rule: 'Avoid celebratory emojis in error messages', suggestion: 'Use neutral or empathetic tone', category: 'emoji' },
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
