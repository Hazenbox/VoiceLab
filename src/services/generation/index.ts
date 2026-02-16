/**
 * Generation Module
 * 
 * Constitutional AI wrapper for LLM generation.
 * 
 * @module services/generation
 */

export {
  ConstitutionalWrapper,
  getConstitutionalWrapper,
  prepareConstitutionalContext,
  validateConstitutionalResponse,
  convertToViolations,
  type ConstitutionalContext,
  type GenerationRequest,
  type ValidationResult,
  type ValidationCheck,
} from './constitutionalWrapper';
