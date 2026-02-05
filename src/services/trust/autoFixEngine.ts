/**
 * Auto-Fix Engine
 * 
 * Automatically suggests and applies fixes for content violations.
 */

import type { AutoFix, Violation } from '../../types';
import { runQuickValidation } from '../validation/validationPipeline';

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  originalContent: string;
  fixedContent: string;
  appliedFixes: AutoFix[];
  skippedFixes: AutoFix[];
  scoreImprovement: number;
  newScore: number;
}

/**
 * Common replacements
 */
const REPLACEMENTS: Record<string, { replacement: string; confidence: number }> = {
  'chairman': { replacement: 'chairperson', confidence: 0.95 },
  'chairwoman': { replacement: 'chairperson', confidence: 0.95 },
  'businessman': { replacement: 'businessperson', confidence: 0.95 },
  'businesswoman': { replacement: 'businessperson', confidence: 0.95 },
  'fireman': { replacement: 'firefighter', confidence: 0.98 },
  'policeman': { replacement: 'police officer', confidence: 0.98 },
  'mailman': { replacement: 'mail carrier', confidence: 0.98 },
  'mankind': { replacement: 'humankind', confidence: 0.90 },
  'manpower': { replacement: 'workforce', confidence: 0.90 },
  'wheelchair-bound': { replacement: 'wheelchair user', confidence: 0.95 },
  'the disabled': { replacement: 'people with disabilities', confidence: 0.90 },
  'utilize': { replacement: 'use', confidence: 0.95 },
  'facilitate': { replacement: 'help', confidence: 0.90 },
  'leverage': { replacement: 'use', confidence: 0.85 },
  'jio': { replacement: 'Jio', confidence: 0.99 },
  'JIO': { replacement: 'Jio', confidence: 0.99 },
  'in order to': { replacement: 'to', confidence: 0.98 },
};

/**
 * Generate auto-fixes for violations
 */
export function generateAutoFixes(violations: Violation[]): AutoFix[] {
  const fixes: AutoFix[] = [];
  
  for (const violation of violations) {
    if (!violation.autoFixable) continue;
    
    const text = violation.text.toLowerCase();
    const directFix = REPLACEMENTS[text];
    
    if (directFix) {
      fixes.push({
        original: violation.text,
        replacement: matchCase(violation.text, directFix.replacement),
        confidence: directFix.confidence,
        rule: violation.rule,
        violation,
      });
    } else if (violation.suggestion.length < 50) {
      fixes.push({
        original: violation.text,
        replacement: violation.suggestion,
        confidence: 0.7,
        rule: violation.rule,
        violation,
      });
    }
  }
  
  return fixes;
}

/**
 * Match case of replacement to original
 */
function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement.toLowerCase();
}

/**
 * Apply auto-fixes to content
 */
export function applyAutoFixes(
  content: string,
  fixes: AutoFix[],
  minConfidence: number = 0.8
): AutoFixResult {
  let fixedContent = content;
  const appliedFixes: AutoFix[] = [];
  const skippedFixes: AutoFix[] = [];
  
  const sortedFixes = [...fixes]
    .filter(f => f.confidence >= minConfidence)
    .slice(0, 10);
  
  for (const fix of sortedFixes) {
    const newContent = fixedContent.replace(fix.original, fix.replacement);
    
    if (newContent !== fixedContent) {
      fixedContent = newContent;
      appliedFixes.push(fix);
    }
  }
  
  const skipped = fixes.filter(f => f.confidence < minConfidence);
  skippedFixes.push(...skipped);
  
  // Calculate improvement
  const originalValidation = runQuickValidation(content);
  const newValidation = runQuickValidation(fixedContent);
  
  return {
    originalContent: content,
    fixedContent,
    appliedFixes,
    skippedFixes,
    scoreImprovement: newValidation.overallScore - originalValidation.overallScore,
    newScore: newValidation.overallScore,
  };
}

/**
 * Preview fixes without applying
 */
export function previewAutoFixes(
  violations: Violation[],
  minConfidence: number = 0.8
): {
  fixes: AutoFix[];
  estimatedImprovement: number;
  fixableCount: number;
  totalViolations: number;
} {
  const fixes = generateAutoFixes(violations);
  const fixable = fixes.filter(f => f.confidence >= minConfidence);
  
  const avgConfidence = fixable.length > 0
    ? fixable.reduce((sum, f) => sum + f.confidence, 0) / fixable.length
    : 0;
  
  const estimatedImprovement = Math.min(30, fixable.length * avgConfidence * 4);
  
  return {
    fixes,
    estimatedImprovement: Math.round(estimatedImprovement),
    fixableCount: fixable.length,
    totalViolations: violations.length,
  };
}

export default {
  generateAutoFixes,
  applyAutoFixes,
  previewAutoFixes,
};
