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
  
  // Calculate overall results
  const allViolations = agentResults.flatMap(r => r.violations);
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
  
  const allViolations = agentResults.flatMap(r => r.violations);
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
