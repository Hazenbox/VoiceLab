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
  ComplianceJustification,
  GuardrailStatus,
  ValidationAgentSummary,
} from '../../types';
import { DEFAULT_TRUST_SETTINGS } from '../../types';
import type { PipelineValidationResult, ValidationAgentId } from '../validation/types';
import { BRAND_GUARDRAILS } from '../prompt/promptBuilder';

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
  readability: 'readability',
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
    readability: 100,
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

// =============================================================================
// COMPLIANCE JUSTIFICATION HELPERS
// =============================================================================

/**
 * Map of agent names to their rule counts
 */
const AGENT_RULE_COUNTS: Record<string, number> = {
  'Gender Neutrality': 5,
  'Inclusivity': 5,
  'Cultural Sensitivity': 3,
  'Accessibility': 3,
  'Compliance': 3,
  'Style Consistency': 5,
  'Brand Alignment': 2,
};

/**
 * Map of agent names to their key rules for display
 */
const AGENT_KEY_RULES: Record<string, string[]> = {
  'Gender Neutrality': [
    'Gender-neutral job titles',
    'Inclusive pronouns',
    'Non-gendered language',
  ],
  'Inclusivity': [
    'Person-first language',
    'No assumptions about ability',
    'Avoids elitist terms',
  ],
  'Cultural Sensitivity': [
    'No regional stereotypes',
    'Culturally respectful',
    'Avoids sensitive references',
  ],
  'Accessibility': [
    'Descriptive link text',
    'Color-independent references',
    'Text alternatives provided',
  ],
  'Compliance': [
    'No absolute claims',
    'Terms clearly stated',
    'Substantiated superlatives',
  ],
  'Style Consistency': [
    'Correct brand capitalization',
    'Simple language used',
    'Professional punctuation',
  ],
  'Brand Alignment': [
    'Warm, friendly tone',
    'Positive framing',
    'User-centric language',
  ],
};

/**
 * Map guardrail IDs to relevant agent score keys
 */
const GUARDRAIL_TO_AGENTS: Record<string, (keyof TrustScoreBreakdown)[]> = {
  warmth: ['brandAlignment', 'styleConsistency'],
  no_jargon: ['styleConsistency', 'accessibility'],
  action_clarity: ['accessibility', 'compliance'],
  respect_time: ['styleConsistency'],
  inclusive: ['genderNeutrality', 'inclusivity', 'culturalSensitivity'],
  no_elitism: ['inclusivity'],
  empathy: ['brandAlignment'],
  trust_transparency: ['compliance', 'brandAlignment'],
  celebrate: ['brandAlignment'],
  dignity: ['inclusivity', 'culturalSensitivity', 'brandAlignment'],
};

/**
 * Safely truncate content for display (prevents data leaks)
 */
function truncateContent(content: string, maxLength: number = 150): string {
  if (!content) return '';
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength).trim() + '...';
}

/**
 * Determine guardrail compliance status based on trust score
 */
function determineGuardrailStatus(
  trustScore: TrustScore,
  guardrailId: string
): 'followed' | 'partial' {
  const relevantAgents = GUARDRAIL_TO_AGENTS[guardrailId] || [];
  
  if (relevantAgents.length === 0) {
    // No specific agent mapping, use overall score
    return trustScore.overall >= 90 ? 'followed' : 'partial';
  }
  
  // Calculate average score from relevant agents
  const scores = relevantAgents.map(key => trustScore.breakdown[key]);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  
  return avgScore >= 90 ? 'followed' : 'partial';
}

/**
 * Get the total number of rules for an agent
 */
function getAgentRuleCount(agentName: string): number {
  return AGENT_RULE_COUNTS[agentName] || 3;
}

/**
 * Get the key rules that passed for a validation result
 */
function getPassedRules(validationResult: ValidationResult): string[] {
  const keyRules = AGENT_KEY_RULES[validationResult.agentName] || [];
  const violatedRules = new Set(validationResult.violations.map(v => v.rule));
  
  // Return rules that weren't violated
  return keyRules.filter(rule => {
    // Check if any violation matches this key rule (partial match)
    return !Array.from(violatedRules).some(violated => 
      violated.toLowerCase().includes(rule.toLowerCase().split(' ')[0])
    );
  });
}

/**
 * Generate intelligence indicators based on trust score analysis
 */
function generateIntelligenceIndicators(trustScore: TrustScore): string[] {
  const indicators: string[] = [];
  
  // Processing speed indicator
  if (trustScore.processingTimeMs < 100) {
    indicators.push('Real-time analysis');
  } else if (trustScore.processingTimeMs < 500) {
    indicators.push('Quick validation');
  }
  
  // Confidence indicator
  if (trustScore.confidence === 'high') {
    indicators.push('High confidence');
  }
  
  // Multi-agent indicator
  if (trustScore.validationResults.length >= 5) {
    indicators.push(`${trustScore.validationResults.length} AI agents`);
  }
  
  // Perfect score indicator
  if (trustScore.overall === 100) {
    indicators.push('Perfect compliance');
  } else if (trustScore.overall >= 95) {
    indicators.push('Excellent compliance');
  }
  
  // Auto-fix capability
  if (trustScore.autoFixableCount > 0) {
    indicators.push('Auto-fix available');
  }
  
  // Brand guardrails indicator
  indicators.push('10 brand guardrails');
  
  // Certification status
  if (trustScore.certified) {
    indicators.push('Jio Certified');
  }
  
  return indicators.slice(0, 5); // Limit to 5 indicators
}

/**
 * Get compliance justification for building user trust
 * Shows which rules have been followed with detailed breakdown
 */
export function getComplianceJustification(
  content: string,
  trustScore: TrustScore
): ComplianceJustification {
  // 1. Truncate content for safe display (prevent data leaks)
  const analyzedContent = truncateContent(content, 150);
  
  // 2. Map brand guardrails to followed status
  const guardrailsFollowed: GuardrailStatus[] = BRAND_GUARDRAILS.map(g => ({
    id: g.id,
    rule: g.rule,
    description: g.description,
    status: determineGuardrailStatus(trustScore, g.id),
    confidence: trustScore.confidence === 'low' ? 'medium' : 'high',
  }));
  
  // 3. Extract validation rules passed from each agent
  const validationsPassed: ValidationAgentSummary[] = trustScore.validationResults.map(vr => {
    const rulesChecked = getAgentRuleCount(vr.agentName);
    const rulesPassed = Math.max(0, rulesChecked - vr.violations.length);
    
    return {
      agentId: vr.agentName.toLowerCase().replace(/\s/g, '_'),
      agentName: vr.agentName,
      rulesChecked,
      rulesPassed,
      keyRulesFollowed: getPassedRules(vr),
    };
  });
  
  // 4. Build trust summary
  const totalRulesChecked = validationsPassed.reduce((sum, v) => sum + v.rulesChecked, 0);
  const totalRulesPassed = validationsPassed.reduce((sum, v) => sum + v.rulesPassed, 0);
  const compliancePercentage = totalRulesChecked > 0 
    ? Math.round((totalRulesPassed / totalRulesChecked) * 100) 
    : 100;
  
  return {
    analyzedContent,
    guardrailsFollowed,
    validationsPassed,
    trustSummary: {
      totalRulesChecked,
      totalRulesPassed,
      compliancePercentage,
      intelligenceIndicators: generateIntelligenceIndicators(trustScore),
    },
  };
}

export default {
  calculateTrustScore,
  getCertificationBadge,
  formatScore,
  getScoreColor,
  getScoreExplanation,
  shouldBlockContent,
  getComplianceJustification,
};
