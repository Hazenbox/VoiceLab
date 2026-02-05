/**
 * Compliance Validation Agent
 * 
 * Ensures content complies with Indian regulations, TRAI guidelines,
 * advertising standards, and Jio brand rules.
 * 
 * @module services/validation/agents/complianceAgent
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Pattern rules for compliance checking
 */
const COMPLIANCE_PATTERNS: PatternRule[] = [
  // False claims / misleading
  {
    id: 'cp-001',
    pattern: /\b(guaranteed|100%|always|never\s+fails|foolproof)\b/gi,
    severity: 'error',
    message: 'Absolute claim may be misleading',
    suggestion: 'Use qualified language like "typically" or "in most cases"',
    category: 'claims',
  },
  {
    id: 'cp-002',
    pattern: /\b(best\s+in\s+India|number\s+one|#1|fastest\s+in\s+the\s+country)\b/gi,
    severity: 'warning',
    message: 'Superlative claim requires substantiation',
    suggestion: 'Add source citation or qualify the claim',
    category: 'superlatives',
  },
  {
    id: 'cp-003',
    pattern: /\b(free|unlimited)\b(?!\s*\*)/gi,
    severity: 'warning',
    message: '"Free" or "Unlimited" claims need terms & conditions',
    suggestion: 'Add asterisk and T&C reference',
    category: 'claims',
  },
  // TRAI compliance
  {
    id: 'cp-004',
    pattern: /\b(network\s+coverage|signal\s+strength)\s+(everywhere|100%|complete)\b/gi,
    severity: 'error',
    message: 'Network coverage claims must be accurate',
    suggestion: 'Specify coverage area or add conditions',
    category: 'telecom',
  },
  {
    id: 'cp-005',
    pattern: /\b(data\s+speed|download\s+speed)\s+(\d+\s*(?:mbps|gbps))\b/gi,
    severity: 'warning',
    message: 'Speed claims should mention "up to"',
    suggestion: 'Add "up to" before speed figures',
    category: 'telecom',
  },
  // Price compliance
  {
    id: 'cp-006',
    pattern: /\b(starting\s+at|from)\s+(?:rs\.?|₹)\s*\d+\b/gi,
    severity: 'info',
    message: 'Price mention - ensure accuracy and currency',
    suggestion: 'Verify price is current and inclusive of taxes',
    category: 'pricing',
  },
  {
    id: 'cp-007',
    pattern: /\b(\d+%\s+off|discount|sale)\b/gi,
    severity: 'info',
    message: 'Discount claim - ensure validity period is mentioned',
    suggestion: 'Add validity period and T&C',
    category: 'pricing',
  },
  // Competitor claims
  {
    id: 'cp-008',
    pattern: /\b(airtel|vodafone|idea|vi|bsnl|mtnl)\s+(is|are)\s+(bad|poor|slow|worse)\b/gi,
    severity: 'critical',
    message: 'Direct competitor disparagement - remove',
    suggestion: 'Remove competitor references',
    category: 'competitors',
  },
  {
    id: 'cp-009',
    pattern: /\b(better\s+than|beats|faster\s+than)\s+(airtel|vodafone|vi|bsnl)\b/gi,
    severity: 'error',
    message: 'Comparative advertising requires proof',
    suggestion: 'Remove or add substantiation source',
    category: 'competitors',
  },
  // Privacy & data
  {
    id: 'cp-010',
    pattern: /\b(we\s+collect|we\s+share|we\s+sell)\s+(your\s+)?data\b/gi,
    severity: 'warning',
    message: 'Data collection statement - ensure compliance',
    suggestion: 'Reference privacy policy',
    category: 'privacy',
  },
  {
    id: 'cp-011',
    pattern: /\b(personal\s+information|contact\s+details|phone\s+number)\s+(required|needed|mandatory)\b/gi,
    severity: 'info',
    message: 'Personal data request - explain purpose',
    suggestion: 'Add purpose and privacy reference',
    category: 'privacy',
  },
  // Financial compliance
  {
    id: 'cp-012',
    pattern: /\b(investment|returns|profit)\s+(guaranteed|assured|certain)\b/gi,
    severity: 'critical',
    message: 'Financial guarantee claim - not allowed',
    suggestion: 'Add standard financial disclaimer',
    category: 'financial',
  },
  {
    id: 'cp-013',
    pattern: /\b(earn\s+money|make\s+money|get\s+rich)\s+(fast|quick|easy)\b/gi,
    severity: 'error',
    message: 'Get-rich-quick language - remove',
    suggestion: 'Use realistic earning descriptions',
    category: 'financial',
  },
  // Health claims
  {
    id: 'cp-014',
    pattern: /\b(cure|treat|heal|prevent)\s+(disease|illness|covid|corona)\b/gi,
    severity: 'critical',
    message: 'Health claim - requires medical substantiation',
    suggestion: 'Remove health claims or add medical disclaimer',
    category: 'health',
  },
  // Urgency tactics
  {
    id: 'cp-015',
    pattern: /\b(act\s+now|limited\s+time|hurry|last\s+chance|ending\s+soon)\b/gi,
    severity: 'info',
    message: 'Urgency language - ensure authenticity',
    suggestion: 'Only use if genuinely time-limited',
    category: 'urgency',
  },
  // Contact info
  {
    id: 'cp-016',
    pattern: /\b(\d{10})\b/g,
    severity: 'info',
    message: 'Phone number detected - verify accuracy',
    suggestion: 'Ensure number is current and correct',
    category: 'contact',
  },
];

/**
 * Compliance Validation Agent
 */
export const complianceAgent: ValidationAgent = {
  id: 'compliance',
  name: 'Compliance Check',
  description: 'Ensures content complies with regulations and brand guidelines',
  weight: 15,
  patterns: COMPLIANCE_PATTERNS,
  
  runPatternValidation(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    for (const rule of COMPLIANCE_PATTERNS) {
      const matches = content.matchAll(rule.pattern);
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            id: uuid(),
            agentId: 'compliance',
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
    
    return violations;
  },
  
  calculateScore(violations: ValidationViolation[]): number {
    if (violations.length === 0) return 100;
    
    let deduction = 0;
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          deduction += 35;
          break;
        case 'error':
          deduction += 18;
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
