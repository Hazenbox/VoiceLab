/**
 * Cultural Sensitivity Validation Agent
 * 
 * Ensures content respects Indian cultural diversity, religious sentiments,
 * and regional sensitivities.
 * 
 * @module services/validation/agents/culturalSensitivityAgent
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Pattern rules for cultural sensitivity
 */
const CULTURAL_PATTERNS: PatternRule[] = [
  // Religious sensitivity
  {
    id: 'cs-001',
    pattern: /\b(beef|pork)\s+(burger|dish|meal|food|recipe)\b/gi,
    severity: 'warning',
    message: 'Sensitive food reference - be mindful of dietary restrictions',
    suggestion: 'Consider using vegetarian alternatives in examples',
    category: 'food',
  },
  {
    id: 'cs-002',
    pattern: /\b(alcohol|liquor|beer|wine|whisky)\s+(offer|deal|promotion|discount)\b/gi,
    severity: 'warning',
    message: 'Alcohol promotions need careful handling',
    suggestion: 'Ensure compliance with advertising regulations',
    category: 'alcohol',
  },
  {
    id: 'cs-003',
    pattern: /\b(holy|sacred|god|gods|goddess|temple|mosque|church|gurudwara)\b/gi,
    severity: 'info',
    message: 'Religious reference detected - ensure respectful usage',
    suggestion: 'Review for appropriate religious context',
    category: 'religion',
  },
  // Caste sensitivity
  {
    id: 'cs-004',
    pattern: /\b(caste|untouchable|dalit|brahmin|kshatriya|vaishya|shudra)\b/gi,
    severity: 'error',
    message: 'Caste-related term detected - avoid unless absolutely necessary',
    suggestion: 'Remove caste references from marketing content',
    category: 'caste',
  },
  {
    id: 'cs-005',
    pattern: /\b(upper[-\s]?class|lower[-\s]?class|high[-\s]?born|low[-\s]?born)\b/gi,
    severity: 'error',
    message: 'Class hierarchy language - remove immediately',
    suggestion: 'Use neutral socioeconomic terms',
    category: 'class',
  },
  // Regional sensitivity
  {
    id: 'cs-006',
    pattern: /\b(north[-\s]?indian|south[-\s]?indian)\s+(is|are)\s+(better|superior|inferior)\b/gi,
    severity: 'critical',
    message: 'Regional comparison - remove immediately',
    suggestion: 'Remove regional comparison',
    category: 'regional',
  },
  {
    id: 'cs-007',
    pattern: /\b(madrasi|bhaiya|chinki|mallu)\b/gi,
    severity: 'critical',
    message: 'Regional slur detected - remove immediately',
    suggestion: 'Use proper regional demonyms',
    category: 'slurs',
  },
  // Stereotypes
  {
    id: 'cs-008',
    pattern: /\b(marwari|gujarati|punjabi|bengali|south\s+indian)\s+(are|is)\s+(always|typically|known\s+for)\b/gi,
    severity: 'warning',
    message: 'Potential regional stereotype',
    suggestion: 'Avoid generalizing about regional groups',
    category: 'stereotypes',
  },
  // Festival sensitivity
  {
    id: 'cs-009',
    pattern: /\b(happy\s+diwali|eid\s+mubarak|merry\s+christmas|happy\s+holi)\b/gi,
    severity: 'info',
    message: 'Festival greeting - ensure inclusive messaging',
    suggestion: 'Consider including multiple festival greetings if seasonal',
    category: 'festivals',
  },
  // Political sensitivity
  {
    id: 'cs-010',
    pattern: /\b(political\s+party|election|vote\s+for|congress|bjp|aap|communist)\b/gi,
    severity: 'critical',
    message: 'Political reference - avoid in brand communications',
    suggestion: 'Remove political references',
    category: 'political',
  },
  // Nationalism sensitivity
  {
    id: 'cs-011',
    pattern: /\b(anti[-\s]?national|deshdrohi|patriot|nationalist)\b/gi,
    severity: 'error',
    message: 'Politically charged term - avoid',
    suggestion: 'Remove politically charged language',
    category: 'political',
  },
  // Body image sensitivity
  {
    id: 'cs-012',
    pattern: /\b(fair\s+skin|dark\s+skin|complexion|gora|kaala)\b/gi,
    severity: 'error',
    message: 'Colorism-related term detected',
    suggestion: 'Avoid skin color references',
    category: 'colorism',
  },
  // Marriage/relationship sensitivity
  {
    id: 'cs-013',
    pattern: /\b(bachelor|spinster|unmarried|married\s+life)\s+(problem|issue|better|worse)\b/gi,
    severity: 'warning',
    message: 'Marital status judgment - be neutral',
    suggestion: 'Remove marital status judgments',
    category: 'relationships',
  },
];

/**
 * Cultural Sensitivity Validation Agent
 */
export const culturalSensitivityAgent: ValidationAgent = {
  id: 'cultural_sensitivity',
  name: 'Cultural Sensitivity',
  description: 'Ensures content respects Indian cultural diversity and regional sensitivities',
  weight: 15,
  patterns: CULTURAL_PATTERNS,
  
  runPatternValidation(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    for (const rule of CULTURAL_PATTERNS) {
      const matches = content.matchAll(rule.pattern);
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            id: uuid(),
            agentId: 'cultural_sensitivity',
            severity: rule.severity,
            message: rule.message,
            suggestion: rule.suggestion,
            location: {
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
            },
            category: rule.category,
            confidence: 80,
          });
        }
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
          deduction += 40;
          break;
        case 'error':
          deduction += 20;
          break;
        case 'warning':
          deduction += 8;
          break;
        case 'info':
          deduction += 2;
          break;
      }
    }
    
    return Math.max(0, 100 - deduction);
  },
};
