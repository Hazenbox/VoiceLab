/**
 * Trust Score Calculator
 * 
 * Calculates comprehensive trust scores from validation results.
 * Provides detailed breakdowns, certification levels, and recommendations.
 * 
 * @module services/trust/trustScoreCalculator
 */

import type { 
  TrustScore, 
  TrustScoreBreakdown, 
  TrustCertification,
  TrustSettings,
  GenerationContext,
  Violation,
} from '../../types';
import { DEFAULT_TRUST_SETTINGS } from '../../types';
import type { 
  PipelineValidationResult, 
  AgentValidationResult,
  ValidationAgentId,
} from '../validation/types';
import { AGENT_WEIGHTS } from '../validation/types';

/**
 * Agent display names for UI
 */
const AGENT_DISPLAY_NAMES: Record<ValidationAgentId, string> = {
  gender_neutrality: 'Gender Neutrality',
  elitism: 'Elitism Check',
  cultural_sensitivity: 'Cultural Sensitivity',
  disability_inclusion: 'Disability Inclusion',
  compliance: 'Compliance',
  style_grammar: 'Style & Grammar',
  accessibility: 'Accessibility',
};

/**
 * Calculate trust score from validation results
 */
export function calculateTrustScore(
  validationResult: PipelineValidationResult,
  context: GenerationContext,
  settings: TrustSettings = DEFAULT_TRUST_SETTINGS
): TrustScore {
  // Build breakdown from agent results
  const breakdown = buildScoreBreakdown(validationResult.agentResults);
  
  // Calculate overall score (already done in pipeline, but we can recalculate for customization)
  const overallScore = validationResult.overallScore;
  
  // Determine certification based on settings thresholds
  const certification = determineCertification(
    overallScore,
    validationResult.criticalViolations,
    settings
  );
  
  // Check if certified (green)
  const isCertified = certification === 'certified';
  
  // Map violations to our format
  const violations = validationResult.agentResults.flatMap(agentResult =>
    agentResult.violations.map(v => ({
      agentId: v.agentId,
      severity: v.severity,
      message: v.message,
      suggestion: v.suggestion,
      location: v.location,
    }))
  );
  
  return {
    overall: overallScore,
    breakdown,
    certification,
    isCertified,
    violations,
    timestamp: validationResult.timestamp.toISOString(),
    executionTime: validationResult.executionTime,
  };
}

/**
 * Build score breakdown from agent results
 */
function buildScoreBreakdown(agentResults: AgentValidationResult[]): TrustScoreBreakdown {
  const breakdown: TrustScoreBreakdown = {
    genderNeutrality: 100,
    elitism: 100,
    culturalSensitivity: 100,
    disabilityInclusion: 100,
    compliance: 100,
    styleGrammar: 100,
    accessibility: 100,
  };
  
  for (const result of agentResults) {
    switch (result.agentId) {
      case 'gender_neutrality':
        breakdown.genderNeutrality = result.score;
        break;
      case 'elitism':
        breakdown.elitism = result.score;
        break;
      case 'cultural_sensitivity':
        breakdown.culturalSensitivity = result.score;
        break;
      case 'disability_inclusion':
        breakdown.disabilityInclusion = result.score;
        break;
      case 'compliance':
        breakdown.compliance = result.score;
        break;
      case 'style_grammar':
        breakdown.styleGrammar = result.score;
        break;
      case 'accessibility':
        breakdown.accessibility = result.score;
        break;
    }
  }
  
  return breakdown;
}

/**
 * Determine certification level based on score and settings
 */
function determineCertification(
  score: number,
  criticalCount: number,
  settings: TrustSettings
): TrustCertification {
  // Any critical violation blocks
  if (criticalCount > 0) {
    return 'blocked';
  }
  
  // Use custom thresholds from settings
  if (score >= settings.certificationThreshold) {
    return 'certified';
  } else if (score >= settings.blockingThreshold) {
    return 'review';
  } else {
    return 'blocked';
  }
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
    case 'review':
      return {
        color: 'yellow',
        label: 'Review',
        description: 'Content has minor issues to address',
        icon: '!',
      };
    case 'blocked':
      return {
        color: 'red',
        label: 'Blocked',
        description: 'Content has serious violations',
        icon: '✕',
      };
  }
}

/**
 * Get detailed score explanation for TrustContextPanel
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
  const agentBreakdown: Array<{
    name: string;
    score: number;
    status: 'pass' | 'warning' | 'fail';
    violations: number;
  }> = [];
  
  // Build agent breakdown
  const breakdownMap: Record<keyof TrustScoreBreakdown, ValidationAgentId> = {
    genderNeutrality: 'gender_neutrality',
    elitism: 'elitism',
    culturalSensitivity: 'cultural_sensitivity',
    disabilityInclusion: 'disability_inclusion',
    compliance: 'compliance',
    styleGrammar: 'style_grammar',
    accessibility: 'accessibility',
  };
  
  for (const [key, agentId] of Object.entries(breakdownMap)) {
    const score = trustScore.breakdown[key as keyof TrustScoreBreakdown];
    const agentViolations = trustScore.violations.filter(v => v.agentId === agentId);
    
    agentBreakdown.push({
      name: AGENT_DISPLAY_NAMES[agentId],
      score,
      status: score >= 90 ? 'pass' : score >= 70 ? 'warning' : 'fail',
      violations: agentViolations.length,
    });
  }
  
  // Sort by score (worst first)
  agentBreakdown.sort((a, b) => a.score - b.score);
  
  // Generate recommendations
  const recommendations = generateRecommendations(trustScore);
  
  // Generate summary
  const summary = generateSummary(trustScore, agentBreakdown);
  
  return {
    summary,
    agentBreakdown,
    recommendations,
  };
}

/**
 * Generate recommendations based on violations
 */
function generateRecommendations(trustScore: TrustScore): string[] {
  const recommendations: string[] = [];
  const violationsByCategory = new Map<string, number>();
  
  // Count violations by category
  for (const violation of trustScore.violations) {
    const count = violationsByCategory.get(violation.agentId) || 0;
    violationsByCategory.set(violation.agentId, count + 1);
  }
  
  // Generate recommendations for worst categories
  const sortedCategories = [...violationsByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  for (const [agentId, count] of sortedCategories) {
    const agentName = AGENT_DISPLAY_NAMES[agentId as ValidationAgentId] || agentId;
    
    switch (agentId) {
      case 'gender_neutrality':
        recommendations.push(`Review ${count} gender-related term(s). Use "they/them" and gender-neutral job titles.`);
        break;
      case 'elitism':
        recommendations.push(`Remove ${count} elitist phrase(s). Avoid assumptions about education or status.`);
        break;
      case 'cultural_sensitivity':
        recommendations.push(`Address ${count} cultural issue(s). Respect regional and religious diversity.`);
        break;
      case 'disability_inclusion':
        recommendations.push(`Fix ${count} ableist term(s). Use person-first language.`);
        break;
      case 'compliance':
        recommendations.push(`Verify ${count} compliance item(s). Check claims and add disclaimers.`);
        break;
      case 'style_grammar':
        recommendations.push(`Correct ${count} style issue(s). Simplify language and follow brand voice.`);
        break;
      case 'accessibility':
        recommendations.push(`Improve ${count} accessibility item(s). Use descriptive text and simpler sentences.`);
        break;
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Content meets brand guidelines. Great job!');
  }
  
  return recommendations;
}

/**
 * Generate summary text
 */
function generateSummary(
  trustScore: TrustScore,
  agentBreakdown: Array<{ name: string; score: number; status: string; violations: number }>
): string {
  const totalViolations = trustScore.violations.length;
  const criticalCount = trustScore.violations.filter(v => v.severity === 'critical').length;
  
  if (trustScore.certification === 'certified') {
    if (totalViolations === 0) {
      return 'Content fully complies with all Jio brand guidelines. No issues found.';
    }
    return `Content is certified with ${totalViolations} minor suggestion(s) to consider.`;
  }
  
  if (trustScore.certification === 'review') {
    return `Content needs review. Found ${totalViolations} issue(s) across ${agentBreakdown.filter(a => a.violations > 0).length} category(ies).`;
  }
  
  // Blocked
  if (criticalCount > 0) {
    return `Content blocked due to ${criticalCount} critical violation(s). Please fix before publishing.`;
  }
  return `Content does not meet minimum standards (score: ${trustScore.overall}). Multiple issues need attention.`;
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
 * Check if content should be blocked based on settings
 */
export function shouldBlockContent(
  trustScore: TrustScore,
  settings: TrustSettings
): boolean {
  if (!settings.blockBelowThreshold) return false;
  return trustScore.certification === 'blocked';
}

/**
 * Get top violations for quick display
 */
export function getTopViolations(trustScore: TrustScore, limit: number = 3): Violation[] {
  // Sort by severity (critical first)
  const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
  
  return [...trustScore.violations]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, limit);
}

export default {
  calculateTrustScore,
  getCertificationBadge,
  getScoreExplanation,
  formatScore,
  getScoreColor,
  shouldBlockContent,
  getTopViolations,
};
