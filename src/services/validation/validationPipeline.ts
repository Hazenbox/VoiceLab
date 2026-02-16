/**
 * Validation Pipeline
 * 
 * Orchestrates validation agents to validate content.
 */

import type { GenerationContext, TrustCertification, ContentChannelType } from '../../types';
import type {
  ValidationConfig,
  PipelineValidationResult,
  AgentValidationResult,
  ValidationViolation,
  ValidationAgentId,
} from './types';
import { DEFAULT_VALIDATION_CONFIG, AGENT_WEIGHTS } from './types';
import { getEnabledAgents, VALIDATION_AGENTS } from './agents';
import { getChannel } from '../guidelines/channels';
import { createLogger } from '../../utils/logger';

const log = createLogger('Validation');

// =============================================================================
// Position-Based Deduplication
// =============================================================================

/**
 * Deduplicate violations by position overlap
 * 
 * When multiple agents flag the same word/phrase (e.g., "utilize" caught by
 * both style_consistency regex and avoid_words agent), keep only the one
 * with higher severity to avoid double-counting in scores.
 * 
 * IMPORTANT: When merging, preserve autoFixable=true if ANY violation has it.
 */
function deduplicateViolations(violations: ValidationViolation[]): ValidationViolation[] {
  if (violations.length === 0) return [];
  
  const severityRank: Record<string, number> = { error: 3, warning: 2, info: 1 };
  
  // Sort by position start, then by whether it has autoFixable (prioritize autoFixable)
  const sorted = [...violations].sort((a, b) => {
    const aStart = a.position?.start ?? -1;  // Use -1 for missing positions
    const bStart = b.position?.start ?? -1;
    if (aStart !== bStart) return aStart - bStart;
    // If same position, prioritize autoFixable=true
    if (a.autoFixable && !b.autoFixable) return -1;
    if (!a.autoFixable && b.autoFixable) return 1;
    return 0;
  });
  
  const result: ValidationViolation[] = [];
  
  for (const v of sorted) {
    // Skip violations without valid positions (can't deduplicate properly)
    if (!v.position || v.position.start === undefined || v.position.end === undefined) {
      result.push(v);
      continue;
    }
    
    // Check if any existing result overlaps this position (exact or near-exact match)
    // Only merge violations at the SAME POSITION - different positions = different violations
    const overlappingIndex = result.findIndex(existing => {
      if (!existing.position || existing.position.start === undefined) return false;
      
      const existingLength = existing.position.end - existing.position.start;
      const newLength = v.position!.end - v.position!.start;
      
      // SKIP document-level violations (spanning > 100 chars) - they shouldn't absorb word-level ones
      // A "Readability" violation spanning the whole document shouldn't merge with "circle back" at pos 225
      if (existingLength > 100 && newLength < 50) {
        return false;  // Don't merge word-level violations into document-level ones
      }
      if (newLength > 100 && existingLength < 50) {
        return false;  // Don't merge document-level violations into word-level ones
      }
      
      // Check for EXACT position overlap (same start AND end) - same span from different agents
      if (existing.position.start === v.position!.start && 
          existing.position.end === v.position!.end) {
        return true;
      }
      
      // Check for significant overlap (> 80% of the smaller span)
      // This handles cases where agents detect slightly different spans for the same word
      const minLength = Math.min(existingLength, newLength);
      
      const overlapStart = Math.max(existing.position.start, v.position!.start);
      const overlapEnd = Math.min(existing.position.end, v.position!.end);
      const overlapLength = Math.max(0, overlapEnd - overlapStart);
      
      // Only consider it overlapping if they share > 80% of the smaller term
      const isOverlap = overlapLength > minLength * 0.8;
      
      return isOverlap;
    });
    
    if (overlappingIndex >= 0) {
      const existing = result[overlappingIndex];
      const existingSeverity = severityRank[existing.severity] || 0;
      const newSeverity = severityRank[v.severity] || 0;
      
      // Decide which to keep: higher severity wins, but PRESERVE autoFixable
      if (newSeverity > existingSeverity) {
        // New violation has higher severity - use it but preserve autoFixable
        result[overlappingIndex] = {
          ...v,
          autoFixable: v.autoFixable || existing.autoFixable,
        };
      } else {
        // Keep existing but ensure autoFixable is preserved
        result[overlappingIndex] = {
          ...existing,
          autoFixable: existing.autoFixable || v.autoFixable,
        };
      }
    } else {
      result.push(v);
    }
  }
  
  return result;
}

// =============================================================================
// Channel Constraint Validation
// =============================================================================

/**
 * Email structure detection patterns (flexible, case-insensitive)
 * These are soft checks - we don't want to fail just because the LLM
 * used slightly different formatting
 */
const EMAIL_STRUCTURE_PATTERNS = {
  subject: /subject\s*(?:line)?\s*:/i,
  cta: /(?:\[.+\]|\bclick\b|\btap\b|\bget\b|\bstart\b|\brecharge\b|\bview\b|\bsee\b|\bcheck\b)/i,
  greeting: /(?:^|\n)\s*(?:hi|hello|dear|namaste|hey|good\s+(?:morning|afternoon|evening))/i,
  signoff: /(?:thanks|thank\s+you|regards|best|warm|cheers|sincerely|love)/i,
};

/**
 * Validate channel-specific constraints on generated content
 * Returns violations for length and structure issues
 */
function validateChannelConstraints(
  content: string,
  channelId?: ContentChannelType
): ValidationViolation[] {
  if (!channelId) return [];
  
  const violations: ValidationViolation[] = [];
  
  try {
    const channel = getChannel(channelId);
    
    // Check minimum length constraint (email channels)
    if (channel.minLength && content.length < channel.minLength) {
      violations.push({
        severity: 'warning',
        rule: `Content too short for ${channel.name}`,
        text: `${content.length} characters (minimum: ${channel.minLength})`,
        suggestion: `${channel.name} requires at least ${channel.minLength} characters for proper structure. Include all required sections.`,
        category: 'channel_constraints',
        position: { start: 0, end: content.length },
        autoFixable: false,
        agentId: 'compliance' as ValidationAgentId,
      });
    }
    
    // Check maximum length constraint
    if (channel.maxLength && content.length > channel.maxLength) {
      violations.push({
        severity: 'error',
        rule: `Content too long for ${channel.name}`,
        text: `${content.length} characters (maximum: ${channel.maxLength})`,
        suggestion: `Reduce content to under ${channel.maxLength} characters. Focus on the most important information.`,
        category: 'channel_constraints',
        position: { start: channel.maxLength, end: content.length },
        autoFixable: false,
        agentId: 'compliance' as ValidationAgentId,
      });
    }
    
    // Email-specific structure checks (soft warnings)
    if (channelId === 'marketing_email' || channelId === 'transactional_email') {
      const missingStructure: string[] = [];
      
      // Check for subject line (flexible pattern)
      if (!EMAIL_STRUCTURE_PATTERNS.subject.test(content)) {
        // Also check for a clear first line that could be a subject
        const firstLine = content.split('\n')[0]?.trim() || '';
        if (firstLine.length < 10 || firstLine.length > 100) {
          missingStructure.push('Subject line');
        }
      }
      
      // Check for call-to-action
      if (!EMAIL_STRUCTURE_PATTERNS.cta.test(content)) {
        missingStructure.push('Call-to-action');
      }
      
      if (missingStructure.length > 0) {
        violations.push({
          severity: 'info',
          rule: 'Email structure recommendation',
          text: `May be missing: ${missingStructure.join(', ')}`,
          suggestion: `For better email effectiveness, consider adding: ${missingStructure.join(', ')}`,
          category: 'email_structure',
          position: { start: 0, end: content.length },
          autoFixable: false,
          agentId: 'style_consistency' as ValidationAgentId,
        });
      }
    }
  } catch (error) {
    // If channel not found, silently skip constraint validation
    log.debug('Channel constraint check skipped', { error: String(error) });
  }
  
  return violations;
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
  
  // Run channel constraint validation if context is provided
  const channelViolations = _context 
    ? validateChannelConstraints(content, _context.channel)
    : [];

  // Calculate overall results with position-based deduplication
  const rawViolations = agentResults.flatMap(r => r.violations);
  const allViolations = deduplicateViolations([...rawViolations, ...channelViolations]);
  const errorCount = allViolations.filter(v => v.severity === 'error').length;
  const autoFixableCount = allViolations.filter(v => v.autoFixable).length;
  
  // Log summary for monitoring (not verbose debug)
  if (autoFixableCount > 0) {
    log.info(`${allViolations.length} violations found`, { autoFixable: autoFixableCount });
  }
  
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
