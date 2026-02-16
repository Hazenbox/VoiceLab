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
  | 'ux_microcopy'   // Phase 2.4: CTA format, dead-end, error structure
  | 'glossary';      // Phase 3.1: Ecosystem-specific terminology validation

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
    'glossary',              // Phase 3.1: Ecosystem-specific terminology validation
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
  gender_neutrality: 8,       // reduced from 9
  inclusivity: 8,             // reduced from 9
  cultural_sensitivity: 8,    // reduced from 9
  accessibility: 8,           // reduced from 9
  compliance: 10,             // reduced from 11
  style_consistency: 10,      // unchanged
  brand_alignment: 10,        // reduced from 11
  readability: 9,             // unchanged
  avoid_words: 8,             // unchanged
  commercial_sensitivity: 7,  // reduced from 8
  ux_microcopy: 7,            // unchanged
  glossary: 7,                // NEW - Phase 3.1: Ecosystem terminology
  // Sum: 8+8+8+8+10+10+10+9+8+7+7+7 = 100
};
