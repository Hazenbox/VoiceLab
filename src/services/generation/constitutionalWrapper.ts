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

/**
 * Directive override from Convex
 */
export interface DirectiveOverride {
  directiveType: string; // voice_trait | safety_rule | pattern_block | emotion_rule
  directiveKey: string;
  ecosystem?: string;
  channel?: string;
  overrideAction: string; // modify | enable | disable
  overrideValue?: string; // JSON stringified value
  priority: number;
  reason?: string;
  isActive: boolean;
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
  /** Directive overrides from Convex */
  directiveOverrides?: DirectiveOverride[];
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  message?: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  /** The problematic text if found */
  matchedText?: string;
}

export interface ValidationResult {
  /** Overall pass/fail */
  passed: boolean;
  /** Individual check results */
  checks: ValidationCheck[];
  /** Suggested improvements */
  suggestions: string[];
  /** Whether response should be regenerated */
  shouldRegenerate: boolean;
  /** Critical issues that require immediate action */
  hasCriticalIssues: boolean;
  /** Error-level issues */
  hasErrorIssues: boolean;
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
    let directives = loadDirectives(tokens);
    
    // 4.5. Apply directive overrides from Convex if provided
    if (request.directiveOverrides && request.directiveOverrides.length > 0) {
      directives = this.applyDirectiveOverrides(directives, request.directiveOverrides, request.ecosystem, request.channel);
    }
    
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
    const checks: ValidationCheck[] = [];
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
    
    // Check 2: Forbidden phrases (CRITICAL - from hard limits)
    // These are things Jio AI must NEVER say
    const criticalForbiddenPatterns: Array<{ pattern: RegExp; reason: string }> = [
      { pattern: /i am (a )?human/i, reason: 'AI claiming to be human' },
      { pattern: /i (am|was) born/i, reason: 'AI claiming birth/human origin' },
      { pattern: /my (personal )?experience/i, reason: 'AI claiming personal experiences' },
    ];
    
    const errorForbiddenPatterns: Array<{ pattern: RegExp; reason: string }> = [
      { pattern: /trust me/i, reason: 'Demanding trust without evidence' },
      { pattern: /i guarantee/i, reason: 'Making absolute guarantees' },
      { pattern: /you must/i, reason: 'Commanding tone instead of guiding' },
      { pattern: /you have to/i, reason: 'Demanding tone instead of suggesting' },
      { pattern: /it'?s your fault/i, reason: 'Blaming the user' },
      { pattern: /you should have/i, reason: 'Blame language' },
      { pattern: /obviously|clearly you/i, reason: 'Condescending tone' },
    ];
    
    for (const { pattern, reason } of criticalForbiddenPatterns) {
      const match = response.match(pattern);
      if (match) {
        checks.push({
          name: 'forbidden_phrase_critical',
          passed: false,
          message: `CRITICAL: ${reason}`,
          severity: 'critical',
          matchedText: match[0],
        });
      }
    }
    
    for (const { pattern, reason } of errorForbiddenPatterns) {
      const match = response.match(pattern);
      if (match) {
        checks.push({
          name: 'forbidden_phrase',
          passed: false,
          message: reason,
          severity: 'error',
          matchedText: match[0],
        });
      }
    }
    
    if (!checks.some(c => c.name.startsWith('forbidden_phrase'))) {
      checks.push({
        name: 'forbidden_phrases',
        passed: true,
        severity: 'info',
      });
    }
    
    // Check 2.5: Exclamation marks (HARD RULE - except festive greetings)
    // Pattern matches festive greetings from timingEngine.ts that are allowed to have !
    const FESTIVE_GREETING_PATTERN = /\b(Happy\s+(Diwali|Holi|Navratri|Onam|Pongal|New\s+Year|Independence\s+Day|Republic\s+Day)|Merry\s+Christmas|Eid\s+Mubarak|Ganpati\s+Bappa\s+Morya|Shubh\s+Deepavali)!/gi;
    const responseWithoutFestive = response.replace(FESTIVE_GREETING_PATTERN, '');
    const exclamationMatch = responseWithoutFestive.match(/!/);
    if (exclamationMatch) {
      checks.push({
        name: 'exclamation_mark',
        passed: false,
        message: 'Response contains exclamation mark(s) -- must use full stop instead',
        severity: 'warning',
      });
      suggestions.push('Replace all "!" with "."');
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
          matchedText: forbidden,
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
    
    // Check 4: Safety domain compliance (CRITICAL for high-risk domains)
    const detectedDomains = context.safetyResult?.classification?.detectedDomains || 
                            context.safetyResult?.classification?.allDetectedDomains || [];
    if (detectedDomains.length > 0) {
      const criticalDomains = detectedDomains.filter(
        (d: { level?: string; domain?: string; advisoryBoundary?: string }) => d.level === 'critical'
      );
      const highDomains = detectedDomains.filter(
        (d: { level?: string; domain?: string; advisoryBoundary?: string }) => d.level === 'high'
      );
      
      for (const domain of criticalDomains) {
        // Check for appropriate disclaimers - CRITICAL for life-threatening domains
        const hasDisclaimer = /consult|professional|expert|emergency|helpline|specialist|doctor|police/i.test(response);
        
        if (!hasDisclaimer && domain.advisoryBoundary !== 'normal_information') {
          checks.push({
            name: 'safety_disclaimer_critical',
            passed: false,
            message: `CRITICAL: Missing safety disclaimer for ${domain.domain} topic`,
            severity: 'critical',
          });
          suggestions.push(`Add emergency resources or professional referral for ${domain.domain}`);
        }
      }
      
      for (const domain of highDomains) {
        const hasDisclaimer = /consult|professional|expert|specialist/i.test(response);
        
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
    
    if (!checks.some(c => c.name.startsWith('safety_disclaimer'))) {
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
    const criticalIssues = checks.filter(c => !c.passed && c.severity === 'critical');
    const errors = checks.filter(c => !c.passed && c.severity === 'error');
    
    return {
      passed: criticalIssues.length === 0 && errors.length === 0,
      checks,
      suggestions,
      shouldRegenerate: criticalIssues.length > 0,
      hasCriticalIssues: criticalIssues.length > 0,
      hasErrorIssues: errors.length > 0,
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
  
  /**
   * Apply directive overrides from Convex to loaded directives
   * Overrides are sorted by priority and applied in order
   */
  private applyDirectiveOverrides(
    directives: LoadedDirectives,
    overrides: DirectiveOverride[],
    ecosystem?: string,
    channel?: string
  ): LoadedDirectives {
    // Filter overrides applicable to current context
    const applicableOverrides = overrides
      .filter(o => o.isActive)
      .filter(o => {
        // Global overrides (no ecosystem/channel) apply everywhere
        if (!o.ecosystem && !o.channel) return true;
        // Ecosystem-specific
        if (o.ecosystem && o.ecosystem === ecosystem && !o.channel) return true;
        // Channel-specific
        if (o.channel && o.channel === channel && !o.ecosystem) return true;
        // Ecosystem + channel specific
        if (o.ecosystem === ecosystem && o.channel === channel) return true;
        return false;
      })
      .sort((a, b) => a.priority - b.priority); // Lower priority number = higher precedence
    
    // Apply each override
    let modifiedDirectives = { ...directives };
    
    for (const override of applicableOverrides) {
      try {
        const value = override.overrideValue ? JSON.parse(override.overrideValue) : undefined;
        
        switch (override.directiveType) {
          case 'voice_trait':
            modifiedDirectives = this.applyVoiceTraitOverride(modifiedDirectives, override, value);
            break;
          case 'safety_rule':
            modifiedDirectives = this.applySafetyOverride(modifiedDirectives, override, value);
            break;
          case 'pattern_block':
            modifiedDirectives = this.applyPatternOverride(modifiedDirectives, override, value);
            break;
          case 'emotion_rule':
            modifiedDirectives = this.applyEmotionOverride(modifiedDirectives, override, value);
            break;
          default:
            console.warn(`[ConstitutionalWrapper] Unknown directive type: ${override.directiveType}`);
        }
      } catch (e) {
        console.error(`[ConstitutionalWrapper] Failed to apply override ${override.directiveKey}:`, e);
      }
    }
    
    return modifiedDirectives;
  }
  
  private applyVoiceTraitOverride(
    directives: LoadedDirectives,
    override: DirectiveOverride,
    value: Record<string, unknown> | undefined
  ): LoadedDirectives {
    if (override.overrideAction === 'disable') {
      // Remove trait from list
      return {
        ...directives,
        voiceTraits: directives.voiceTraits.filter(t => t.trait !== override.directiveKey),
      };
    }
    
    if (override.overrideAction === 'modify' && value) {
      // Modify tone settings if warmth/detail related
      if (override.directiveKey === 'warmth_level' && 'minWarmth' in value) {
        return {
          ...directives,
          toneDirective: {
            ...directives.toneDirective,
            warmth: {
              ...directives.toneDirective.warmth,
              level: Math.max(directives.toneDirective.warmth.level, (value.minWarmth as number) || 1),
            },
          },
        };
      }
      if (override.directiveKey === 'detail_level' && 'maxDetail' in value) {
        return {
          ...directives,
          toneDirective: {
            ...directives.toneDirective,
            detail: {
              ...directives.toneDirective.detail,
              level: Math.min(directives.toneDirective.detail.level, (value.maxDetail as number) || 3),
            },
          },
        };
      }
    }
    
    return directives;
  }
  
  private applySafetyOverride(
    directives: LoadedDirectives,
    override: DirectiveOverride,
    value: Record<string, unknown> | undefined
  ): LoadedDirectives {
    if (override.overrideAction === 'enable' || override.overrideAction === 'modify') {
      // Add or modify safety directive
      const existingIndex = directives.safetyDirectives.findIndex(
        s => s.domain === override.directiveKey
      );
      
      if (existingIndex >= 0 && value) {
        // Modify existing
        const updated = [...directives.safetyDirectives];
        updated[existingIndex] = {
          ...updated[existingIndex],
          advisoryBoundary: (value.advisoryBoundary as string) || updated[existingIndex].advisoryBoundary,
        };
        return { ...directives, safetyDirectives: updated };
      }
    }
    
    return directives;
  }
  
  private applyPatternOverride(
    directives: LoadedDirectives,
    override: DirectiveOverride,
    value: Record<string, unknown> | undefined
  ): LoadedDirectives {
    if (override.overrideAction === 'modify' && value) {
      const requiredBlocks = (value.requiredBlocks as string[]) || [];
      const forbiddenBlocks = (value.forbiddenBlocks as string[]) || [];
      
      // Add required blocks
      let blocks = [...new Set([...directives.patternDirective.blocks, ...requiredBlocks])];
      // Remove forbidden blocks
      blocks = blocks.filter(b => !forbiddenBlocks.includes(b));
      
      return {
        ...directives,
        patternDirective: {
          ...directives.patternDirective,
          blocks,
        },
      };
    }
    
    return directives;
  }
  
  private applyEmotionOverride(
    directives: LoadedDirectives,
    override: DirectiveOverride,
    value: Record<string, unknown> | undefined
  ): LoadedDirectives {
    if (override.overrideAction === 'modify' && value) {
      return {
        ...directives,
        emotionDirective: {
          ...directives.emotionDirective,
          targetEmotion: (value.targetEmotion as string) || directives.emotionDirective.targetEmotion,
          forbiddenToneShifts: (value.forbiddenTraits as string[]) || directives.emotionDirective.forbiddenToneShifts,
        },
      };
    }
    
    return directives;
  }
  
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

/**
 * Convert constitutional validation results to standard Violation format
 * for integration with the Trust Score system
 */
export function convertToViolations(validationResult: ValidationResult): Array<{
  severity: 'error' | 'warning' | 'info';
  rule: string;
  text: string;
  suggestion: string;
  category: string;
  autoFixable: boolean;
}> {
  const violations: Array<{
    severity: 'error' | 'warning' | 'info';
    rule: string;
    text: string;
    suggestion: string;
    category: string;
    autoFixable: boolean;
  }> = [];

  for (const check of validationResult.checks) {
    if (!check.passed) {
      // Map 'critical' severity to 'error' for standard Violation type
      const mappedSeverity: 'error' | 'warning' | 'info' = 
        check.severity === 'critical' ? 'error' : check.severity;
      
      violations.push({
        severity: mappedSeverity,
        rule: check.name,
        text: check.matchedText || check.message || check.name,
        suggestion: validationResult.suggestions.find(s => 
          s.toLowerCase().includes(check.name.replace(/_/g, ' ').toLowerCase())
        ) || getDefaultSuggestion(check.name),
        category: 'constitutional',
        autoFixable: isAutoFixable(check.name),
      });
    }
  }

  return violations;
}

/**
 * Get default suggestion based on check name
 */
function getDefaultSuggestion(checkName: string): string {
  const suggestions: Record<string, string> = {
    'forbidden_phrase_critical': 'Remove the phrase that claims human identity or experiences',
    'forbidden_phrase': 'Rephrase using supportive, non-demanding language',
    'safety_disclaimer_critical': 'Add emergency resources (helpline numbers, professional referral)',
    'safety_disclaimer': 'Add appropriate professional referral or disclaimer',
    'emotion_tone': 'Adjust tone to match user emotional state',
    'pattern_acknowledge': 'Start by acknowledging the user request or concern',
    'pattern_next_step': 'End with a clear next step or offer for further help',
    'response_length_min': 'Add more detail or explanation',
    'response_length_max': 'Be more concise',
  };
  return suggestions[checkName] || 'Review and revise this content';
}

/**
 * Check if a violation type is auto-fixable
 */
function isAutoFixable(checkName: string): boolean {
  // These violations can potentially be auto-fixed by replacing text
  const autoFixableChecks = [
    'forbidden_phrase',
    'forbidden_phrase_critical',
    'response_length_max',
  ];
  return autoFixableChecks.includes(checkName);
}
