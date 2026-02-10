/**
 * Validation Pipeline
 * 
 * Orchestrates validation agents to validate content.
 */

import type { GenerationContext, TrustCertification } from '../../types';
import type {
  ValidationConfig,
  PipelineValidationResult,
  AgentValidationResult,
  ValidationViolation,
  ValidationAgentId,
} from './types';
import { DEFAULT_VALIDATION_CONFIG, AGENT_WEIGHTS } from './types';
import { getEnabledAgents, VALIDATION_AGENTS } from './agents';

// =============================================================================
// Position-Based Deduplication
// =============================================================================

/**
 * Deduplicate violations by position overlap
 * 
 * When multiple agents flag the same word/phrase (e.g., "utilize" caught by
 * both style_consistency regex and avoid_words agent), keep only the one
 * with higher severity to avoid double-counting in scores.
 */
function deduplicateViolations(violations: ValidationViolation[]): ValidationViolation[] {
  if (violations.length === 0) return [];
  
  const severityRank: Record<string, number> = { error: 3, warning: 2, info: 1 };
  
  // Sort by position start
  const sorted = [...violations].sort((a, b) => {
    const aStart = a.position?.start ?? 0;
    const bStart = b.position?.start ?? 0;
    return aStart - bStart;
  });
  
  const result: ValidationViolation[] = [];
  
  for (const v of sorted) {
    // Check if any existing result overlaps this position
    const overlappingIndex = result.findIndex(existing => {
      if (!existing.position || !v.position) return false;
      // Check for overlap: ranges overlap if one starts before the other ends
      return (
        existing.position.start <= v.position.end &&
        existing.position.end >= v.position.start
      );
    });
    
    if (overlappingIndex >= 0) {
      const existing = result[overlappingIndex];
      // Keep the higher-severity one
      const existingSeverity = severityRank[existing.severity] || 0;
      const newSeverity = severityRank[v.severity] || 0;
      
      if (newSeverity > existingSeverity) {
        result[overlappingIndex] = v;
      }
      // Otherwise keep existing (skip this one)
    } else {
      result.push(v);
    }
  }
  
  return result;
}

/**
 * Run validation pipeline on content
 */
export async function runValidationPipeline(
  content: string,
  _context?: GenerationContext,
  config: Partial<ValidationConfig> = {}
): Promise<PipelineValidationResult> {
  const startTime = performance.now();
  
  const fullConfig: ValidationConfig = {
    ...DEFAULT_VALIDATION_CONFIG,
    ...config,
  };
  
  const agents = getEnabledAgents(fullConfig.enabledAgents);
  
  // Run all agents
  const agentResults: AgentValidationResult[] = agents.map(agent => {
    const agentStart = performance.now();
    const violations = agent.runPatternValidation(content);
    const score = agent.calculateScore(violations);
    
    return {
      agentId: agent.id,
      agentName: agent.name,
      passed: violations.filter(v => v.severity === 'error').length === 0,
      score,
      violations,
      suggestions: violations.map(v => v.suggestion),
      processingTimeMs: performance.now() - agentStart,
      usedLLM: false,
    };
  });
  
  // Calculate overall results with position-based deduplication
  const rawViolations = agentResults.flatMap(r => r.violations);
  const allViolations = deduplicateViolations(rawViolations);
  const errorCount = allViolations.filter(v => v.severity === 'error').length;
  const autoFixableCount = allViolations.filter(v => v.autoFixable).length;
  
  // Calculate weighted overall score
  const overallScore = calculateOverallScore(agentResults);
  
  // Determine certification level
  const certification = determineCertification(overallScore, errorCount);
  
  return {
    passed: certification !== 'issues_found',
    overallScore,
    certification,
    agentResults,
    totalViolations: allViolations.length,
    autoFixableCount,
    processingTimeMs: performance.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Calculate weighted overall score
 */
function calculateOverallScore(results: AgentValidationResult[]): number {
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const result of results) {
    const weight = AGENT_WEIGHTS[result.agentId] || 10;
    totalWeight += weight;
    weightedScore += result.score * weight;
  }
  
  if (totalWeight === 0) return 100;
  return Math.round(weightedScore / totalWeight);
}

/**
 * Determine certification level based on score
 */
function determineCertification(score: number, errorCount: number): TrustCertification {
  if (errorCount > 2) return 'issues_found';
  if (score >= 90) return 'certified';
  if (score >= 70) return 'review_recommended';
  return 'issues_found';
}

/**
 * Quick validation - pattern matching only
 */
export function runQuickValidation(
  content: string,
  agentIds?: ValidationAgentId[]
): PipelineValidationResult {
  const startTime = performance.now();
  
  const agents = agentIds
    ? getEnabledAgents(agentIds)
    : Object.values(VALIDATION_AGENTS);
  
  const agentResults: AgentValidationResult[] = agents.map(agent => {
    const agentStart = performance.now();
    const violations = agent.runPatternValidation(content);
    const score = agent.calculateScore(violations);
    
    return {
      agentId: agent.id,
      agentName: agent.name,
      passed: violations.filter(v => v.severity === 'error').length === 0,
      score,
      violations,
      suggestions: violations.map(v => v.suggestion),
      processingTimeMs: performance.now() - agentStart,
      usedLLM: false,
    };
  });
  
  const rawViolations = agentResults.flatMap(r => r.violations);
  const allViolations = deduplicateViolations(rawViolations);
  const errorCount = allViolations.filter(v => v.severity === 'error').length;
  const autoFixableCount = allViolations.filter(v => v.autoFixable).length;
  
  const overallScore = agentResults.length > 0
    ? Math.round(agentResults.reduce((sum, r) => sum + r.score, 0) / agentResults.length)
    : 100;
  
  const certification = determineCertification(overallScore, errorCount);
  
  return {
    passed: certification !== 'issues_found',
    overallScore,
    certification,
    agentResults,
    totalViolations: allViolations.length,
    autoFixableCount,
    processingTimeMs: performance.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Get violation summary
 */
export function getViolationSummary(result: PipelineValidationResult): {
  error: ValidationViolation[];
  warning: ValidationViolation[];
  info: ValidationViolation[];
} {
  const allViolations = result.agentResults.flatMap(r => r.violations);
  
  return {
    error: allViolations.filter(v => v.severity === 'error'),
    warning: allViolations.filter(v => v.severity === 'warning'),
    info: allViolations.filter(v => v.severity === 'info'),
  };
}

export default {
  runValidationPipeline,
  runQuickValidation,
  getViolationSummary,
};
