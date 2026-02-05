/**
 * Validation Types
 * 
 * Type definitions for the validation pipeline.
 * 
 * @module services/validation/types
 */

import type { ViolationSeverity, ValidationStrictness, GenerationContext } from '../../types';

/**
 * Validation agent identifiers
 */
export type ValidationAgentId =
  | 'gender_neutrality'
  | 'elitism'
  | 'cultural_sensitivity'
  | 'disability_inclusion'
  | 'compliance'
  | 'style_grammar'
  | 'accessibility';

/**
 * Individual violation found by an agent
 */
export interface ValidationViolation {
  id: string;
  agentId: ValidationAgentId;
  severity: ViolationSeverity;
  message: string;
  suggestion?: string;
  location?: {
    start: number;
    end: number;
    text: string;
  };
  category?: string;
  confidence: number; // 0-100
}

/**
 * Pattern-based rule for fast matching
 */
export interface PatternRule {
  id: string;
  pattern: RegExp;
  severity: ViolationSeverity;
  message: string;
  suggestion?: string;
  category?: string;
}

/**
 * Result from a single validation agent
 */
export interface AgentValidationResult {
  agentId: ValidationAgentId;
  agentName: string;
  passed: boolean;
  score: number; // 0-100
  violations: ValidationViolation[];
  executionTime: number; // ms
  method: 'pattern' | 'llm' | 'hybrid';
}

/**
 * Complete validation pipeline result
 */
export interface PipelineValidationResult {
  passed: boolean;
  overallScore: number;
  certification: 'certified' | 'review' | 'blocked';
  agentResults: AgentValidationResult[];
  totalViolations: number;
  criticalViolations: number;
  executionTime: number;
  timestamp: Date;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  strictness: ValidationStrictness;
  enabledAgents: ValidationAgentId[];
  skipPatternMatching: boolean;
  parallelExecution: boolean;
  timeout: number; // ms
}

/**
 * Base interface for validation agents
 */
export interface ValidationAgent {
  id: ValidationAgentId;
  name: string;
  description: string;
  weight: number; // Contribution to overall score (sum to 100)
  patterns: PatternRule[];
  
  /**
   * Run pattern-based validation (fast)
   */
  runPatternValidation(content: string): ValidationViolation[];
  
  /**
   * Run LLM-based validation (thorough)
   */
  runLLMValidation?(
    content: string,
    context: GenerationContext
  ): Promise<ValidationViolation[]>;
  
  /**
   * Calculate score from violations
   */
  calculateScore(violations: ValidationViolation[]): number;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  strictness: 'balanced',
  enabledAgents: [
    'gender_neutrality',
    'elitism',
    'cultural_sensitivity',
    'disability_inclusion',
    'compliance',
    'style_grammar',
    'accessibility',
  ],
  skipPatternMatching: false,
  parallelExecution: true,
  timeout: 10000,
};

/**
 * Agent weights for score calculation
 */
export const AGENT_WEIGHTS: Record<ValidationAgentId, number> = {
  gender_neutrality: 15,
  elitism: 15,
  cultural_sensitivity: 15,
  disability_inclusion: 15,
  compliance: 15,
  style_grammar: 15,
  accessibility: 10,
};
