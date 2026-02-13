/**
 * Profile Learning Service
 * 
 * Builds profile-aware prompt sections from user learning profiles
 * and weighted corrections for personalized AI responses.
 * 
 * @module services/learning/profileLearning
 */

import { type WeightedCorrection, weightAndSortCorrections, WEIGHTING_CONFIG } from './correctionWeighting';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User learning profile from Convex
 */
export interface UserLearningProfile {
  userId: string;
  deviceId: string;
  
  // Preference patterns
  preferredVoiceTraits?: Array<{
    trait: string;
    preference: number; // -1 to 1
    sampleSize: number;
  }>;
  
  // Style preferences
  preferredWarmth?: number; // 1-4
  preferredDetail?: number; // 1-3
  preferredLanguage?: string;
  
  // Behavioral patterns
  commonIntents?: Array<{
    intent: string;
    frequency: number;
  }>;
  commonEcosystems?: Array<{
    ecosystem: string;
    frequency: number;
  }>;
  
  // Correction patterns
  correctionFrequency: number;
  topCorrectionReasons?: string[];
  avoidPatterns?: string[];
  
  // Engagement signals
  averageSessionLength?: number;
  regenerationRate?: number;
  copyRate?: number;
  
  // Metadata
  totalInteractions: number;
  totalCorrections: number;
  lastAggregatedAt: number;
}

/**
 * Correction entry for learning
 */
export interface CorrectionEntry {
  originalContent: string;
  editedContent?: string;
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'edit' | 'comment';
  comment?: string;
  reasons?: string[];
  ecosystem: string;
  channel: string;
  timestamp: number;
  trustScore?: number;
}

/**
 * Configuration for profile learning prompt building
 */
export interface ProfileLearningConfig {
  /** Maximum corrections to include */
  maxCorrections: number;
  /** Minimum weight threshold */
  minWeight: number;
  /** Include profile patterns */
  includePatterns: boolean;
  /** Include style preferences */
  includeStylePrefs: boolean;
  /** Include avoid patterns */
  includeAvoidPatterns: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_CONFIG: ProfileLearningConfig = {
  maxCorrections: 10,
  minWeight: 0.2,
  includePatterns: true,
  includeStylePrefs: true,
  includeAvoidPatterns: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the corrections section for prompt injection
 */
function buildCorrectionsSection(
  corrections: WeightedCorrection[],
  config: ProfileLearningConfig
): string {
  if (corrections.length === 0) return '';
  
  const filtered = corrections
    .filter(c => c.weight >= config.minWeight)
    .slice(0, config.maxCorrections);
  
  if (filtered.length === 0) return '';
  
  const lines: string[] = [
    '## user corrections (weighted by recency & frequency)',
    'apply these learnings to improve responses:',
    '',
  ];
  
  for (const correction of filtered) {
    const weight = correction.weight.toFixed(2);
    
    if (correction.feedbackType === 'edit' && correction.editedContent) {
      lines.push(`- **avoid**: "${truncate(correction.originalContent, 80)}"`);
      lines.push(`  **prefer**: "${truncate(correction.editedContent, 80)}" (weight: ${weight})`);
    } else if (correction.feedbackType === 'thumbs_down') {
      lines.push(`- **avoid this style**: "${truncate(correction.originalContent, 100)}"`);
      if (correction.reasons && correction.reasons.length > 0) {
        lines.push(`  reasons: ${correction.reasons.join(', ')} (weight: ${weight})`);
      }
    } else if (correction.feedbackType === 'thumbs_up') {
      lines.push(`- **good example**: "${truncate(correction.originalContent, 100)}" (weight: ${weight})`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Build the avoid patterns section
 */
function buildAvoidPatternsSection(profile: UserLearningProfile | null): string {
  if (!profile?.avoidPatterns || profile.avoidPatterns.length === 0) return '';
  
  const lines: string[] = [
    '## patterns this user dislikes',
    'avoid these in responses:',
    '',
  ];
  
  for (const pattern of profile.avoidPatterns.slice(0, 10)) {
    lines.push(`- ${pattern}`);
  }
  
  return lines.join('\n');
}

/**
 * Build the style preferences section
 */
function buildStylePreferencesSection(profile: UserLearningProfile | null): string {
  if (!profile) return '';
  
  const prefs: string[] = [];
  
  if (profile.preferredWarmth !== undefined) {
    const warmthLevel = profile.preferredWarmth <= 1 ? 'minimal' :
                        profile.preferredWarmth <= 2 ? 'balanced' :
                        profile.preferredWarmth <= 3 ? 'warm' : 'very warm';
    prefs.push(`warmth level: ${warmthLevel}`);
  }
  
  if (profile.preferredDetail !== undefined) {
    const detailLevel = profile.preferredDetail <= 1 ? 'brief' :
                        profile.preferredDetail <= 2 ? 'standard' : 'detailed';
    prefs.push(`detail level: ${detailLevel}`);
  }
  
  if (profile.preferredLanguage) {
    prefs.push(`preferred language: ${profile.preferredLanguage}`);
  }
  
  // Voice trait preferences
  if (profile.preferredVoiceTraits && profile.preferredVoiceTraits.length > 0) {
    const strongPrefs = profile.preferredVoiceTraits
      .filter(t => Math.abs(t.preference) > 0.5 && t.sampleSize >= 3)
      .sort((a, b) => Math.abs(b.preference) - Math.abs(a.preference))
      .slice(0, 5);
    
    if (strongPrefs.length > 0) {
      const liked = strongPrefs.filter(t => t.preference > 0).map(t => t.trait);
      const disliked = strongPrefs.filter(t => t.preference < 0).map(t => t.trait);
      
      if (liked.length > 0) {
        prefs.push(`preferred traits: ${liked.join(', ')}`);
      }
      if (disliked.length > 0) {
        prefs.push(`avoid traits: ${disliked.join(', ')}`);
      }
    }
  }
  
  if (prefs.length === 0) return '';
  
  const lines: string[] = [
    '## user style preferences',
    'adapt responses to match:',
    '',
    ...prefs.map(p => `- ${p}`),
  ];
  
  return lines.join('\n');
}

/**
 * Build the behavioral patterns section
 */
function buildBehavioralPatternsSection(profile: UserLearningProfile | null): string {
  if (!profile) return '';
  
  const patterns: string[] = [];
  
  // Common intents
  if (profile.commonIntents && profile.commonIntents.length > 0) {
    const topIntents = profile.commonIntents
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)
      .map(i => i.intent);
    patterns.push(`typical needs: ${topIntents.join(', ')}`);
  }
  
  // Engagement signals
  if (profile.regenerationRate !== undefined && profile.regenerationRate > 30) {
    patterns.push('note: user frequently regenerates responses - ensure quality and relevance');
  }
  
  if (profile.correctionFrequency > 20) {
    patterns.push('note: user provides frequent feedback - be extra attentive to their preferences');
  }
  
  if (profile.copyRate !== undefined && profile.copyRate > 50) {
    patterns.push('user often copies responses - ensure they are ready to use as-is');
  }
  
  if (patterns.length === 0) return '';
  
  const lines: string[] = [
    '## user behavior patterns',
    '',
    ...patterns.map(p => `- ${p}`),
  ];
  
  return lines.join('\n');
}

/**
 * Build the complete profile learning prompt section
 */
export function buildProfileLearningSection(
  profile: UserLearningProfile | null,
  corrections: CorrectionEntry[],
  config: Partial<ProfileLearningConfig> = {}
): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const sections: string[] = [];
  
  // Weight and sort corrections
  const weightedCorrections = weightAndSortCorrections(corrections);
  
  // Build sections
  const correctionsSection = buildCorrectionsSection(weightedCorrections, fullConfig);
  if (correctionsSection) sections.push(correctionsSection);
  
  if (fullConfig.includeAvoidPatterns) {
    const avoidSection = buildAvoidPatternsSection(profile);
    if (avoidSection) sections.push(avoidSection);
  }
  
  if (fullConfig.includeStylePrefs) {
    const styleSection = buildStylePreferencesSection(profile);
    if (styleSection) sections.push(styleSection);
  }
  
  if (fullConfig.includePatterns) {
    const behaviorSection = buildBehavioralPatternsSection(profile);
    if (behaviorSection) sections.push(behaviorSection);
  }
  
  if (sections.length === 0) return '';
  
  return [
    '# personalization context',
    'this user has provided feedback that should influence response generation:',
    '',
    ...sections,
  ].join('\n');
}

/**
 * Get personalization summary for logging/debugging
 */
export function getPersonalizationSummary(
  profile: UserLearningProfile | null,
  corrections: CorrectionEntry[]
): {
  hasProfile: boolean;
  correctionCount: number;
  topWeightedCount: number;
  avoidPatternCount: number;
  hasStylePrefs: boolean;
} {
  const weightedCorrections = weightAndSortCorrections(corrections);
  const topWeighted = weightedCorrections.filter(c => c.weight >= DEFAULT_CONFIG.minWeight);
  
  return {
    hasProfile: profile !== null,
    correctionCount: corrections.length,
    topWeightedCount: Math.min(topWeighted.length, DEFAULT_CONFIG.maxCorrections),
    avoidPatternCount: profile?.avoidPatterns?.length ?? 0,
    hasStylePrefs: !!(profile?.preferredWarmth || profile?.preferredDetail || profile?.preferredLanguage),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Check if profile has enough data for personalization
 */
export function hasEnoughDataForPersonalization(
  profile: UserLearningProfile | null,
  corrections: CorrectionEntry[]
): boolean {
  // Need at least 3 corrections or a profile with patterns
  if (corrections.length >= 3) return true;
  if (profile?.avoidPatterns && profile.avoidPatterns.length >= 2) return true;
  if (profile?.preferredVoiceTraits && profile.preferredVoiceTraits.some(t => t.sampleSize >= 3)) return true;
  return false;
}

/**
 * Calculate personalization confidence score
 */
export function getPersonalizationConfidence(
  profile: UserLearningProfile | null,
  corrections: CorrectionEntry[]
): number {
  let score = 0;
  
  // Corrections contribute up to 40%
  const correctionScore = Math.min(corrections.length / 20, 1) * 0.4;
  score += correctionScore;
  
  // Profile contributes up to 60%
  if (profile) {
    // Interaction volume
    const interactionScore = Math.min(profile.totalInteractions / 50, 1) * 0.2;
    score += interactionScore;
    
    // Style preferences
    if (profile.preferredWarmth || profile.preferredDetail) {
      score += 0.15;
    }
    
    // Voice trait preferences
    if (profile.preferredVoiceTraits && profile.preferredVoiceTraits.some(t => t.sampleSize >= 5)) {
      score += 0.15;
    }
    
    // Avoid patterns
    if (profile.avoidPatterns && profile.avoidPatterns.length >= 3) {
      score += 0.1;
    }
  }
  
  return Math.min(score, 1);
}
