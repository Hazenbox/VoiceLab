/**
 * Validation Pipeline
 * 
 * Orchestrates the 7 validation agents to validate content.
 * Supports pattern-based fast validation and parallel execution.
 * 
 * @module services/validation/validationPipeline
 */

import type { GenerationContext, ValidationStrictness } from '../../types';
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
  context: GenerationContext,
  config: Partial<ValidationConfig> = {}
): Promise<PipelineValidationResult> {
  const startTime = performance.now();
  
  // Merge with defaults
  const fullConfig: ValidationConfig = {
    ...DEFAULT_VALIDATION_CONFIG,
    ...config,
  };
  
  // Get enabled agents
  const agents = getEnabledAgents(fullConfig.enabledAgents);
  
  // Run validation
  let agentResults: AgentValidationResult[];
  
  if (fullConfig.parallelExecution) {
    // Run all agents in parallel
    agentResults = await Promise.all(
      agents.map(agent => runAgentValidation(agent.id, content, context, fullConfig))
    );
  } else {
    // Run agents sequentially
    agentResults = [];
    for (const agent of agents) {
      const result = await runAgentValidation(agent.id, content, context, fullConfig);
      agentResults.push(result);
    }
  }
  
  // Calculate overall results
  const allViolations = agentResults.flatMap(r => r.violations);
  const criticalViolations = allViolations.filter(v => v.severity === 'critical').length;
  
  // Calculate weighted overall score
  const overallScore = calculateOverallScore(agentResults, fullConfig.strictness);
  
  // Determine certification level
  const certification = determineCertification(overallScore, criticalViolations);
  
  const executionTime = performance.now() - startTime;
  
  return {
    passed: certification !== 'blocked',
    overallScore,
    certification,
    agentResults,
    totalViolations: allViolations.length,
    criticalViolations,
    executionTime,
    timestamp: new Date(),
  };
}

/**
 * Run a single agent validation
 */
async function runAgentValidation(
  agentId: ValidationAgentId,
  content: string,
  context: GenerationContext,
  config: ValidationConfig
): Promise<AgentValidationResult> {
  const startTime = performance.now();
  const agent = VALIDATION_AGENTS[agentId];
  
  let violations: ValidationViolation[] = [];
  let method: 'pattern' | 'llm' | 'hybrid' = 'pattern';
  
  // Run pattern matching first (fast)
  if (!config.skipPatternMatching) {
    violations = agent.runPatternValidation(content);
  }
  
  // Filter violations based on strictness
  violations = filterByStrictness(violations, config.strictness);
  
  // Calculate score
  const score = agent.calculateScore(violations);
  
  const executionTime = performance.now() - startTime;
  
  return {
    agentId,
    agentName: agent.name,
    passed: violations.filter(v => v.severity === 'critical' || v.severity === 'error').length === 0,
    score,
    violations,
    executionTime,
    method,
  };
}

/**
 * Filter violations based on strictness level
 */
function filterByStrictness(
  violations: ValidationViolation[],
  strictness: ValidationStrictness
): ValidationViolation[] {
  switch (strictness) {
    case 'strict':
      // Return all violations
      return violations;
    case 'balanced':
      // Return critical, error, and warning
      return violations.filter(v => v.severity !== 'info');
    case 'lenient':
      // Return only critical and error
      return violations.filter(v => v.severity === 'critical' || v.severity === 'error');
    default:
      return violations;
  }
}

/**
 * Calculate weighted overall score
 */
function calculateOverallScore(
  results: AgentValidationResult[],
  strictness: ValidationStrictness
): number {
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const result of results) {
    const weight = AGENT_WEIGHTS[result.agentId] || 10;
    totalWeight += weight;
    weightedScore += result.score * weight;
  }
  
  if (totalWeight === 0) return 100;
  
  let score = weightedScore / totalWeight;
  
  // Apply strictness modifier
  switch (strictness) {
    case 'strict':
      // Stricter scoring - reduce score slightly
      score = score * 0.95;
      break;
    case 'lenient':
      // More lenient - boost score slightly
      score = Math.min(100, score * 1.05);
      break;
  }
  
  return Math.round(score);
}

/**
 * Determine certification level based on score and violations
 */
function determineCertification(
  score: number,
  criticalCount: number
): 'certified' | 'review' | 'blocked' {
  // Any critical violation = blocked
  if (criticalCount > 0) {
    return 'blocked';
  }
  
  // Score thresholds
  if (score >= 90) {
    return 'certified';
  } else if (score >= 70) {
    return 'review';
  } else {
    return 'blocked';
  }
}

/**
 * Quick validation - pattern matching only, no LLM
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
      passed: violations.filter(v => v.severity === 'critical' || v.severity === 'error').length === 0,
      score,
      violations,
      executionTime: performance.now() - agentStart,
      method: 'pattern' as const,
    };
  });
  
  const allViolations = agentResults.flatMap(r => r.violations);
  const criticalViolations = allViolations.filter(v => v.severity === 'critical').length;
  
  // Simple average for quick validation
  const overallScore = agentResults.length > 0
    ? Math.round(agentResults.reduce((sum, r) => sum + r.score, 0) / agentResults.length)
    : 100;
  
  const certification = determineCertification(overallScore, criticalViolations);
  
  return {
    passed: certification !== 'blocked',
    overallScore,
    certification,
    agentResults,
    totalViolations: allViolations.length,
    criticalViolations,
    executionTime: performance.now() - startTime,
    timestamp: new Date(),
  };
}

/**
 * Validate a specific aspect of content
 */
export function validateAspect(
  content: string,
  agentId: ValidationAgentId
): AgentValidationResult {
  const agent = VALIDATION_AGENTS[agentId];
  const startTime = performance.now();
  
  const violations = agent.runPatternValidation(content);
  const score = agent.calculateScore(violations);
  
  return {
    agentId: agent.id,
    agentName: agent.name,
    passed: violations.filter(v => v.severity === 'critical' || v.severity === 'error').length === 0,
    score,
    violations,
    executionTime: performance.now() - startTime,
    method: 'pattern',
  };
}

/**
 * Get summary of violations grouped by severity
 */
export function getViolationSummary(result: PipelineValidationResult): {
  critical: ValidationViolation[];
  error: ValidationViolation[];
  warning: ValidationViolation[];
  info: ValidationViolation[];
} {
  const allViolations = result.agentResults.flatMap(r => r.violations);
  
  return {
    critical: allViolations.filter(v => v.severity === 'critical'),
    error: allViolations.filter(v => v.severity === 'error'),
    warning: allViolations.filter(v => v.severity === 'warning'),
    info: allViolations.filter(v => v.severity === 'info'),
  };
}

/**
 * Get violations grouped by agent
 */
export function getViolationsByAgent(result: PipelineValidationResult): Map<ValidationAgentId, ValidationViolation[]> {
  const map = new Map<ValidationAgentId, ValidationViolation[]>();
  
  for (const agentResult of result.agentResults) {
    map.set(agentResult.agentId, agentResult.violations);
  }
  
  return map;
}

export default {
  runValidationPipeline,
  runQuickValidation,
  validateAspect,
  getViolationSummary,
  getViolationsByAgent,
};
