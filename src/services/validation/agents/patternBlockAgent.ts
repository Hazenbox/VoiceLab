/**
 * Pattern Block Validation Agent
 * 
 * Validates that responses follow the correct message structure
 * sequencing according to pattern blocks (acknowledge → empathize → 
 * clarify → inform → guide → reassure → nextStep → nudge).
 * 
 * @module services/validation/agents/patternBlockAgent
 */

import { PATTERN_BLOCKS, type PatternBlock } from '../../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PatternBlockValidation {
  block: PatternBlock;
  detected: boolean;
  position: number;
  required: boolean;
  snippets: string[];
}

export interface PatternValidationResult {
  /** Overall pass/fail */
  passed: boolean;
  /** Score (0-1) */
  score: number;
  /** Detected blocks */
  detectedBlocks: PatternBlockValidation[];
  /** Missing required blocks */
  missingRequired: PatternBlock[];
  /** Out of order blocks */
  outOfOrder: Array<{ block: PatternBlock; expected: number; actual: number }>;
  /** Suggestions */
  suggestions: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCK_PATTERNS: Record<PatternBlock, RegExp[]> = {
  acknowledge: [
    /i understand/, /thank you for/, /got it/, /i see/,
    /understood/, /thanks for reaching/, /appreciate/,
    /^(hi|hello)/, /good (morning|afternoon|evening)/,
  ],
  empathize: [
    /i can imagine/, /that (must be|sounds)/, /i understand how/,
    /sorry to hear/, /i can see why/, /frustrating/,
    /it's natural to/, /understandable/,
  ],
  clarify: [
    /could you (tell|confirm|clarify)/, /which one/, /do you mean/,
    /to help you better/, /just to confirm/, /can you specify/,
    /\?$/, /please let me know/,
  ],
  inform: [
    /here's (what|how)/, /the (answer|solution|reason) is/,
    /you can/, /this (means|is because)/, /the process/,
    /to do this/, /the status is/, /your (balance|plan|account)/,
  ],
  guide: [
    /step \d/, /first,/, /then,/, /next,/, /finally,/,
    /follow these/, /here's how to/, /to (complete|finish)/,
    /1\..*2\./, /- first.*- then/,
  ],
  reassure: [
    /don't worry/, /rest assured/, /you're (all set|good)/,
    /this will/, /safe/, /secure/, /taken care of/,
    /nothing to worry/, /we've got this/,
  ],
  nextStep: [
    /let me know if/, /feel free to/, /you can also/,
    /is there anything else/, /happy to help/,
    /if you (need|have)/, /don't hesitate/,
  ],
  nudge: [
    /by the way/, /you might also/, /did you know/,
    /you could also try/, /have you considered/,
    /also available/, /might interest you/,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect which blocks are present and their positions
 */
function detectBlocks(content: string): Map<PatternBlock, { positions: number[]; snippets: string[] }> {
  const results = new Map<PatternBlock, { positions: number[]; snippets: string[] }>();
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  
  for (const [block, patterns] of Object.entries(BLOCK_PATTERNS)) {
    const detections: { positions: number[]; snippets: string[] } = { positions: [], snippets: [] };
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].toLowerCase();
      for (const pattern of patterns) {
        if (pattern.test(sentence)) {
          detections.positions.push(i);
          detections.snippets.push(sentences[i].trim().slice(0, 50));
          break;
        }
      }
    }
    
    if (detections.positions.length > 0) {
      results.set(block as PatternBlock, detections);
    }
  }
  
  return results;
}

/**
 * Validate pattern block sequencing
 */
export function validatePatternBlocks(
  content: string,
  requiredBlocks?: PatternBlock[]
): PatternValidationResult {
  const detected = detectBlocks(content);
  const allBlocks = Object.keys(PATTERN_BLOCKS) as PatternBlock[];
  
  // Default required blocks
  const required = requiredBlocks || ['acknowledge', 'inform', 'nextStep'];
  
  // Build validation results
  const detectedBlocks: PatternBlockValidation[] = [];
  const missingRequired: PatternBlock[] = [];
  const outOfOrder: Array<{ block: PatternBlock; expected: number; actual: number }> = [];
  
  for (const block of allBlocks) {
    const config = PATTERN_BLOCKS[block];
    const detection = detected.get(block);
    
    detectedBlocks.push({
      block,
      detected: !!detection,
      position: detection ? Math.min(...detection.positions) : -1,
      required: required.includes(block),
      snippets: detection?.snippets || [],
    });
    
    // Check if required but missing
    if (required.includes(block) && !detection) {
      missingRequired.push(block);
    }
  }
  
  // Check ordering
  const detectedOrdered = detectedBlocks
    .filter(b => b.detected)
    .sort((a, b) => a.position - b.position);
  
  for (let i = 0; i < detectedOrdered.length - 1; i++) {
    const current = detectedOrdered[i];
    const next = detectedOrdered[i + 1];
    
    const currentExpected = PATTERN_BLOCKS[current.block].position;
    const nextExpected = PATTERN_BLOCKS[next.block].position;
    
    if (currentExpected > nextExpected) {
      outOfOrder.push({
        block: current.block,
        expected: currentExpected,
        actual: current.position,
      });
    }
  }
  
  // Calculate score
  let score = 1.0;
  score -= missingRequired.length * 0.2;
  score -= outOfOrder.length * 0.1;
  score = Math.max(0, score);
  
  // Build suggestions
  const suggestions: string[] = [];
  
  for (const missing of missingRequired) {
    const config = PATTERN_BLOCKS[missing];
    suggestions.push(`Add ${missing}: ${config.description}`);
  }
  
  if (outOfOrder.length > 0) {
    suggestions.push('Reorder response to follow pattern sequence');
  }
  
  // Check for acknowledge at start
  const acknowledgeBlock = detectedBlocks.find(b => b.block === 'acknowledge');
  if (!acknowledgeBlock?.detected || acknowledgeBlock.position > 0) {
    suggestions.push('Start response with acknowledgment');
  }
  
  // Check for nextStep at end
  const nextStepBlock = detectedBlocks.find(b => b.block === 'nextStep');
  if (required.includes('nextStep') && nextStepBlock?.detected) {
    const lastDetected = Math.max(...detectedBlocks.filter(b => b.detected).map(b => b.position));
    if (nextStepBlock.position < lastDetected) {
      suggestions.push('End with next step or call to action');
    }
  }
  
  const passed = missingRequired.length === 0 && score >= 0.7;
  
  return {
    passed,
    score,
    detectedBlocks,
    missingRequired,
    outOfOrder,
    suggestions,
  };
}

/**
 * Quick check if response has basic structure
 */
export function hasBasicStructure(content: string): boolean {
  const detected = detectBlocks(content);
  return detected.has('acknowledge') && detected.has('inform');
}

/**
 * Get pattern block template
 */
export function getPatternTemplate(blocks: PatternBlock[]): string {
  const sorted = blocks.sort((a, b) => 
    PATTERN_BLOCKS[a].position - PATTERN_BLOCKS[b].position
  );
  
  return sorted.map(block => {
    const config = PATTERN_BLOCKS[block];
    return `[${block.toUpperCase()}]: ${config.description}`;
  }).join('\n');
}

/**
 * Suggest blocks based on context
 */
export function suggestBlocks(context: {
  hasIssue: boolean;
  hasQuestion: boolean;
  isComplaint: boolean;
  isFirstContact: boolean;
  isResolved: boolean;
}): PatternBlock[] {
  const blocks: PatternBlock[] = ['acknowledge'];
  
  if (context.hasIssue || context.isComplaint) {
    blocks.push('empathize');
  }
  
  if (context.hasQuestion) {
    blocks.push('clarify');
  }
  
  blocks.push('inform');
  
  if (context.hasIssue) {
    blocks.push('guide');
    blocks.push('reassure');
  }
  
  blocks.push('nextStep');
  
  if (context.isResolved && !context.isComplaint) {
    blocks.push('nudge');
  }
  
  return blocks;
}
