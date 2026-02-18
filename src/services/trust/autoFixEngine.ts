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
  
  // Wordy phrases - Complex Words category
  'in order to': { replacement: 'to', confidence: 0.98 },
  'at this point in time': { replacement: 'now', confidence: 0.98 },
  'due to the fact that': { replacement: 'because', confidence: 0.98 },
  'for the purpose of': { replacement: 'to', confidence: 0.95 },
  'in the event that': { replacement: 'if', confidence: 0.95 },
  'with regard to': { replacement: 'about', confidence: 0.90 },
  'pursuant to': { replacement: 'following', confidence: 0.90 },
  'in accordance with': { replacement: 'following', confidence: 0.90 },
  'as a matter of fact': { replacement: 'actually', confidence: 0.95 },
  'it should be noted that': { replacement: 'note that', confidence: 0.95 },
  'in lieu of': { replacement: 'instead of', confidence: 0.95 },
  'with respect to': { replacement: 'about', confidence: 0.90 },
  'pertaining to': { replacement: 'about', confidence: 0.90 },
  'notwithstanding': { replacement: 'despite', confidence: 0.90 },
  
  // Marketing jargon - Simplification category
  // Compound phrases (hyphenated AND space variants)
  'best-in-class': { replacement: 'excellent', confidence: 0.95 },
  'best in class': { replacement: 'excellent', confidence: 0.95 },
  'world-class': { replacement: 'excellent', confidence: 0.95 },
  'world class': { replacement: 'excellent', confidence: 0.95 },
  'state-of-the-art': { replacement: 'modern', confidence: 0.95 },
  'state of the art': { replacement: 'modern', confidence: 0.95 },
  'cutting-edge': { replacement: 'advanced', confidence: 0.95 },
  'cutting edge': { replacement: 'advanced', confidence: 0.95 },
  'high-end': { replacement: 'premium', confidence: 0.90 },
  'high end': { replacement: 'premium', confidence: 0.90 },
  'tech-savvy': { replacement: 'comfortable with technology', confidence: 0.90 },
  'tech savvy': { replacement: 'comfortable with technology', confidence: 0.90 },
  'low-hanging fruit': { replacement: 'easy wins', confidence: 0.90 },
  'low hanging fruit': { replacement: 'easy wins', confidence: 0.90 },
  
  // Single-word buzzwords
  'synergy': { replacement: 'working together', confidence: 0.90 },
  'paradigm': { replacement: 'approach', confidence: 0.90 },
  'bandwidth': { replacement: 'capacity', confidence: 0.85 },
  'seamless': { replacement: 'smooth', confidence: 0.90 },
  'frictionless': { replacement: 'easy', confidence: 0.90 },
  'robust': { replacement: 'strong', confidence: 0.85 },
  'scalable': { replacement: 'flexible', confidence: 0.85 },
  
  // Multi-word phrases (with space and hyphen variants)
  'deep dive': { replacement: 'detailed look', confidence: 0.90 },
  'deep-dive': { replacement: 'detailed look', confidence: 0.90 },
  'circle back': { replacement: 'follow up', confidence: 0.90 },
  'circle-back': { replacement: 'follow up', confidence: 0.90 },
  'touch base': { replacement: 'connect', confidence: 0.90 },
  'touch-base': { replacement: 'connect', confidence: 0.90 },
  'move the needle': { replacement: 'make progress', confidence: 0.90 },
  
  // Verb variants - streamline
  'streamline': { replacement: 'simplify', confidence: 0.90 },
  'streamlined': { replacement: 'simplified', confidence: 0.90 },
  'streamlining': { replacement: 'simplifying', confidence: 0.90 },
  'streamlines': { replacement: 'simplifies', confidence: 0.90 },
  
  // Verb variants - optimize
  'optimize': { replacement: 'improve', confidence: 0.90 },
  'optimized': { replacement: 'improved', confidence: 0.90 },
  'optimizing': { replacement: 'improving', confidence: 0.90 },
  'optimizes': { replacement: 'improves', confidence: 0.90 },
  
  // Verb variants - leverage
  'leverage': { replacement: 'use', confidence: 0.90 },
  'leveraged': { replacement: 'used', confidence: 0.90 },
  'leveraging': { replacement: 'using', confidence: 0.90 },
  'leverages': { replacement: 'uses', confidence: 0.90 },
  
  // Verb variants - utilize (already has base in VOCABULARY_REPLACEMENTS, add variants)
  'utilized': { replacement: 'used', confidence: 0.95 },
  'utilizing': { replacement: 'using', confidence: 0.95 },
  'utilizes': { replacement: 'uses', confidence: 0.95 },
  
  // Verb variants - maximize/minimize
  'maximize': { replacement: 'increase', confidence: 0.90 },
  'maximized': { replacement: 'increased', confidence: 0.90 },
  'maximizing': { replacement: 'increasing', confidence: 0.90 },
  'maximizes': { replacement: 'increases', confidence: 0.90 },
  'minimize': { replacement: 'reduce', confidence: 0.90 },
  'minimized': { replacement: 'reduced', confidence: 0.90 },
  'minimizing': { replacement: 'reducing', confidence: 0.90 },
  'minimizes': { replacement: 'reduces', confidence: 0.90 },
  
  // Verb variants - prioritize
  'prioritize': { replacement: 'focus on', confidence: 0.85 },
  'prioritized': { replacement: 'focused on', confidence: 0.85 },
  'prioritizing': { replacement: 'focusing on', confidence: 0.85 },
  'prioritizes': { replacement: 'focuses on', confidence: 0.85 },
  
  // Verb variants - incentivize
  'incentivize': { replacement: 'encourage', confidence: 0.90 },
  'incentivized': { replacement: 'encouraged', confidence: 0.90 },
  'incentivizing': { replacement: 'encouraging', confidence: 0.90 },
  'incentivizes': { replacement: 'encourages', confidence: 0.90 },
  
  // Verb variants - onboard
  'onboard': { replacement: 'welcome', confidence: 0.85 },
  'onboarded': { replacement: 'welcomed', confidence: 0.85 },
  'onboarding': { replacement: 'welcoming', confidence: 0.85 },
  'onboards': { replacement: 'welcomes', confidence: 0.85 },
  
  // Verb variants - sync
  'sync': { replacement: 'connect', confidence: 0.85 },
  'synced': { replacement: 'connected', confidence: 0.85 },
  'syncing': { replacement: 'connecting', confidence: 0.85 },
  'syncs': { replacement: 'connects', confidence: 0.85 },
  
  // Robotic phrases
  'please note': { replacement: '', confidence: 0.85 },  // Often redundant, remove
  'be advised': { replacement: '', confidence: 0.85 },   // Often redundant, remove
  'kindly': { replacement: 'please', confidence: 0.95 },
  'hereby': { replacement: '', confidence: 0.90 },       // Usually redundant
  'furthermore': { replacement: 'also', confidence: 0.90 },
  'moreover': { replacement: 'also', confidence: 0.90 },
  'henceforth': { replacement: 'from now on', confidence: 0.95 },
  'aforementioned': { replacement: 'mentioned', confidence: 0.95 },
  
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
  
  // British Spellings (comprehensive)
  'color': { replacement: 'colour', confidence: 0.90 },
  'colors': { replacement: 'colours', confidence: 0.90 },
  'favorite': { replacement: 'favourite', confidence: 0.90 },
  'favorites': { replacement: 'favourites', confidence: 0.90 },
  'organize': { replacement: 'organise', confidence: 0.90 },
  'organized': { replacement: 'organised', confidence: 0.90 },
  'organizing': { replacement: 'organising', confidence: 0.90 },
  'organization': { replacement: 'organisation', confidence: 0.90 },
  'realize': { replacement: 'realise', confidence: 0.90 },
  'realized': { replacement: 'realised', confidence: 0.90 },
  'recognize': { replacement: 'recognise', confidence: 0.90 },
  'recognized': { replacement: 'recognised', confidence: 0.90 },
  'customize': { replacement: 'customise', confidence: 0.90 },
  'customized': { replacement: 'customised', confidence: 0.90 },
  'customizing': { replacement: 'customising', confidence: 0.90 },
  'center': { replacement: 'centre', confidence: 0.90 },
  'centers': { replacement: 'centres', confidence: 0.90 },
  'behavior': { replacement: 'behaviour', confidence: 0.90 },
  'behaviors': { replacement: 'behaviours', confidence: 0.90 },
  'analyze': { replacement: 'analyse', confidence: 0.90 },
  'analyzed': { replacement: 'analysed', confidence: 0.90 },
  'analyzing': { replacement: 'analysing', confidence: 0.90 },
  'canceled': { replacement: 'cancelled', confidence: 0.90 },
  'canceling': { replacement: 'cancelling', confidence: 0.90 },
  'honor': { replacement: 'honour', confidence: 0.90 },
  'honored': { replacement: 'honoured', confidence: 0.90 },
  'labor': { replacement: 'labour', confidence: 0.90 },
  'neighbor': { replacement: 'neighbour', confidence: 0.90 },
  'flavor': { replacement: 'flavour', confidence: 0.90 },
  'theater': { replacement: 'theatre', confidence: 0.90 },
  'meter': { replacement: 'metre', confidence: 0.85 },
  'fiber': { replacement: 'fibre', confidence: 0.80 },
  'defense': { replacement: 'defence', confidence: 0.90 },
  'offense': { replacement: 'offence', confidence: 0.90 },
  'license': { replacement: 'licence', confidence: 0.85 },
  'practice': { replacement: 'practise', confidence: 0.80 },
  'catalog': { replacement: 'catalogue', confidence: 0.90 },
  'dialog': { replacement: 'dialogue', confidence: 0.90 },
  'program': { replacement: 'programme', confidence: 0.80 },
  'enrollment': { replacement: 'enrolment', confidence: 0.90 },
  'fulfill': { replacement: 'fulfil', confidence: 0.90 },
  'fulfillment': { replacement: 'fulfilment', confidence: 0.90 },
  'skillful': { replacement: 'skilful', confidence: 0.90 },
  'traveler': { replacement: 'traveller', confidence: 0.90 },
  'modeling': { replacement: 'modelling', confidence: 0.90 },
  'labeled': { replacement: 'labelled', confidence: 0.90 },
  'judgment': { replacement: 'judgement', confidence: 0.85 },

  // Additional corporate/formal -> simple replacements
  'commence': { replacement: 'start', confidence: 0.95 },
  'commenced': { replacement: 'started', confidence: 0.95 },
  'terminate': { replacement: 'end', confidence: 0.90 },
  'terminated': { replacement: 'ended', confidence: 0.90 },
  'subsequently': { replacement: 'then', confidence: 0.95 },
  'accordingly': { replacement: 'so', confidence: 0.90 },
  'nevertheless': { replacement: 'still', confidence: 0.90 },
  'consequently': { replacement: 'so', confidence: 0.90 },
  'therefore': { replacement: 'so', confidence: 0.85 },
  'endeavour': { replacement: 'try', confidence: 0.95 },
  'endeavor': { replacement: 'try', confidence: 0.95 },
  'facilitate': { replacement: 'help', confidence: 0.90 },
  'facilitated': { replacement: 'helped', confidence: 0.90 },
  'ascertain': { replacement: 'find out', confidence: 0.95 },
  'implement': { replacement: 'set up', confidence: 0.85 },
  'implemented': { replacement: 'set up', confidence: 0.85 },
  'demonstrate': { replacement: 'show', confidence: 0.90 },
  'demonstrated': { replacement: 'showed', confidence: 0.90 },
  'approximately': { replacement: 'about', confidence: 0.95 },
  'sufficient': { replacement: 'enough', confidence: 0.95 },
  'insufficient': { replacement: 'not enough', confidence: 0.95 },
  'require': { replacement: 'need', confidence: 0.85 },
  'required': { replacement: 'needed', confidence: 0.85 },
  'obtain': { replacement: 'get', confidence: 0.90 },
  'obtained': { replacement: 'got', confidence: 0.90 },
  'purchase': { replacement: 'buy', confidence: 0.90 },
  'purchased': { replacement: 'bought', confidence: 0.90 },
  'prior to': { replacement: 'before', confidence: 0.98 },
  'subsequent to': { replacement: 'after', confidence: 0.98 },
  'in excess of': { replacement: 'more than', confidence: 0.98 },
  'a majority of': { replacement: 'most', confidence: 0.95 },
  'a number of': { replacement: 'some', confidence: 0.90 },
  'has the ability to': { replacement: 'can', confidence: 0.98 },
  'is able to': { replacement: 'can', confidence: 0.95 },
  'make a decision': { replacement: 'decide', confidence: 0.95 },
  'take into consideration': { replacement: 'consider', confidence: 0.98 },
  'at the present time': { replacement: 'now', confidence: 0.98 },
  'in the near future': { replacement: 'soon', confidence: 0.95 },
  'until such time as': { replacement: 'until', confidence: 0.98 },
  'in the amount of': { replacement: 'for', confidence: 0.95 },
  'on a daily basis': { replacement: 'daily', confidence: 0.98 },
  'on a regular basis': { replacement: 'regularly', confidence: 0.98 },
  'make an attempt': { replacement: 'try', confidence: 0.98 },
  'give consideration to': { replacement: 'consider', confidence: 0.98 },

  // Tone softeners (KB: never blame, never dismiss)
  'you need to': { replacement: 'you can', confidence: 0.85 },
  'you must': { replacement: 'please', confidence: 0.80 },
  'trust me': { replacement: '', confidence: 0.90 },
  'obviously': { replacement: '', confidence: 0.90 },
  'basically': { replacement: '', confidence: 0.85 },
  'actually': { replacement: '', confidence: 0.80 },
  'honestly': { replacement: '', confidence: 0.85 },

  // ── TIER B: Semantic replacements (max 25, context-guarded) ──
  // These replacements change meaning slightly. Use with caution.
  // Only applied when confidence check passes.
  'guarantee': { replacement: 'aim to help', confidence: 0.75 },
  'guaranteed': { replacement: 'expected', confidence: 0.75 },
  'never fails': { replacement: 'designed to be reliable', confidence: 0.75 },
  'always works': { replacement: 'designed to work reliably', confidence: 0.75 },
  'impossible': { replacement: 'unlikely', confidence: 0.70 },
  'definitely': { replacement: 'likely', confidence: 0.70 },
  'absolutely': { replacement: 'yes', confidence: 0.70 },
  'the best': { replacement: 'a great option', confidence: 0.70 },
  'the only': { replacement: 'one of the', confidence: 0.70 },
  'without a doubt': { replacement: '', confidence: 0.70 },
  'rest assured': { replacement: '', confidence: 0.75 },
  'no worries': { replacement: "I'm here to help", confidence: 0.75 },
  'don\'t worry': { replacement: "I'm here to help", confidence: 0.75 },
};

/**
 * Dynamic replacement rule from Convex (admin-managed)
 */
export interface DynamicReplacement {
  from: string;
  to: string;
}

/**
 * Cached dynamic replacements from Convex (set at runtime)
 * This allows auto-fix rules to be used without passing them on every call
 */
let cachedDynamicReplacements: DynamicReplacement[] = [];

/**
 * Set dynamic auto-fix rules from Convex knowledge base
 * Called from App.tsx when Convex knowledge is available
 */
export function setDynamicAutoFixRules(
  rules: Array<{ content: string; metadata?: { suggestion?: string } }>
): void {
  cachedDynamicReplacements = rules
    .filter(rule => rule.content && rule.metadata?.suggestion)
    .map(rule => ({
      from: rule.content,
      to: rule.metadata!.suggestion!,
    }));
  console.log(`[AutoFix] Cached ${cachedDynamicReplacements.length} dynamic rules from Convex`);
}

/**
 * Clear cached dynamic rules (for testing/cleanup)
 */
export function clearDynamicAutoFixRules(): void {
  cachedDynamicReplacements = [];
}

/**
 * Get the merged replacements (static + dynamic)
 * Used internally by generateAutoFixes
 */
function getMergedReplacements(
  dynamicReplacements?: DynamicReplacement[]
): Record<string, { replacement: string; confidence: number }> {
  const mergedReplacements: Record<string, { replacement: string; confidence: number }> = { ...REPLACEMENTS };
  
  // Use provided dynamic replacements, or fall back to cached ones
  const dynamicToUse = dynamicReplacements ?? cachedDynamicReplacements;
  
  if (dynamicToUse.length > 0) {
    let validCount = 0;
    for (const rule of dynamicToUse) {
      if (!rule.from || !rule.to) continue;
      // Convex admin rules get 0.92 confidence (higher than vocabulary but lower than brand rules)
      mergedReplacements[rule.from.toLowerCase()] = { 
        replacement: rule.to, 
        confidence: 0.92 
      };
      validCount++;
    }
    if (validCount > 0) {
      console.log(`[AutoFix] Using ${validCount} dynamic rules`);
    }
  }
  
  return mergedReplacements;
}

/**
 * Generate auto-fixes for violations
 * 
 * IMPORTANT: This function now aggressively generates fixes for ALL violations
 * that have either a direct replacement or a suggestion. No violating content
 * should ever appear in the final output.
 * 
 * @param violations - Array of violations to generate fixes for
 * @param dynamicReplacements - Optional array of admin-managed rules from Convex
 *                              These are merged with static REPLACEMENTS (Convex rules take priority)
 *                              If not provided, uses cached dynamic rules from setDynamicAutoFixRules()
 */
/**
 * Get numeric rank for severity (higher = more severe)
 * Used for deduplication to keep the most severe violation at each position
 */
function severityRank(severity: string | undefined): number {
  return { error: 3, warning: 2, info: 1 }[severity ?? 'info'] ?? 0;
}

export function generateAutoFixes(
  violations: Violation[],
  dynamicReplacements?: DynamicReplacement[]
): AutoFix[] {
  const fixes: AutoFix[] = [];
  
  // DEDUPLICATION: Remove violations at same position, keeping higher severity
  const uniqueByPosition = new Map<string, Violation>();
  for (const v of violations) {
    const posKey = `${v.position?.start ?? 0}-${v.position?.end ?? 0}-${v.text}`;
    const existing = uniqueByPosition.get(posKey);
    // Keep higher severity violation
    if (!existing || severityRank(v.severity) > severityRank(existing.severity)) {
      uniqueByPosition.set(posKey, v);
    }
  }
  const deduplicatedViolations = Array.from(uniqueByPosition.values());
  
  // Get merged replacements (static + dynamic)
  const mergedReplacements = getMergedReplacements(dynamicReplacements);
  
  for (const violation of deduplicatedViolations) {
    // Process ALL violations - don't skip based on autoFixable flag
    // We want to attempt fixing everything that has a suggestion
    
    // Skip violations with missing text
    if (!violation.text) {
      console.warn('[AutoFix] Skipping violation with missing text:', violation);
      continue;
    }
    
    const text = violation.text.toLowerCase();
    const directFix = mergedReplacements[text];
    
    if (directFix) {
      // Direct replacement from dictionary - highest confidence
      fixes.push({
        original: violation.text,
        replacement: matchCase(violation.text, directFix.replacement),
        confidence: directFix.confidence,
        rule: violation.rule,
        violation,
      });
    } else if (violation.suggestion) {
      // No direct replacement - use the suggestion
      // Try to extract replacement from suggestion (format: "Replace X with: Y")
      const suggestionMatch = violation.suggestion.match(/Replace\s+["']?[^"']+["']?\s+with:\s*(.+)/i);
      if (suggestionMatch) {
        const suggestedReplacement = suggestionMatch[1].trim();
        fixes.push({
          original: violation.text,
          replacement: matchCase(violation.text, suggestedReplacement),
          confidence: 0.85, // Higher confidence for structured suggestions
          rule: violation.rule,
          violation,
        });
      } else if (violation.suggestion.length < 100) {
        // Check if suggestion is instructional (not a literal replacement)
        // These are guidance for humans, not actual replacement values
        const isInstructional = /^(Add|Use|Consider|Avoid|Remove|Describe|Rephrase|Break|Simplify|Put|State|Lowercase|Substantiate|Here's)/i.test(violation.suggestion);
        
        if (!isInstructional) {
          // Fallback to raw suggestion - only use short, non-instructional suggestions
          fixes.push({
            original: violation.text,
            replacement: violation.suggestion,
            confidence: 0.75,
            rule: violation.rule,
            violation,
          });
        }
        // Skip instructional suggestions - they're guidance, not replacements
      } else {
        // For very long suggestions, try to remove the violating text
        // This is a last resort - remove content rather than leave violations
        fixes.push({
          original: violation.text,
          replacement: '', // Remove the violating content
          confidence: 0.60,
          rule: violation.rule,
          violation,
        });
        console.log(`[AutoFix] Removing violating content (no short replacement): "${violation.text}"`);
      }
    }
  }
  
  return fixes;
}

/**
 * Brand names that should always preserve their capitalization
 * regardless of the original case
 */
const BRAND_NAMES = new Set([
  'Jio', 'JioCinema', 'JioMart', 'JioSaavn', 'JioFiber', 'JioAirFiber',
  'JioTV', 'JioCloud', 'JioGames', 'JioMoney', 'JioNews', 'JioPhone',
  'MyJio', 'Reliance', 'Tata',
]);

/**
 * Match case of replacement to original
 * Special handling for brand names - they preserve their exact capitalization
 */
function matchCase(original: string, replacement: string): string {
  // Check if replacement is a brand name (preserve exact capitalization)
  if (BRAND_NAMES.has(replacement)) {
    return replacement;
  }
  
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
 * Clean up orphaned punctuation after word replacements.
 * When words like "obviously" are removed, they can leave behind orphaned
 * punctuation like ", you can..." which should become "You can..."
 */
function cleanOrphanedPunctuation(text: string): string {
  let cleaned = text
    // Remove leading punctuation at start of text and capitalize next letter
    .replace(/^[,;:]\s*([a-z])/g, (_, letter) => letter.toUpperCase())
    // Remove leading punctuation after newlines (including blank lines) and capitalize
    .replace(/(\n+)[,;:]\s*([a-z])/g, (_, newlines, letter) => newlines + letter.toUpperCase())
    // Remove leading punctuation after sentence endings
    .replace(/([.!?])\s*[,;:]\s*/g, '$1 ')
    // Clean up multiple spaces (but preserve newlines)
    .replace(/[ \t]{2,}/g, ' ')
    // Clean up double punctuation like ", ," or ". ,"
    .replace(/[,;:]\s*[,;:]/g, ',')
    .trim();
  
  // Ensure first character is capitalized
  if (cleaned.length > 0 && /[a-z]/.test(cleaned[0])) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

/**
 * Apply auto-fixes to content
 * 
 * IMPORTANT: Uses global regex replacement to fix ALL occurrences of a word,
 * not just the first one. This is critical for content with repeated violations.
 * 
 * AGGRESSIVE MODE: Default minConfidence lowered to 0.5 to ensure ALL violations
 * are fixed. No violating content should ever appear in the final output.
 */
export function applyAutoFixes(
  content: string,
  fixes: AutoFix[],
  minConfidence: number = 0.5 // Lowered from 0.8 to fix ALL violations
): AutoFixResult {
  let fixedContent = content;
  const appliedFixes: AutoFix[] = [];
  const skippedFixes: AutoFix[] = [];
  
  const sortedFixes = [...fixes]
    .filter(f => f.confidence >= minConfidence)
    .slice(0, 50); // Increased from 20 to 50 to handle many violations
  
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
  
  // Clean up orphaned punctuation after replacements
  // e.g., "Obviously, you can..." → ", you can..." → "You can..."
  fixedContent = cleanOrphanedPunctuation(fixedContent);
  
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
  setDynamicAutoFixRules,
  clearDynamicAutoFixRules,
};
