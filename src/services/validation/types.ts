/**
 * Validation Types
 * 
 * Type definitions for the validation pipeline.
 * 
 * @module services/validation/types
 */

import type { ViolationSeverity, ValidationStrictness, GenerationContext, Violation } from '../../types';

/**
 * Validation agent identifiers
 */
export type ValidationAgentId =
  | 'gender_neutrality'
  | 'inclusivity'
  | 'cultural_sensitivity'
  | 'accessibility'
  | 'compliance'
  | 'style_consistency'
  | 'brand_alignment'
  | 'readability'
  | 'avoid_words'
  | 'commercial_sensitivity'
  | 'ux_microcopy'; // Phase 2.4: CTA format, dead-end, error structure

/**
 * Individual violation found by an agent (extends base Violation)
 */
export interface ValidationViolation extends Violation {
  agentId: ValidationAgentId;
}

/**
 * Pattern-based rule for fast matching
 */
export interface PatternRule {
  id: string;
  pattern: RegExp;
  severity: ViolationSeverity;
  rule: string;
  suggestion: string;
  category: string;
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
  suggestions: string[];
  processingTimeMs: number;
  usedLLM: boolean;
}

/**
 * Complete validation pipeline result
 */
export interface PipelineValidationResult {
  passed: boolean;
  overallScore: number;
  certification: 'certified' | 'review_recommended' | 'issues_found';
  agentResults: AgentValidationResult[];
  totalViolations: number;
  autoFixableCount: number;
  processingTimeMs: number;
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
  strictness: 'standard',
  enabledAgents: [
    'gender_neutrality',
    'inclusivity',
    'cultural_sensitivity',
    'accessibility',
    'compliance',
    'style_consistency',
    'brand_alignment',
    'readability',
    'avoid_words',
    'commercial_sensitivity', // Phase 1.5: Detects pushy sales/inappropriate promotional timing
    'ux_microcopy',          // Phase 2.4: CTA format, dead-end detection, error structure
  ],
  skipPatternMatching: false,
  parallelExecution: true,
  timeout: 10000,
};

/**
 * Agent weights for score calculation
 * Updated to include readability (Training 1.pdf requirement: Grade 8 readability)
 * Rebalanced to sum to 100 after adding avoid_words, commercial_sensitivity, and ux_microcopy agents
 * 
 * Rationale:
 * - style_consistency reduced (overlaps with avoid_words)
 * - brand_alignment reduced slightly (overlaps with commercial_sensitivity)
 * - commercial_sensitivity lower weight as it's context-specific
 * - ux_microcopy moderate weight - important for user experience
 */
export const AGENT_WEIGHTS: Record<ValidationAgentId, number> = {
  gender_neutrality: 9,       // reduced from 10
  inclusivity: 9,             // reduced from 10
  cultural_sensitivity: 9,    // reduced from 10
  accessibility: 9,           // unchanged
  compliance: 11,             // reduced from 12
  style_consistency: 10,      // reduced from 11
  brand_alignment: 11,        // reduced from 12
  readability: 9,             // unchanged
  avoid_words: 8,             // reduced from 9
  commercial_sensitivity: 8,  // unchanged
  ux_microcopy: 7,            // NEW - Phase 2.4: CTA, dead-end, error structure
  // Sum: 9+9+9+9+11+10+11+9+8+8+7 = 100
};
