/**
 * Auto-Fix Engine
 * 
 * Automatically suggests and applies fixes for content violations.
 * Supports confidence levels and re-validation after fixes.
 * 
 * @module services/trust/autoFixEngine
 */

import type { AutoFix, Violation, GenerationContext } from '../../types';
import type { ValidationViolation, ValidationAgentId } from '../validation/types';
import { runQuickValidation } from '../validation/validationPipeline';
import { v4 as uuid } from 'uuid';

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  originalContent: string;
  fixedContent: string;
  appliedFixes: AppliedFix[];
  skippedFixes: SkippedFix[];
  scoreImprovement: number;
  newScore: number;
}

/**
 * Applied fix details
 */
export interface AppliedFix {
  id: string;
  violationId: string;
  original: string;
  replacement: string;
  confidence: number;
  agentId: ValidationAgentId;
}

/**
 * Skipped fix details
 */
export interface SkippedFix {
  violationId: string;
  reason: string;
  agentId: ValidationAgentId;
}

/**
 * Fix configuration
 */
export interface AutoFixConfig {
  minConfidence: number;      // Minimum confidence to apply fix (0-100)
  maxFixes: number;           // Maximum fixes to apply
  revalidate: boolean;        // Re-run validation after fixing
  preserveIntent: boolean;    // Try to preserve original meaning
}

const DEFAULT_FIX_CONFIG: AutoFixConfig = {
  minConfidence: 80,
  maxFixes: 10,
  revalidate: true,
  preserveIntent: true,
};

/**
 * Common replacements for auto-fix
 */
const REPLACEMENT_MAP: Record<string, { replacement: string; confidence: number }> = {
  // Gender neutrality fixes
  'chairman': { replacement: 'chairperson', confidence: 95 },
  'chairwoman': { replacement: 'chairperson', confidence: 95 },
  'businessman': { replacement: 'businessperson', confidence: 95 },
  'businesswoman': { replacement: 'businessperson', confidence: 95 },
  'fireman': { replacement: 'firefighter', confidence: 98 },
  'policeman': { replacement: 'police officer', confidence: 98 },
  'mailman': { replacement: 'mail carrier', confidence: 98 },
  'stewardess': { replacement: 'flight attendant', confidence: 98 },
  'steward': { replacement: 'flight attendant', confidence: 90 },
  'salesman': { replacement: 'salesperson', confidence: 95 },
  'saleswoman': { replacement: 'salesperson', confidence: 95 },
  'salesgirl': { replacement: 'sales associate', confidence: 98 },
  'mankind': { replacement: 'humankind', confidence: 90 },
  'manpower': { replacement: 'workforce', confidence: 90 },
  'man-made': { replacement: 'artificial', confidence: 85 },
  
  // Disability inclusion fixes
  'wheelchair-bound': { replacement: 'wheelchair user', confidence: 95 },
  'wheelchair bound': { replacement: 'wheelchair user', confidence: 95 },
  'confined to a wheelchair': { replacement: 'uses a wheelchair', confidence: 95 },
  'the disabled': { replacement: 'people with disabilities', confidence: 90 },
  'handicapped person': { replacement: 'person with a disability', confidence: 90 },
  'disabled person': { replacement: 'person with a disability', confidence: 85 },
  'suffers from': { replacement: 'has', confidence: 85 },
  'afflicted with': { replacement: 'has', confidence: 85 },
  'victim of': { replacement: 'person with', confidence: 85 },
  'special needs': { replacement: 'disabilities', confidence: 80 },
  'differently abled': { replacement: 'disabled', confidence: 80 },
  'specially abled': { replacement: 'disabled', confidence: 80 },
  
  // Style fixes
  'utilize': { replacement: 'use', confidence: 95 },
  'facilitate': { replacement: 'help', confidence: 90 },
  'optimize': { replacement: 'improve', confidence: 85 },
  'streamline': { replacement: 'simplify', confidence: 85 },
  'leverage': { replacement: 'use', confidence: 85 },
  'synergy': { replacement: 'teamwork', confidence: 80 },
  'paradigm': { replacement: 'model', confidence: 80 },
  'holistic': { replacement: 'complete', confidence: 80 },
  'in order to': { replacement: 'to', confidence: 98 },
  'due to the fact that': { replacement: 'because', confidence: 98 },
  'at this point in time': { replacement: 'now', confidence: 98 },
  'going forward': { replacement: 'from now on', confidence: 85 },
  
  // Jio brand fixes
  'jio': { replacement: 'Jio', confidence: 99 },
  'JIO': { replacement: 'Jio', confidence: 99 },
  'Jio Fiber': { replacement: 'JioFiber', confidence: 95 },
  'jio fiber': { replacement: 'JioFiber', confidence: 95 },
  
  // Accessibility fixes
  'click here': { replacement: 'select this option', confidence: 75 },
  'tap here': { replacement: 'select this option', confidence: 75 },
};

/**
 * Generate auto-fix suggestions for violations
 */
export function generateAutoFixes(violations: ValidationViolation[]): AutoFix[] {
  const fixes: AutoFix[] = [];
  
  for (const violation of violations) {
    const fix = generateFixForViolation(violation);
    if (fix) {
      fixes.push(fix);
    }
  }
  
  return fixes;
}

/**
 * Generate fix for a single violation
 */
function generateFixForViolation(violation: ValidationViolation): AutoFix | null {
  if (!violation.location) return null;
  
  const originalText = violation.location.text.toLowerCase();
  
  // Check direct replacement map
  const directFix = REPLACEMENT_MAP[originalText];
  if (directFix) {
    // Preserve original casing
    const replacement = matchCase(violation.location.text, directFix.replacement);
    
    return {
      id: uuid(),
      violationId: violation.id,
      original: violation.location.text,
      replacement,
      confidence: directFix.confidence,
      description: violation.message,
    };
  }
  
  // Use suggestion from violation if available
  if (violation.suggestion && violation.suggestion.length < 50) {
    return {
      id: uuid(),
      violationId: violation.id,
      original: violation.location.text,
      replacement: violation.suggestion,
      confidence: 70, // Lower confidence for general suggestions
      description: violation.message,
    };
  }
  
  return null;
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
  config: Partial<AutoFixConfig> = {}
): AutoFixResult {
  const fullConfig = { ...DEFAULT_FIX_CONFIG, ...config };
  
  let fixedContent = content;
  const appliedFixes: AppliedFix[] = [];
  const skippedFixes: SkippedFix[] = [];
  
  // Sort fixes by position (reverse order to preserve indices)
  const sortedFixes = [...fixes]
    .filter(f => f.confidence >= fullConfig.minConfidence)
    .sort((a, b) => {
      // We need location info to sort, skip if not available
      return 0;
    })
    .slice(0, fullConfig.maxFixes);
  
  // Apply fixes
  for (const fix of sortedFixes) {
    if (fix.confidence < fullConfig.minConfidence) {
      skippedFixes.push({
        violationId: fix.violationId,
        reason: `Confidence too low (${fix.confidence}% < ${fullConfig.minConfidence}%)`,
        agentId: 'style_grammar', // Default
      });
      continue;
    }
    
    // Apply the fix
    const newContent = fixedContent.replace(fix.original, fix.replacement);
    
    if (newContent !== fixedContent) {
      fixedContent = newContent;
      appliedFixes.push({
        id: fix.id,
        violationId: fix.violationId,
        original: fix.original,
        replacement: fix.replacement,
        confidence: fix.confidence,
        agentId: 'style_grammar', // Default, could be enhanced
      });
    }
  }
  
  // Calculate score improvement
  let scoreImprovement = 0;
  let newScore = 100;
  
  if (fullConfig.revalidate && appliedFixes.length > 0) {
    const originalValidation = runQuickValidation(content);
    const newValidation = runQuickValidation(fixedContent);
    
    scoreImprovement = newValidation.overallScore - originalValidation.overallScore;
    newScore = newValidation.overallScore;
  }
  
  return {
    originalContent: content,
    fixedContent,
    appliedFixes,
    skippedFixes,
    scoreImprovement,
    newScore,
  };
}

/**
 * Preview fixes without applying
 */
export function previewAutoFixes(
  content: string,
  violations: ValidationViolation[],
  config: Partial<AutoFixConfig> = {}
): {
  fixes: AutoFix[];
  estimatedImprovement: number;
  fixableCount: number;
  totalViolations: number;
} {
  const fullConfig = { ...DEFAULT_FIX_CONFIG, ...config };
  const fixes = generateAutoFixes(violations);
  
  const fixable = fixes.filter(f => f.confidence >= fullConfig.minConfidence);
  
  // Estimate improvement based on fix count and confidence
  const avgConfidence = fixable.length > 0
    ? fixable.reduce((sum, f) => sum + f.confidence, 0) / fixable.length
    : 0;
  
  // Rough estimate: each high-confidence fix improves score by ~3-5 points
  const estimatedImprovement = Math.min(
    30, // Cap at 30 points improvement
    fixable.length * (avgConfidence / 100) * 4
  );
  
  return {
    fixes,
    estimatedImprovement: Math.round(estimatedImprovement),
    fixableCount: fixable.length,
    totalViolations: violations.length,
  };
}

/**
 * Get fix preview for UI display
 */
export function getFixPreview(fix: AutoFix): {
  before: string;
  after: string;
  confidence: string;
  confidenceLevel: 'high' | 'medium' | 'low';
} {
  return {
    before: fix.original,
    after: fix.replacement,
    confidence: `${fix.confidence}%`,
    confidenceLevel: fix.confidence >= 90 ? 'high' : fix.confidence >= 70 ? 'medium' : 'low',
  };
}

/**
 * Apply a single fix
 */
export function applySingleFix(content: string, fix: AutoFix): string {
  return content.replace(fix.original, fix.replacement);
}

/**
 * Undo a fix (revert)
 */
export function undoFix(content: string, appliedFix: AppliedFix): string {
  return content.replace(appliedFix.replacement, appliedFix.original);
}

export default {
  generateAutoFixes,
  applyAutoFixes,
  previewAutoFixes,
  getFixPreview,
  applySingleFix,
  undoFix,
};
