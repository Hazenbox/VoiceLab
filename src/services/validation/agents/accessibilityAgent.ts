/**
 * Accessibility Validation Agent
 * 
 * Ensures content is accessible for users with different abilities,
 * including screen reader compatibility and cognitive accessibility.
 * 
 * @module services/validation/agents/accessibilityAgent
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Pattern rules for accessibility
 */
const ACCESSIBILITY_PATTERNS: PatternRule[] = [
  // Link text issues
  {
    id: 'ac-001',
    pattern: /\b(click\s+here|tap\s+here|here|read\s+more)\b/gi,
    severity: 'warning',
    message: 'Non-descriptive link text - bad for screen readers',
    suggestion: 'Use descriptive text like "View your bill details"',
    category: 'links',
  },
  {
    id: 'ac-002',
    pattern: /\b(this\s+link|this\s+page|above|below)\b/gi,
    severity: 'info',
    message: 'Positional reference - may not work for all users',
    suggestion: 'Use specific references instead of position',
    category: 'spatial',
  },
  // Color-only information
  {
    id: 'ac-003',
    pattern: /\b(the\s+red|the\s+green|the\s+blue)\s+(button|text|link|icon|area)\b/gi,
    severity: 'warning',
    message: 'Color-only reference - provide additional context',
    suggestion: 'Add label or icon in addition to color',
    category: 'color',
  },
  {
    id: 'ac-004',
    pattern: /\b(shown\s+in\s+red|highlighted\s+in\s+green|marked\s+in\s+yellow)\b/gi,
    severity: 'warning',
    message: 'Color-dependent instruction',
    suggestion: 'Add non-color visual indicator description',
    category: 'color',
  },
  // Complex language
  {
    id: 'ac-005',
    pattern: /\b(\w{15,})\b/g,
    severity: 'info',
    message: 'Very long word detected - may be difficult to read',
    suggestion: 'Consider breaking into simpler terms',
    category: 'readability',
  },
  // Reading level (simple heuristic)
  {
    id: 'ac-006',
    pattern: /[^.!?]*[.!?]/g,
    severity: 'info',
    message: 'Check sentence length for readability',
    suggestion: 'Keep sentences under 25 words',
    category: 'readability',
  },
  // Abbreviations without explanation
  {
    id: 'ac-007',
    pattern: /\b([A-Z]{2,5})\b(?!\s*[-–—:]\s*|\s*\()/g,
    severity: 'info',
    message: 'Abbreviation without expansion',
    suggestion: 'Spell out on first use, e.g., "SMS (Short Message Service)"',
    category: 'abbreviations',
  },
  // Visual-only instructions
  {
    id: 'ac-008',
    pattern: /\b(see\s+the\s+image|as\s+shown|look\s+at|watch\s+the)\b/gi,
    severity: 'warning',
    message: 'Visual-only instruction',
    suggestion: 'Provide text alternative for visual content',
    category: 'visual',
  },
  {
    id: 'ac-009',
    pattern: /\b(on\s+the\s+left|on\s+the\s+right|at\s+the\s+top|at\s+the\s+bottom)\b/gi,
    severity: 'info',
    message: 'Spatial reference - may not work in all contexts',
    suggestion: 'Use element labels instead of positions',
    category: 'spatial',
  },
  // Time-sensitive actions
  {
    id: 'ac-010',
    pattern: /\b(within\s+\d+\s+seconds?|before\s+the\s+timer)\b/gi,
    severity: 'warning',
    message: 'Time-sensitive action may exclude some users',
    suggestion: 'Allow extended time or remove time pressure',
    category: 'timing',
  },
  // Cognitive load
  {
    id: 'ac-011',
    pattern: /\b(remember\s+to|don't\s+forget|make\s+sure\s+you)\s+.{50,}/gi,
    severity: 'info',
    message: 'Long instruction with memory requirement',
    suggestion: 'Break into smaller, actionable steps',
    category: 'cognitive',
  },
  // Audio-only content references
  {
    id: 'ac-012',
    pattern: /\b(listen\s+to|as\s+you\s+can\s+hear|audio\s+message)\b/gi,
    severity: 'info',
    message: 'Audio reference - ensure transcripts available',
    suggestion: 'Provide text alternative for audio content',
    category: 'audio',
  },
  // Flashing/animation references
  {
    id: 'ac-013',
    pattern: /\b(flashing|blinking|animated|moving)\s+(icon|button|text|image)\b/gi,
    severity: 'warning',
    message: 'Animation reference - may cause issues for some users',
    suggestion: 'Ensure animation can be paused or disabled',
    category: 'motion',
  },
  // Phone/touch assumptions
  {
    id: 'ac-014',
    pattern: /\b(swipe|pinch|shake\s+your\s+phone|tap\s+and\s+hold)\b/gi,
    severity: 'info',
    message: 'Touch gesture instruction - provide alternatives',
    suggestion: 'Mention alternative methods for different input devices',
    category: 'input',
  },
  // Emoji overuse (screen reader issues)
  {
    id: 'ac-015',
    pattern: /[\u{1F300}-\u{1F9FF}]{3,}/gu,
    severity: 'warning',
    message: 'Multiple consecutive emojis - verbose for screen readers',
    suggestion: 'Limit emoji use or separate them',
    category: 'emoji',
  },
];

/**
 * Calculate reading level (simplified Flesch-Kincaid grade)
 */
function calculateReadingLevel(content: string): number {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  // Simplified Flesch-Kincaid Grade Level
  return 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
}

/**
 * Count syllables in a word (rough estimate)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  const vowels = word.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 1;
  
  // Adjust for common patterns
  if (word.endsWith('e')) count--;
  if (word.endsWith('le') && word.length > 2) count++;
  if (count < 1) count = 1;
  
  return count;
}

/**
 * Accessibility Validation Agent
 */
export const accessibilityAgent: ValidationAgent = {
  id: 'accessibility',
  name: 'Accessibility',
  description: 'Ensures content is accessible for users with different abilities',
  weight: 10,
  patterns: ACCESSIBILITY_PATTERNS,
  
  runPatternValidation(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    // Run pattern matching
    for (const rule of ACCESSIBILITY_PATTERNS) {
      const matches = content.matchAll(rule.pattern);
      
      for (const match of matches) {
        if (match.index !== undefined) {
          // Skip the sentence length check pattern
          if (rule.id === 'ac-006') continue;
          
          violations.push({
            id: uuid(),
            agentId: 'accessibility',
            severity: rule.severity,
            message: rule.message,
            suggestion: rule.suggestion,
            location: {
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
            },
            category: rule.category,
            confidence: 75,
          });
        }
      }
    }
    
    // Check reading level
    const gradeLevel = calculateReadingLevel(content);
    if (gradeLevel > 12) {
      violations.push({
        id: uuid(),
        agentId: 'accessibility',
        severity: 'warning',
        message: `Reading level is grade ${Math.round(gradeLevel)} - aim for grade 8 or below`,
        suggestion: 'Use shorter sentences and simpler words',
        category: 'readability',
        confidence: 70,
      });
    } else if (gradeLevel > 8) {
      violations.push({
        id: uuid(),
        agentId: 'accessibility',
        severity: 'info',
        message: `Reading level is grade ${Math.round(gradeLevel)} - consider simplifying`,
        suggestion: 'Use shorter sentences and simpler words',
        category: 'readability',
        confidence: 70,
      });
    }
    
    // Check sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 30) {
        violations.push({
          id: uuid(),
          agentId: 'accessibility',
          severity: 'warning',
          message: `Long sentence (${wordCount} words) - may be hard to read`,
          suggestion: 'Break into shorter sentences (aim for under 25 words)',
          location: {
            start: content.indexOf(sentence),
            end: content.indexOf(sentence) + sentence.length,
            text: sentence.substring(0, 50) + '...',
          },
          category: 'readability',
          confidence: 80,
        });
      }
    }
    
    return violations;
  },
  
  calculateScore(violations: ValidationViolation[]): number {
    if (violations.length === 0) return 100;
    
    let deduction = 0;
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          deduction += 30;
          break;
        case 'error':
          deduction += 15;
          break;
        case 'warning':
          deduction += 6;
          break;
        case 'info':
          deduction += 2;
          break;
      }
    }
    
    return Math.max(0, 100 - deduction);
  },
};

// Export reading level utility
export { calculateReadingLevel };
