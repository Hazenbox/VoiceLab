/**
 * Auto-Fix Engine
 * 
 * Automatically suggests and applies fixes for content violations.
 * 
 * UNIFIED SOURCE: Imports vocabulary alternatives from vocabulary.ts
 * to ensure all terms work with the auto-fix preview feature.
 */

import type { AutoFix, Violation } from '../../types';
import { runQuickValidation } from '../validation/validationPipeline';
import { SIMPLE_ALTERNATIVES, GENDER_NEUTRAL_ALTERNATIVES } from '../guidelines/vocabulary';

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
 * Build vocabulary-based replacements from single source of truth
 * 
 * Imports SIMPLE_ALTERNATIVES (24 terms) and GENDER_NEUTRAL_ALTERNATIVES (17 terms)
 * from vocabulary.ts to ensure the auto-fix engine can generate fixes for all
 * vocabulary terms, enabling the side-by-side preview.
 */
const VOCABULARY_REPLACEMENTS: Record<string, { replacement: string; confidence: number }> = {};

// Add SIMPLE_ALTERNATIVES with 0.90 confidence (e.g., utilize -> use)
for (const [from, to] of Object.entries(SIMPLE_ALTERNATIVES)) {
  VOCABULARY_REPLACEMENTS[from.toLowerCase()] = { replacement: to, confidence: 0.90 };
}

// Add GENDER_NEUTRAL_ALTERNATIVES with 0.95 confidence (higher priority)
for (const [from, to] of Object.entries(GENDER_NEUTRAL_ALTERNATIVES)) {
  VOCABULARY_REPLACEMENTS[from.toLowerCase()] = { replacement: to, confidence: 0.95 };
}

/**
 * Common replacements - High-confidence word substitutions
 * 
 * MERGED FROM:
 * 1. VOCABULARY_REPLACEMENTS (from vocabulary.ts) - SINGLE SOURCE OF TRUTH
 * 2. Manual overrides below for specific confidence scores or additional terms
 * 
 * Rules:
 * - Only include replacements with confidence >= 0.80
 * - Confidence reflects how safe it is to auto-apply without human review
 * - All keys should be lowercase (matching is case-insensitive)
 */
const REPLACEMENTS: Record<string, { replacement: string; confidence: number }> = {
  // === Import all vocabulary alternatives (SINGLE SOURCE OF TRUTH) ===
  ...VOCABULARY_REPLACEMENTS,
  
  // === Manual overrides with specific confidence scores ===
  // (These override vocabulary.ts values where we need higher/lower confidence)
  
  // Gender-neutral - higher confidence for professional terms
  'fireman': { replacement: 'firefighter', confidence: 0.98 },
  'policeman': { replacement: 'police officer', confidence: 0.98 },
  'mailman': { replacement: 'mail carrier', confidence: 0.98 },
  
  // === Additional terms NOT in vocabulary.ts ===
  
  // Disability-Inclusive Language
  'wheelchair-bound': { replacement: 'wheelchair user', confidence: 0.95 },
  'wheelchair bound': { replacement: 'wheelchair user', confidence: 0.95 },
  'the disabled': { replacement: 'people with disabilities', confidence: 0.90 },
  'handicapped': { replacement: 'person with a disability', confidence: 0.90 },
  
  // Jargon variants
  'utilise': { replacement: 'use', confidence: 0.95 },
  'avail': { replacement: 'get', confidence: 0.90 },
  'availing': { replacement: 'getting', confidence: 0.90 },
  'availed': { replacement: 'got', confidence: 0.90 },
  
  // Wordy phrases
  'in order to': { replacement: 'to', confidence: 0.98 },
  'at this point in time': { replacement: 'now', confidence: 0.98 },
  'due to the fact that': { replacement: 'because', confidence: 0.98 },
  'for the purpose of': { replacement: 'to', confidence: 0.95 },
  'in the event that': { replacement: 'if', confidence: 0.95 },
  'with regard to': { replacement: 'about', confidence: 0.90 },
  'pursuant to': { replacement: 'following', confidence: 0.90 },
  'in accordance with': { replacement: 'following', confidence: 0.90 },
  
  // Accessibility (Link Text)
  'click here': { replacement: 'view details', confidence: 0.85 },
  'tap here': { replacement: 'view details', confidence: 0.85 },
  
  // Brand Capitalization
  'jio': { replacement: 'Jio', confidence: 0.99 },
  'JIO': { replacement: 'Jio', confidence: 0.99 },
  
  // Currency (Indian Format)
  'Rs.': { replacement: '₹', confidence: 0.98 },
  'Rs ': { replacement: '₹', confidence: 0.98 },
  'INR ': { replacement: '₹', confidence: 0.95 },
  
  // British Spellings
  'color': { replacement: 'colour', confidence: 0.90 },
  'favorite': { replacement: 'favourite', confidence: 0.90 },
  'organize': { replacement: 'organise', confidence: 0.90 },
  'realize': { replacement: 'realise', confidence: 0.90 },
  'recognize': { replacement: 'recognise', confidence: 0.90 },
  'customize': { replacement: 'customise', confidence: 0.90 },
  'center': { replacement: 'centre', confidence: 0.90 },
  'behavior': { replacement: 'behaviour', confidence: 0.90 },
  'analyze': { replacement: 'analyse', confidence: 0.90 },
  'canceled': { replacement: 'cancelled', confidence: 0.90 },
};

/**
 * Dynamic replacement rule from Convex (admin-managed)
 */
export interface DynamicReplacement {
  from: string;
  to: string;
}

/**
 * Generate auto-fixes for violations
 * 
 * @param violations - Array of violations to generate fixes for
 * @param dynamicReplacements - Optional array of admin-managed rules from Convex
 *                              These are merged with static REPLACEMENTS (Convex rules take priority)
 */
export function generateAutoFixes(
  violations: Violation[],
  dynamicReplacements?: DynamicReplacement[]
): AutoFix[] {
  const fixes: AutoFix[] = [];
  
  // Build merged replacements: Convex dynamic rules override static ones
  const mergedReplacements: Record<string, { replacement: string; confidence: number }> = { ...REPLACEMENTS };
  
  if (dynamicReplacements && dynamicReplacements.length > 0) {
    for (const rule of dynamicReplacements) {
      // Skip rules with missing from/to values
      if (!rule.from || !rule.to) {
        console.warn('[AutoFix] Skipping invalid Convex rule:', rule);
        continue;
      }
      // Convex admin rules get 0.92 confidence (higher than vocabulary but lower than brand rules)
      mergedReplacements[rule.from.toLowerCase()] = { 
        replacement: rule.to, 
        confidence: 0.92 
      };
    }
  }
  
  for (const violation of violations) {
    if (!violation.autoFixable) continue;
    
    // Skip violations with missing text
    if (!violation.text) {
      console.warn('[AutoFix] Skipping violation with missing text:', violation);
      continue;
    }
    
    const text = violation.text.toLowerCase();
    const directFix = mergedReplacements[text];
    
    // Debug: log lookup attempts
    console.log('[AutoFix] Looking up:', { text, found: !!directFix, suggestion: violation.suggestion?.substring(0, 50) });
    
    if (directFix) {
      fixes.push({
        original: violation.text,
        replacement: matchCase(violation.text, directFix.replacement),
        confidence: directFix.confidence,
        rule: violation.rule,
        violation,
      });
    } else if (violation.suggestion && violation.suggestion.length < 50) {
      // Try to extract replacement from suggestion (format: "Replace X with: Y")
      const suggestionMatch = violation.suggestion.match(/Replace\s+["']?[^"']+["']?\s+with:\s*(.+)/i);
      if (suggestionMatch) {
        const suggestedReplacement = suggestionMatch[1].trim();
        fixes.push({
          original: violation.text,
          replacement: matchCase(violation.text, suggestedReplacement),
          confidence: 0.75,
          rule: violation.rule,
          violation,
        });
      } else {
        // Fallback to raw suggestion
        fixes.push({
          original: violation.text,
          replacement: violation.suggestion,
          confidence: 0.7,
          rule: violation.rule,
          violation,
        });
      }
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
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply auto-fixes to content
 * 
 * IMPORTANT: Uses global regex replacement to fix ALL occurrences of a word,
 * not just the first one. This is critical for content with repeated violations.
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
    .slice(0, 20); // Increased from 10 to 20 to handle more violations
  
  for (const fix of sortedFixes) {
    // Use global, case-insensitive regex to replace ALL occurrences
    // Critical fix: String.replace() only replaces the first occurrence!
    const escapedOriginal = escapeRegex(fix.original);
    const regex = new RegExp(escapedOriginal, 'gi');
    const newContent = fixedContent.replace(regex, (match) => {
      // Preserve the case of the original match
      return matchCase(match, fix.replacement);
    });
    
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
