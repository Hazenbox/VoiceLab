/**
 * Selective Directive Loader
 * 
 * Loads only the 5-10 most relevant constitutional directives
 * based on token classification, reducing prompt bloat.
 * 
 * @module services/tokens/selectiveLoader
 */

import {
  VOICE_TRAITS,
  NAVARASA,
  SAFETY_DOMAINS,
  PATTERN_BLOCKS,
  HARD_LIMITS,
  WARMTH_SCALE,
  DETAIL_SCALE,
  type VoiceTrait,
  type NavarasaEmotion,
  type SafetyDomain,
  type PatternBlock,
} from '../constitutional/coreRules';
import type { TokenClassification } from './tokenClassifier';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoadedDirectives {
  /** Selected voice traits to emphasize */
  voiceTraits: Array<{
    trait: VoiceTrait;
    emphasis: 'high' | 'medium' | 'standard';
    description: string;
    violations: string[];
  }>;
  
  /** Emotion handling directive */
  emotionDirective: {
    userEmotion: NavarasaEmotion;
    targetEmotion: NavarasaEmotion;
    responseBehavior: string;
    forbiddenToneShifts: string[];
  };
  
  /** Safety directives if needed */
  safetyDirectives: Array<{
    domain: SafetyDomain;
    level: string;
    advisoryBoundary: string;
    description: string;
  }>;
  
  /** Pattern blocks to follow */
  patternDirective: {
    blocks: PatternBlock[];
    sequence: string[];
  };
  
  /** Tone settings */
  toneDirective: {
    warmth: { level: number; name: string; usage: string };
    detail: { level: number; name: string; usage: string };
    guardrail: string;
  };
  
  /** Hard limits to enforce */
  hardLimits: string[];
  
  /** Total directive count */
  directiveCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE TRAIT SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Select and prioritize voice traits based on context
 * Always includes core traits, adds context-specific ones
 */
function selectVoiceTraits(
  classification: TokenClassification
): LoadedDirectives['voiceTraits'] {
  const result: LoadedDirectives['voiceTraits'] = [];
  
  // Core traits always included (high emphasis)
  const coreTraits: VoiceTrait[] = ['direct', 'caring', 'simple', 'respectful'];
  
  // Context-specific traits
  const contextTraits: VoiceTrait[] = [];
  
  // Based on emotion
  if (classification.userEmotion === 'raudra' || classification.userEmotion === 'karuna') {
    contextTraits.push('nonJudgmental', 'caring');
  }
  if (classification.userEmotion === 'bhayanaka') {
    contextTraits.push('trustBuilding', 'grounded');
  }
  if (classification.userEmotion === 'adbhuta') {
    contextTraits.push('inspirational');
  }
  
  // Based on intent
  if (classification.intent === 'support' || classification.intent === 'complaint') {
    contextTraits.push('focused', 'nonJudgmental');
  }
  if (classification.intent === 'explain' || classification.intent === 'educate') {
    contextTraits.push('grounded', 'inviting');
  }
  if (classification.intent === 'sell' || classification.intent === 'delight') {
    contextTraits.push('positive', 'inspirational');
  }
  if (classification.intent === 'onboard') {
    contextTraits.push('inviting', 'inclusive');
  }
  
  // Based on risk
  if (classification.risk === 'high' || classification.risk === 'medium') {
    contextTraits.push('trustBuilding', 'grounded');
  }
  
  // Based on literacy
  if (classification.literacy === 'basic') {
    contextTraits.push('simple', 'grounded');
  }
  
  // Build result with emphasis levels
  const seen = new Set<VoiceTrait>();
  
  // Add core traits with high emphasis
  for (const trait of coreTraits) {
    if (!seen.has(trait)) {
      seen.add(trait);
      result.push({
        trait,
        emphasis: 'high',
        description: VOICE_TRAITS[trait].description,
        violations: [...VOICE_TRAITS[trait].violations],
      });
    }
  }
  
  // Add context traits with medium emphasis (max 3 additional)
  let contextCount = 0;
  for (const trait of contextTraits) {
    if (!seen.has(trait) && contextCount < 3) {
      seen.add(trait);
      contextCount++;
      result.push({
        trait,
        emphasis: 'medium',
        description: VOICE_TRAITS[trait].description,
        violations: [...VOICE_TRAITS[trait].violations],
      });
    }
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION DIRECTIVE
// ═══════════════════════════════════════════════════════════════════════════════

function getEmotionDirective(
  classification: TokenClassification
): LoadedDirectives['emotionDirective'] {
  const userConfig = NAVARASA[classification.userEmotion];
  const targetConfig = NAVARASA[classification.targetEmotion];
  
  return {
    userEmotion: classification.userEmotion,
    targetEmotion: classification.targetEmotion,
    responseBehavior: userConfig.responseBehavior,
    forbiddenToneShifts: [...userConfig.forbiddenToneShifts],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY DIRECTIVES
// ═══════════════════════════════════════════════════════════════════════════════

function getSafetyDirectives(
  classification: TokenClassification
): LoadedDirectives['safetyDirectives'] {
  return classification.safetyDomains.map(domain => {
    const config = SAFETY_DOMAINS[domain];
    return {
      domain,
      level: config.level,
      advisoryBoundary: config.advisoryBoundary,
      description: config.description,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN DIRECTIVE
// ═══════════════════════════════════════════════════════════════════════════════

function getPatternDirective(
  classification: TokenClassification
): LoadedDirectives['patternDirective'] {
  const blocks = classification.pattern as PatternBlock[];
  
  // Build sequence with positions
  const sequence = blocks
    .map(block => {
      const config = PATTERN_BLOCKS[block];
      return config ? `${config.position}. ${block}: ${config.description}` : null;
    })
    .filter(Boolean) as string[];
  
  return {
    blocks,
    sequence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TONE DIRECTIVE
// ═══════════════════════════════════════════════════════════════════════════════

function getToneDirective(
  classification: TokenClassification
): LoadedDirectives['toneDirective'] {
  const warmthKeys = ['neutral', 'friendly', 'reassuring', 'celebratory'] as const;
  const warmthKey = warmthKeys[classification.toneWarmth - 1] || 'friendly';
  const warmth = WARMTH_SCALE[warmthKey];
  
  const detailKeys = ['minimal', 'standard', 'expanded'] as const;
  const detailKey = detailKeys[classification.toneDetail - 1] || 'standard';
  const detail = DETAIL_SCALE[detailKey];
  
  return {
    warmth: {
      level: warmth.level,
      name: warmth.name,
      usage: warmth.usage,
    },
    detail: {
      level: detail.level,
      name: detail.name,
      usage: detail.usage,
    },
    guardrail: classification.toneGuardrail,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HARD LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

function getHardLimits(
  classification: TokenClassification
): string[] {
  const limits: string[] = [];
  
  // Always include top 5 hard limits
  limits.push(...HARD_LIMITS.neverDo.slice(0, 5));
  
  // Add context-specific limits
  if (classification.risk === 'high' || classification.safetyDomains.length > 0) {
    limits.push(
      'continue sensitive workflows when risk validation fails',
      'replace human support in emergency or high-risk scenarios'
    );
  }
  
  if (classification.intent === 'transaction' || classification.context === 'transactional') {
    limits.push(
      'take irreversible decisions on behalf of users without confirmation',
      'override regulatory, safety, or identity-verification processes'
    );
  }
  
  if (classification.intent === 'sell') {
    limits.push('manipulate user behavior through persuasion pressure or emotional dependency');
  }
  
  // Deduplicate
  return [...new Set(limits)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LOADER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load relevant directives based on token classification
 * Returns 5-10 directives optimized for the current context
 */
export function loadDirectives(classification: TokenClassification): LoadedDirectives {
  const voiceTraits = selectVoiceTraits(classification);
  const emotionDirective = getEmotionDirective(classification);
  const safetyDirectives = getSafetyDirectives(classification);
  const patternDirective = getPatternDirective(classification);
  const toneDirective = getToneDirective(classification);
  const hardLimits = getHardLimits(classification);
  
  // Count total directives
  const directiveCount = 
    voiceTraits.length + // Voice traits
    1 + // Emotion
    safetyDirectives.length + // Safety
    1 + // Pattern
    1 + // Tone
    hardLimits.length; // Hard limits
  
  return {
    voiceTraits,
    emotionDirective,
    safetyDirectives,
    patternDirective,
    toneDirective,
    hardLimits,
    directiveCount,
  };
}

/**
 * Build prompt section from loaded directives
 */
export function buildDirectivesPrompt(directives: LoadedDirectives): string {
  const sections: string[] = [];
  
  // Voice traits section
  const highEmphasis = directives.voiceTraits.filter(t => t.emphasis === 'high');
  const mediumEmphasis = directives.voiceTraits.filter(t => t.emphasis === 'medium');
  
  sections.push(`## Voice Traits (MUST follow)

### Core Traits (Always apply)
${highEmphasis.map(t => `- **${t.trait}**: ${t.description}
  - Avoid: ${t.violations.slice(0, 2).join(', ')}`).join('\n')}

${mediumEmphasis.length > 0 ? `### Context-Specific Traits (Emphasize)
${mediumEmphasis.map(t => `- **${t.trait}**: ${t.description}`).join('\n')}` : ''}`);

  // Emotion handling
  sections.push(`## Emotion Handling

User Emotion: **${directives.emotionDirective.userEmotion}** (${NAVARASA[directives.emotionDirective.userEmotion].englishName})
Target Emotion: **${directives.emotionDirective.targetEmotion}**
Response Behavior: ${directives.emotionDirective.responseBehavior}
DO NOT: ${directives.emotionDirective.forbiddenToneShifts.join(', ')}`);

  // Safety directives if any
  if (directives.safetyDirectives.length > 0) {
    sections.push(`## Safety Constraints (CRITICAL)

${directives.safetyDirectives.map(s => `- **${s.domain}** (${s.level}): ${s.description}
  - Advisory: ${s.advisoryBoundary}`).join('\n')}`);
  }

  // Pattern blocks
  sections.push(`## Response Structure

Follow this pattern:
${directives.patternDirective.sequence.join('\n')}`);

  // Tone settings
  sections.push(`## Tone Settings

- Warmth: **${directives.toneDirective.warmth.name}** - ${directives.toneDirective.warmth.usage}
- Detail: **${directives.toneDirective.detail.name}** - ${directives.toneDirective.detail.usage}
${directives.toneDirective.guardrail !== 'none' ? `- Guardrail: **${directives.toneDirective.guardrail}** mode active` : ''}`);

  // Hard limits
  sections.push(`## Hard Limits (NEVER violate)

${directives.hardLimits.map(l => `- Do NOT ${l}`).join('\n')}`);

  return sections.join('\n\n');
}

/**
 * Get directive summary for debugging
 */
export function getDirectiveSummary(directives: LoadedDirectives): string {
  return [
    `Voice Traits: ${directives.voiceTraits.map(t => t.trait).join(', ')}`,
    `Emotion: ${directives.emotionDirective.userEmotion} → ${directives.emotionDirective.targetEmotion}`,
    directives.safetyDirectives.length > 0 
      ? `Safety: ${directives.safetyDirectives.map(s => s.domain).join(', ')}`
      : null,
    `Pattern: ${directives.patternDirective.blocks.join(' → ')}`,
    `Tone: ${directives.toneDirective.warmth.name}, ${directives.toneDirective.detail.name}`,
    `Total: ${directives.directiveCount} directives`,
  ].filter(Boolean).join('\n');
}
