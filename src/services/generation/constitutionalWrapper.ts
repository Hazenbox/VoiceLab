/**
 * Constitutional Wrapper
 * 
 * Main integration point that wraps LLM generation with constitutional
 * AI governance. Orchestrates:
 * - Safety gate pre-check
 * - Token classification
 * - Directive loading
 * - State management
 * - Post-generation validation
 * 
 * @module services/generation/constitutionalWrapper
 */

import { checkSafetyGate, type SafetyGateResult } from '../safety';
import { classifyTokens, loadDirectives, buildDirectivesPrompt, type TokenClassification, type LoadedDirectives } from '../tokens';
import { StateManager, createStateManager, analyzeMessageForTransition, type StateSuggestions } from '../conversation';
import type { NavarasaEmotion } from '../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConstitutionalContext {
  /** Token classification results */
  tokens: TokenClassification;
  /** Loaded directives */
  directives: LoadedDirectives;
  /** State suggestions */
  stateSuggestions: StateSuggestions;
  /** Safety gate result */
  safetyResult: SafetyGateResult;
  /** Built prompt section for directives */
  directivesPrompt: string;
  /** Built prompt section for state */
  statePrompt: string;
  /** Combined system prompt injection */
  systemPromptInjection: string;
  /** Whether generation should proceed */
  shouldProceed: boolean;
  /** Pre-built response (if safety gate triggered emergency) */
  prebuiltResponse?: string;
  /** Metadata for logging/debugging */
  metadata: {
    timestamp: number;
    signature: string;
    processingTimeMs: number;
  };
}

export interface GenerationRequest {
  /** User input message */
  userMessage: string;
  /** Ecosystem context */
  ecosystem?: string;
  /** Channel context */
  channel?: string;
  /** Platform context */
  platform?: string;
  /** User profile type */
  userProfile?: 'new_user' | 'regular' | 'premium' | 'enterprise' | 'senior' | 'youth' | 'unknown';
  /** Session ID for state persistence */
  sessionId?: string;
  /** User ID for personalization */
  userId?: string;
  /** Existing state manager (for multi-turn) */
  stateManager?: StateManager;
  /** Conversation history for context */
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface ValidationResult {
  /** Overall pass/fail */
  passed: boolean;
  /** Individual check results */
  checks: Array<{
    name: string;
    passed: boolean;
    message?: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  /** Suggested improvements */
  suggestions: string[];
  /** Whether response should be regenerated */
  shouldRegenerate: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WRAPPER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ConstitutionalWrapper {
  private stateManagers: Map<string, StateManager> = new Map();
  
  /**
   * Prepare context for generation
   * This is called BEFORE the LLM is invoked
   */
  prepareContext(request: GenerationRequest): ConstitutionalContext {
    const startTime = performance.now();
    
    // 1. Safety gate check
    const safetyResult = checkSafetyGate(request.userMessage, {
      ecosystem: request.ecosystem,
      channel: request.channel,
    });
    
    // 2. If safety gate blocks, return early
    if (safetyResult.routing === 'emergency_response' || safetyResult.routing === 'block_and_log') {
      return this.buildBlockedContext(request, safetyResult, startTime);
    }
    
    // 3. Token classification
    const tokens = classifyTokens({
      text: request.userMessage,
      ecosystem: request.ecosystem,
      channel: request.channel,
      platform: request.platform,
      userProfile: request.userProfile,
    });
    
    // 4. Load directives
    const directives = loadDirectives(tokens);
    
    // 5. Get/create state manager
    const stateManager = this.getOrCreateStateManager(request);
    
    // 6. Process message through state machine
    const messageAnalysis = analyzeMessageForTransition(request.userMessage);
    const stateResult = stateManager.processMessage({
      ...messageAnalysis,
      detectedEmotion: tokens.userEmotion as NavarasaEmotion,
      safetyLevel: this.mapSafetyLevel(safetyResult.classification.level),
    });
    
    // 7. Build prompts
    const directivesPrompt = buildDirectivesPrompt(directives);
    const statePrompt = stateManager.getPromptContext();
    
    // 8. Combine into system prompt injection
    const systemPromptInjection = this.buildSystemPromptInjection(
      directivesPrompt,
      statePrompt,
      safetyResult,
      tokens
    );
    
    const processingTimeMs = performance.now() - startTime;
    
    return {
      tokens,
      directives,
      stateSuggestions: stateResult.suggestions,
      safetyResult,
      directivesPrompt,
      statePrompt,
      systemPromptInjection,
      shouldProceed: true,
      metadata: {
        timestamp: Date.now(),
        signature: tokens.signature,
        processingTimeMs,
      },
    };
  }
  
  /**
   * Validate generated response
   * This is called AFTER the LLM generates a response
   */
  validateResponse(
    response: string,
    context: ConstitutionalContext
  ): ValidationResult {
    const checks: ValidationResult['checks'] = [];
    const suggestions: string[] = [];
    
    // Check 1: Length appropriate for detail level
    const wordCount = response.split(/\s+/).length;
    const expectedMinWords = context.directives.toneDirective.detail.level === 1 ? 10 : 
                             context.directives.toneDirective.detail.level === 2 ? 20 : 40;
    const expectedMaxWords = context.directives.toneDirective.detail.level === 1 ? 50 :
                             context.directives.toneDirective.detail.level === 2 ? 150 : 300;
    
    if (wordCount < expectedMinWords) {
      checks.push({
        name: 'response_length_min',
        passed: false,
        message: `Response too short (${wordCount} words, expected ${expectedMinWords}+)`,
        severity: 'warning',
      });
      suggestions.push('Consider adding more detail or explanation');
    } else if (wordCount > expectedMaxWords) {
      checks.push({
        name: 'response_length_max',
        passed: false,
        message: `Response too long (${wordCount} words, expected ${expectedMaxWords} max)`,
        severity: 'warning',
      });
      suggestions.push('Consider being more concise');
    } else {
      checks.push({
        name: 'response_length',
        passed: true,
        severity: 'info',
      });
    }
    
    // Check 2: Forbidden phrases (from hard limits)
    const forbiddenPatterns = [
      /i am (a )?human/i,
      /i (am|was) born/i,
      /my (personal )?experience/i,
      /trust me/i,
      /i guarantee/i,
      /you must/i,
      /you have to/i,
    ];
    
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(response)) {
        checks.push({
          name: 'forbidden_phrase',
          passed: false,
          message: `Contains forbidden phrase matching: ${pattern.source}`,
          severity: 'error',
        });
      }
    }
    
    if (!checks.some(c => c.name === 'forbidden_phrase')) {
      checks.push({
        name: 'forbidden_phrases',
        passed: true,
        severity: 'info',
      });
    }
    
    // Check 3: Emotion appropriateness
    const emotionDirective = context.directives?.emotionDirective;
    const forbiddenToneShifts = emotionDirective?.forbiddenToneShifts || [];
    for (const forbidden of forbiddenToneShifts) {
      const forbiddenLower = forbidden.toLowerCase();
      if (response.toLowerCase().includes(forbiddenLower)) {
        checks.push({
          name: 'emotion_tone',
          passed: false,
          message: `Contains forbidden tone shift: ${forbidden}`,
          severity: 'warning',
        });
        suggestions.push(`Avoid ${forbidden} tone given user's emotional state`);
      }
    }
    
    if (!checks.some(c => c.name === 'emotion_tone')) {
      checks.push({
        name: 'emotion_tone',
        passed: true,
        severity: 'info',
      });
    }
    
    // Check 4: Safety domain compliance
    const detectedDomains = context.safetyResult?.classification?.detectedDomains || 
                            context.safetyResult?.classification?.allDetectedDomains || [];
    if (detectedDomains.length > 0) {
      const criticalDomains = detectedDomains.filter(
        (d: { level?: string; domain?: string; advisoryBoundary?: string }) => d.level === 'critical' || d.level === 'high'
      );
      
      for (const domain of criticalDomains) {
        // Check for appropriate disclaimers
        const hasDisclaimer = /consult|professional|expert|emergency|helpline|specialist/i.test(response);
        
        if (!hasDisclaimer && domain.advisoryBoundary !== 'normal_information') {
          checks.push({
            name: 'safety_disclaimer',
            passed: false,
            message: `Missing appropriate disclaimer for ${domain.domain} topic`,
            severity: 'error',
          });
          suggestions.push(`Add appropriate disclaimer or professional referral for ${domain.domain}`);
        }
      }
    }
    
    if (!checks.some(c => c.name === 'safety_disclaimer')) {
      checks.push({
        name: 'safety_compliance',
        passed: true,
        severity: 'info',
      });
    }
    
    // Check 5: Pattern block presence (simplified)
    const hasAcknowledgment = /understand|i see|thank you for|got it/i.test(response);
    const hasNextStep = /let me know|feel free|you can|here's what/i.test(response);
    
    if (context.directives.patternDirective.blocks.includes('acknowledge') && !hasAcknowledgment) {
      checks.push({
        name: 'pattern_acknowledge',
        passed: false,
        message: 'Missing acknowledgment of user request',
        severity: 'warning',
      });
      suggestions.push('Start with acknowledging the user\'s request or concern');
    }
    
    if (context.directives.patternDirective.blocks.includes('nextStep') && !hasNextStep) {
      checks.push({
        name: 'pattern_next_step',
        passed: false,
        message: 'Missing clear next step or call to action',
        severity: 'warning',
      });
      suggestions.push('End with a clear next step or offer for further help');
    }
    
    // Determine overall result
    const errors = checks.filter(c => !c.passed && c.severity === 'error');
    const warnings = checks.filter(c => !c.passed && c.severity === 'warning');
    
    return {
      passed: errors.length === 0,
      checks,
      suggestions,
      shouldRegenerate: errors.length > 0,
    };
  }
  
  /**
   * Get state manager for session
   */
  getStateManager(sessionId: string): StateManager | undefined {
    return this.stateManagers.get(sessionId);
  }
  
  /**
   * Clear state manager for session
   */
  clearStateManager(sessionId: string): void {
    const manager = this.stateManagers.get(sessionId);
    if (manager) {
      manager.destroy();
      this.stateManagers.delete(sessionId);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private getOrCreateStateManager(request: GenerationRequest): StateManager {
    // Use provided state manager if available
    if (request.stateManager) {
      return request.stateManager;
    }
    
    // Use session-based state manager
    const sessionKey = request.sessionId || 'default';
    let manager = this.stateManagers.get(sessionKey);
    
    if (!manager) {
      manager = createStateManager({
        sessionId: request.sessionId,
        userId: request.userId,
        ecosystem: request.ecosystem,
        channel: request.channel,
      });
      this.stateManagers.set(sessionKey, manager);
    }
    
    return manager;
  }
  
  private buildBlockedContext(
    request: GenerationRequest,
    safetyResult: SafetyGateResult,
    startTime: number
  ): ConstitutionalContext {
    // Create minimal tokens for blocked context
    const tokens = classifyTokens({
      text: request.userMessage,
      ecosystem: request.ecosystem,
    });
    
    const directives = loadDirectives(tokens);
    
    return {
      tokens,
      directives,
      stateSuggestions: {
        patternBlocks: ['acknowledge', 'reassure'],
        warmthLevel: 3,
        detailLevel: 1,
        targetEmotion: 'shanta',
        actions: ['provide_emergency_info'],
        openingPhrases: [],
        closingPhrases: [],
        offerEscalation: true,
        includeNudge: false,
      },
      safetyResult,
      directivesPrompt: '',
      statePrompt: '',
      systemPromptInjection: '',
      shouldProceed: false,
      prebuiltResponse: safetyResult.emergencyResponse?.message,
      metadata: {
        timestamp: Date.now(),
        signature: tokens.signature,
        processingTimeMs: performance.now() - startTime,
      },
    };
  }
  
  private mapSafetyLevel(level: string): 'none' | 'low' | 'moderate' | 'high' | 'critical' {
    const mapping: Record<string, 'none' | 'low' | 'moderate' | 'high' | 'critical'> = {
      'none': 'none',
      'low': 'low',
      'moderate': 'moderate',
      'high': 'high',
      'critical': 'critical',
    };
    return mapping[level] || 'none';
  }
  
  private buildSystemPromptInjection(
    directivesPrompt: string,
    statePrompt: string,
    safetyResult: SafetyGateResult,
    tokens: TokenClassification
  ): string {
    const sections: string[] = [];
    
    // Header
    sections.push(`# Jio Constitutional AI Guidelines
    
You are a Jio AI assistant governed by constitutional rules. Follow all directives below.`);
    
    // Safety context if modified
    if (safetyResult.routing === 'proceed_modified' && safetyResult.modifications) {
      sections.push(`## Safety Context (IMPORTANT)

This conversation involves sensitive topics. Apply these constraints:
- Risk Level: ${safetyResult.modifications.riskLevel}
- Max Warmth: ${safetyResult.modifications.maxWarmth}
${safetyResult.modifications.requiredDisclaimers?.map(d => `- Required: ${d}`).join('\n') || ''}
${safetyResult.modifications.blockedActions?.map(a => `- DO NOT: ${a}`).join('\n') || ''}`);
    }
    
    // Directives
    sections.push(directivesPrompt);
    
    // State context
    sections.push(statePrompt);
    
    // Token summary
    sections.push(`## Request Context

- Intent: ${tokens.intent}
- Language: ${tokens.lang} (${tokens.script})
- Emotion: ${tokens.userEmotion} → guide toward ${tokens.targetEmotion}
- Risk: ${tokens.risk}`);
    
    return sections.join('\n\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let wrapperInstance: ConstitutionalWrapper | null = null;

export function getConstitutionalWrapper(): ConstitutionalWrapper {
  if (!wrapperInstance) {
    wrapperInstance = new ConstitutionalWrapper();
  }
  return wrapperInstance;
}

/**
 * Convenience function for preparing context
 */
export function prepareConstitutionalContext(request: GenerationRequest): ConstitutionalContext {
  return getConstitutionalWrapper().prepareContext(request);
}

/**
 * Convenience function for validating response
 */
export function validateConstitutionalResponse(
  response: string,
  context: ConstitutionalContext
): ValidationResult {
  return getConstitutionalWrapper().validateResponse(response, context);
}
