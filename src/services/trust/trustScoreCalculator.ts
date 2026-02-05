/**
 * Trust Score Calculator
 * 
 * Calculates trust scores from validation results.
 */

import type { 
  TrustScore, 
  TrustScoreBreakdown, 
  TrustCertification,
  TrustSettings,
  ValidationResult,
} from '../../types';
import { DEFAULT_TRUST_SETTINGS } from '../../types';
import type { PipelineValidationResult, ValidationAgentId } from '../validation/types';

/**
 * Map agent IDs to breakdown fields
 */
const AGENT_TO_BREAKDOWN: Record<ValidationAgentId, keyof TrustScoreBreakdown> = {
  gender_neutrality: 'genderNeutrality',
  inclusivity: 'inclusivity',
  cultural_sensitivity: 'culturalSensitivity',
  accessibility: 'accessibility',
  compliance: 'compliance',
  style_consistency: 'styleConsistency',
  brand_alignment: 'brandAlignment',
};

/**
 * Calculate trust score from validation results
 */
export function calculateTrustScore(
  validationResult: PipelineValidationResult,
  settings: TrustSettings = DEFAULT_TRUST_SETTINGS
): TrustScore {
  // Build breakdown
  const breakdown: TrustScoreBreakdown = {
    genderNeutrality: 100,
    inclusivity: 100,
    culturalSensitivity: 100,
    accessibility: 100,
    compliance: 100,
    styleConsistency: 100,
    brandAlignment: 100,
  };
  
  // Convert to validation results format
  const validationResults: ValidationResult[] = validationResult.agentResults.map(ar => ({
    agentName: ar.agentName,
    passed: ar.passed,
    score: ar.score,
    violations: ar.violations,
    suggestions: ar.suggestions,
    autoFixes: ar.violations.filter(v => v.autoFixable).map(v => ({
      original: v.text,
      replacement: v.suggestion,
      confidence: 0.8,
      rule: v.rule,
      violation: v,
    })),
    processingTimeMs: ar.processingTimeMs,
    usedLLM: ar.usedLLM,
  }));
  
  // Fill breakdown from agent results
  for (const result of validationResult.agentResults) {
    const breakdownKey = AGENT_TO_BREAKDOWN[result.agentId];
    if (breakdownKey) {
      breakdown[breakdownKey] = result.score;
    }
  }
  
  const overallScore = validationResult.overallScore;
  
  // Determine certification
  let certification: TrustCertification = 'issues_found';
  if (overallScore >= settings.minimumScore) {
    certification = 'certified';
  } else if (overallScore >= 70) {
    certification = 'review_recommended';
  }
  
  // Determine confidence
  const confidence: 'high' | 'medium' | 'low' = 
    validationResult.processingTimeMs < 100 ? 'high' :
    validationResult.processingTimeMs < 500 ? 'medium' : 'low';
  
  return {
    overall: overallScore,
    breakdown,
    confidence,
    certified: certification === 'certified',
    certification,
    validationResults,
    totalViolations: validationResult.totalViolations,
    autoFixableCount: validationResult.autoFixableCount,
    processingTimeMs: validationResult.processingTimeMs,
  };
}

/**
 * Get certification badge info for UI
 */
export function getCertificationBadge(certification: TrustCertification): {
  color: 'green' | 'yellow' | 'red';
  label: string;
  description: string;
  icon: string;
} {
  switch (certification) {
    case 'certified':
      return {
        color: 'green',
        label: 'Certified',
        description: 'Content meets all brand guidelines',
        icon: '✓',
      };
    case 'review_recommended':
      return {
        color: 'yellow',
        label: 'Review',
        description: 'Content has minor issues',
        icon: '!',
      };
    case 'issues_found':
      return {
        color: 'red',
        label: 'Issues',
        description: 'Content has violations',
        icon: '✕',
      };
  }
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return `${Math.round(score)}`;
}

/**
 * Get score color for UI
 */
export function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

/**
 * Get score explanation
 */
export function getScoreExplanation(trustScore: TrustScore): {
  summary: string;
  agentBreakdown: Array<{
    name: string;
    score: number;
    status: 'pass' | 'warning' | 'fail';
    violations: number;
  }>;
  recommendations: string[];
} {
  const agentBreakdown = trustScore.validationResults.map(vr => ({
    name: vr.agentName,
    score: vr.score,
    status: (vr.score >= 90 ? 'pass' : vr.score >= 70 ? 'warning' : 'fail') as 'pass' | 'warning' | 'fail',
    violations: vr.violations.length,
  }));
  
  // Sort by score
  agentBreakdown.sort((a, b) => a.score - b.score);
  
  // Generate recommendations
  const recommendations: string[] = [];
  for (const agent of agentBreakdown) {
    if (agent.violations > 0) {
      recommendations.push(`Review ${agent.violations} issue(s) in ${agent.name}`);
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Content meets all guidelines. Great job!');
  }
  
  // Generate summary
  let summary = '';
  if (trustScore.certified) {
    summary = trustScore.totalViolations === 0
      ? 'Content fully complies with all Jio brand guidelines.'
      : `Content is certified with ${trustScore.totalViolations} minor suggestion(s).`;
  } else if (trustScore.certification === 'review_recommended') {
    summary = `Content needs review. Found ${trustScore.totalViolations} issue(s).`;
  } else {
    summary = `Content has issues (score: ${trustScore.overall}). Multiple issues need attention.`;
  }
  
  return { summary, agentBreakdown, recommendations };
}

/**
 * Check if content should be blocked
 */
export function shouldBlockContent(trustScore: TrustScore, settings: TrustSettings): boolean {
  if (!settings.blockBelowThreshold) return false;
  return trustScore.overall < settings.minimumScore;
}

export default {
  calculateTrustScore,
  getCertificationBadge,
  formatScore,
  getScoreColor,
  getScoreExplanation,
  shouldBlockContent,
};
