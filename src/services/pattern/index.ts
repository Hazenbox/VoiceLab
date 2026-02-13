/**
 * Pattern Module
 * 
 * Pattern resolution and sequence building for structured responses.
 * 
 * @module services/pattern
 */

export {
  resolvePatternSequence,
  getPatternGuidance,
  buildPatternPromptSection,
  validatePatternSequence,
  getAllPatterns,
  getAllSequences,
  PATTERN_DEFINITIONS,
  PATTERN_SEQUENCES,
  type Pattern,
  type PatternSequenceType,
  type PatternDefinition,
  type PatternSequence,
  type PatternContext,
} from './patternResolver';
