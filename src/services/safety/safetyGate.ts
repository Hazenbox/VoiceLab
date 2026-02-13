/**
 * Safety Gate
 * 
 * Pre-generation routing layer that determines how to handle
 * user requests based on safety classification.
 * 
 * This is the main entry point for safety checks before generation.
 * It orchestrates:
 * 1. Safety classification
 * 2. Emergency response routing
 * 3. Generation modifications (tone locks, disclaimers)
 * 4. Logging for audit
 * 
 * @module services/safety/safetyGate
 */

import { classifySafety, hasCriticalSafetyConcern, type SafetyClassification } from './safetyClassifier';
import { 
  getEmergencyResponse, 
  getAdvisoryDisclaimer,
  requiresEmergencyResponse,
  type EmergencyResponse 
} from './emergencyResponses';
import { 
  RISK_TONE_OVERRIDES, 
  type SafetyLevel, 
  type AdvisoryBoundary 
} from '../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SafetyRouting = 
  | 'proceed_normal'      // No safety concerns, proceed with normal generation
  | 'proceed_modified'    // Safety concern, but can proceed with modifications
  | 'emergency_response'  // Use pre-defined emergency response
  | 'block_and_log';      // Block request entirely, log for review

export interface SafetyGateResult {
  /** How to route this request */
  routing: SafetyRouting;
  /** Full safety classification */
  classification: SafetyClassification;
  /** Emergency response if routing is emergency_response */
  emergencyResponse?: EmergencyResponse;
  /** Generation modifications if routing is proceed_modified */
  modifications?: GenerationModifications;
  /** Whether to log this interaction */
  shouldLog: boolean;
  /** Log severity */
  logSeverity?: 'info' | 'warning' | 'critical';
  /** Processing time in ms */
  processingTimeMs: number;
}

export interface GenerationModifications {
  /** Maximum warmth level allowed */
  maxWarmth: number;
  /** Tone must be locked to these characteristics */
  toneLock?: 'neutral' | 'calm' | 'directive';
  /** Disclaimer to append */
  disclaimer?: string;
  /** Whether nudging is blocked */
  blockNudging: boolean;
  /** Whether to skip certain response patterns */
  skipPatterns?: string[];
  /** Force certain patterns */
  forcePatterns?: string[];
  /** Risk level for downstream handling */
  riskLevel: 'low' | 'medium' | 'high' | 'regulated';
}

export interface SafetyGateConfig {
  /** Skip safety checks (for testing only) */
  bypassSafety?: boolean;
  /** Additional context about the user */
  userContext?: {
    isAuthenticated?: boolean;
    previousSafetyFlags?: number;
    sessionDuration?: number;
  };
  /** Whether this is a follow-up to a previous safety-flagged message */
  isFollowUp?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY GATE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main safety gate function
 * 
 * Call this BEFORE generating any response to determine routing.
 * 
 * @param userInput - The user's message
 * @param config - Optional configuration
 * @returns Safety gate result with routing decision
 */
export function checkSafetyGate(
  userInput: string,
  config: SafetyGateConfig = {}
): SafetyGateResult {
  const startTime = performance.now();
  
  // Bypass for testing (should NEVER be enabled in production)
  if (config.bypassSafety) {
    console.warn('[SafetyGate] SAFETY BYPASSED - This should only happen in tests');
    return {
      routing: 'proceed_normal',
      classification: {
        domain: 'none',
        level: 'none',
        advisoryBoundary: 'normal_information',
        confidence: 1.0,
        allDetectedDomains: [],
        requiresImmediateAction: false,
        nudgingBlocked: false,
      },
      shouldLog: false,
      processingTimeMs: performance.now() - startTime,
    };
  }
  
  // Quick critical check first (fast path)
  const hasCritical = hasCriticalSafetyConcern(userInput);
  
  // Full classification
  const classification = classifySafety(userInput);
  
  // Determine routing based on classification
  const result = determineRouting(classification, config);
  
  result.processingTimeMs = performance.now() - startTime;
  
  // Log critical and high severity
  if (result.logSeverity === 'critical' || result.logSeverity === 'warning') {
    logSafetyEvent(userInput, result);
  }
  
  return result;
}

/**
 * Determine routing based on classification
 */
function determineRouting(
  classification: SafetyClassification,
  config: SafetyGateConfig
): SafetyGateResult {
  const { domain, level, advisoryBoundary } = classification;
  
  // No safety concerns
  if (domain === 'none') {
    return {
      routing: 'proceed_normal',
      classification,
      shouldLog: false,
      processingTimeMs: 0,
    };
  }
  
  // Critical level - emergency response or block
  if (level === 'critical') {
    const emergencyResponse = getEmergencyResponse(domain, advisoryBoundary);
    
    if (emergencyResponse?.blockFurtherInteraction) {
      return {
        routing: 'block_and_log',
        classification,
        emergencyResponse,
        shouldLog: true,
        logSeverity: 'critical',
        processingTimeMs: 0,
      };
    }
    
    if (emergencyResponse) {
      return {
        routing: 'emergency_response',
        classification,
        emergencyResponse,
        shouldLog: true,
        logSeverity: 'critical',
        processingTimeMs: 0,
      };
    }
  }
  
  // High level - emergency response or modified
  if (level === 'high') {
    const emergencyResponse = getEmergencyResponse(domain, advisoryBoundary);
    
    if (requiresEmergencyResponse(domain)) {
      return {
        routing: 'emergency_response',
        classification,
        emergencyResponse: emergencyResponse || undefined,
        shouldLog: true,
        logSeverity: 'warning',
        processingTimeMs: 0,
      };
    }
    
    // High but not emergency - proceed with heavy modifications
    return {
      routing: 'proceed_modified',
      classification,
      modifications: getModificationsForLevel('high', advisoryBoundary),
      shouldLog: true,
      logSeverity: 'warning',
      processingTimeMs: 0,
    };
  }
  
  // Moderate level - proceed with modifications
  if (level === 'moderate') {
    return {
      routing: 'proceed_modified',
      classification,
      modifications: getModificationsForLevel('moderate', advisoryBoundary),
      shouldLog: advisoryBoundary === 'refuse_and_redirect',
      logSeverity: advisoryBoundary === 'refuse_and_redirect' ? 'warning' : 'info',
      processingTimeMs: 0,
    };
  }
  
  // Low level - minimal modifications
  if (level === 'low') {
    // Some low-level domains still require blocking
    if (advisoryBoundary === 'refuse_and_redirect') {
      const emergencyResponse = getEmergencyResponse(domain, advisoryBoundary);
      return {
        routing: emergencyResponse ? 'emergency_response' : 'proceed_modified',
        classification,
        emergencyResponse,
        modifications: emergencyResponse ? undefined : getModificationsForLevel('low', advisoryBoundary),
        shouldLog: true,
        logSeverity: 'info',
        processingTimeMs: 0,
      };
    }
    
    return {
      routing: 'proceed_modified',
      classification,
      modifications: getModificationsForLevel('low', advisoryBoundary),
      shouldLog: false,
      processingTimeMs: 0,
    };
  }
  
  // Default - proceed normal
  return {
    routing: 'proceed_normal',
    classification,
    shouldLog: false,
    processingTimeMs: 0,
  };
}

/**
 * Get generation modifications based on risk level
 */
function getModificationsForLevel(
  level: SafetyLevel,
  advisoryBoundary: AdvisoryBoundary
): GenerationModifications {
  const disclaimer = getAdvisoryDisclaimer(advisoryBoundary);
  
  switch (level) {
    case 'critical':
    case 'high':
      return {
        maxWarmth: 1, // Neutral only
        toneLock: 'calm',
        disclaimer: disclaimer || undefined,
        blockNudging: true,
        skipPatterns: ['nudge', 'celebrate'],
        forcePatterns: ['acknowledge', 'inform'],
        riskLevel: 'high',
      };
    
    case 'moderate':
      return {
        maxWarmth: 2, // Up to friendly
        toneLock: advisoryBoundary === 'limited_guidance' ? 'calm' : undefined,
        disclaimer: disclaimer || undefined,
        blockNudging: true,
        skipPatterns: ['nudge'],
        riskLevel: 'medium',
      };
    
    case 'low':
      return {
        maxWarmth: 3, // Up to reassuring
        disclaimer: disclaimer || undefined,
        blockNudging: advisoryBoundary === 'refuse_and_redirect',
        riskLevel: 'low',
      };
    
    default:
      return {
        maxWarmth: 4,
        blockNudging: false,
        riskLevel: 'low',
      };
  }
}

/**
 * Log safety event (placeholder - integrate with actual logging)
 */
function logSafetyEvent(
  userInput: string,
  result: SafetyGateResult
): void {
  const logEntry = {
    timestamp: Date.now(),
    domain: result.classification.domain,
    level: result.classification.level,
    routing: result.routing,
    confidence: result.classification.confidence,
    severity: result.logSeverity,
    // Don't log full user input for privacy - just metadata
    inputLength: userInput.length,
    matchedPatterns: result.classification.allDetectedDomains.flatMap(d => d.matchedPatterns),
  };
  
  // In production, this would go to a secure logging service
  console.log('[SafetyGate] Safety event:', JSON.stringify(logEntry));
  
  // For critical events, could trigger alerts
  if (result.logSeverity === 'critical') {
    console.error('[SafetyGate] CRITICAL SAFETY EVENT', logEntry);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick check if input needs safety review (lighter than full gate)
 */
export function needsSafetyReview(userInput: string): boolean {
  return hasCriticalSafetyConcern(userInput) || 
    classifySafety(userInput).domain !== 'none';
}

/**
 * Get safety context for prompt injection
 */
export function getSafetyContext(result: SafetyGateResult): string | null {
  if (result.routing === 'proceed_normal') {
    return null;
  }
  
  const lines: string[] = [];
  
  if (result.modifications?.toneLock) {
    lines.push(`TONE LOCK: Maintain ${result.modifications.toneLock} tone throughout.`);
  }
  
  if (result.modifications?.blockNudging) {
    lines.push('NUDGING BLOCKED: Do not suggest additional products or services.');
  }
  
  if (result.classification.domain !== 'none') {
    lines.push(`SAFETY CONTEXT: User query touches on ${result.classification.domain} domain.`);
    
    if (result.classification.advisoryBoundary === 'precautionary_guidance') {
      lines.push('ADVISORY: Provide general information only. Recommend professional consultation.');
    } else if (result.classification.advisoryBoundary === 'limited_guidance') {
      lines.push('ADVISORY: Limited guidance only. Do not provide specific procedural details.');
    } else if (result.classification.advisoryBoundary === 'refer_professional') {
      lines.push('ADVISORY: Strongly recommend professional consultation. Do not provide specific advice.');
    }
  }
  
  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Check if a response can include ecosystem nudges
 */
export function canIncludeNudge(result: SafetyGateResult): boolean {
  if (result.routing === 'proceed_normal') {
    return true;
  }
  
  if (result.modifications?.blockNudging) {
    return false;
  }
  
  return !result.classification.nudgingBlocked;
}

/**
 * Apply safety modifications to generation config
 */
export function applySafetyModifications(
  result: SafetyGateResult,
  currentConfig: { warmth?: number; detail?: number }
): { warmth: number; detail: number; riskLevel: string } {
  const modifications = result.modifications;
  
  if (!modifications) {
    return {
      warmth: currentConfig.warmth ?? 2,
      detail: currentConfig.detail ?? 2,
      riskLevel: 'low',
    };
  }
  
  return {
    warmth: Math.min(currentConfig.warmth ?? 2, modifications.maxWarmth),
    detail: currentConfig.detail ?? 2,
    riskLevel: modifications.riskLevel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  classifySafety,
  hasCriticalSafetyConcern,
  getEmergencyResponse,
  requiresEmergencyResponse,
  type SafetyClassification,
  type EmergencyResponse,
};
