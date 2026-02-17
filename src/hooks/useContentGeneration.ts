/**
 * useContentGeneration -- extracted from App.tsx
 *
 * Contains the entire content generation pipeline orchestration:
 * - Intent classification + safety gate
 * - Knowledge retrieval + RAG + query expansion
 * - Constitutional AI context + token gate
 * - Profile learning + memory injection
 * - Nudge controller + domain playbooks
 * - Prompt assembly + LLM generation (streaming & non-streaming)
 * - Finishing layer (joy + signature)
 * - Token enforcement (brand protection)
 * - Validation + trust scoring + auto-fix
 * - Privacy masking
 * - Conversational path (general chat / jio inquiry)
 *
 * App.tsx should only call: sendMessage(message, options)
 */

import { useCallback } from 'react';
import { logger } from '../utils/logger';
import type {
  AppError,
  ChatMode,
  EcosystemType,
  ContentChannelType,
  TrustSettings,
  TrustScore,
  GenerationEvidence,
  SendMessageOptions,
  SendMessageResult,
  AutoFixPreview,
} from '../types';
import { createTextMessage } from '../types';
// Content Trust System services
import { buildPrompt } from '../services/prompt';
import { buildGenerationContext } from '../services/context';
import { runValidationPipeline, setDynamicAvoidWords } from '../services/validation';
import { calculateTrustScore, generateAutoFixes, applyAutoFixes } from '../services/trust';
// Knowledge & Learning
import {
  getCodeDefaults,
  mergeLearnedCorrections,
  getLocalCorrections,
  retrieveKnowledge,
  enrichWithSemanticResults,
  type CorrectionEntry,
  type RetrievedKnowledge,
  type SemanticSearchResult,
} from '../services/knowledge';
// Conversational Mode
import { classifyIntent } from '../services/intent';
import { buildConversationalPrompt, buildJioInquiryPrompt } from '../services/prompt/basePersona';
// Safety Gate & Constitutional AI
import {
  checkSafetyGate,
  type SafetyGateResult,
} from '../services/safety';
import {
  prepareConstitutionalContext,
  validateConstitutionalResponse,
  convertToViolations,
  getConstitutionalWrapper,
  type ConstitutionalContext,
  type GenerationRequest,
  type ValidationResult as ConstitutionalValidationResult,
} from '../services/generation/constitutionalWrapper';
// RAG enhancements
import {
  expandQueryFull,
  rankResults,
  type ExpandedQuery,
} from '../services/rag';
// Profile Learning
import {
  buildProfileLearningSection,
  getPersonalizationSummary,
  type UserLearningProfile,
} from '../services/learning';
// Finishing Layer
import {
  selectJoy,
  injectJoy,
  type JoyContext,
  type JoySelection,
} from '../services/finishing/smallJoyEngine';
import {
  selectSignature,
  appendSignature,
  type SignatureContext,
  type SignatureSelection,
} from '../services/finishing/signatureSelector';
// Nudge Controller
import {
  decideNudge,
  formatNudgeForPrompt,
  type NudgeContext,
  type NudgeDecision,
} from '../services/nudge/nudgeController';
// Privacy
import {
  maskSensitiveData,
  containsSensitiveData,
} from '../services/privacy/dataMasking';
// Domain Playbooks
import {
  getPlaybook,
  detectDomain,
  formatPlaybookForPrompt,
} from '../services/playbooks/domainPlaybooks';
// Token Gate
import {
  checkTokenGate,
  formatGateDecision,
} from '../services/tokens/tokenGate';
// Token Enforcement
import {
  createTokenEnforcementAgent,
  type TokenEnforcementRule,
  type TokenEnforcementContext,
} from '../services/validation/tokenEnforcementAgent';
import { getCachedEnforcementRules } from '../services/validation/tokenEnforcementCache';
// LLM
import { getOrchestratorInstance } from '../services/llm/orchestrator';
import { createLLMProvider, type LLMProviderType } from '../services/providers/llm';
// Reliability
import {
  generateIdempotencyKey,
  markIdempotencyKeyProcessed,
  deduplicateRequest,
} from '../services/reliability';
// Memory
import {
  updateSessionMemory,
  formatSessionMemoryForPrompt,
  extractPrimaryEntity,
  createEmptyMemory,
  updateMemory,
  extractMemoryContext,
  formatMemoryForPrompt,
  getContinuationGreeting,
  type MidTermMemory,
} from '../services/memory';
// Analytics
import {
  getResponseTimer,
  getSessionManager,
  getErrorLogger,
} from '../services/analytics';
// Sync
import { getSyncService } from '../services/sync/convexSync';
// Feature Flags
import { featureFlags } from '../services/featureFlags';
// Onboarding
import { getDeviceId, type UserProfile } from '../components/OnboardingModal';
// Chat message type
import type { ChatMessage } from './useChatPersistence';

// ── Performance Utilities ────────────────────────────────────────────────────

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
  operationName: string = 'operation'
): Promise<{ result: T; timedOut: boolean }> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<{ result: T; timedOut: boolean }>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout] ${operationName} exceeded ${timeoutMs}ms, using fallback`);
      resolve({ result: fallback, timedOut: true });
    }, timeoutMs);
  });

  const resultPromise = promise.then(result => {
    clearTimeout(timeoutId);
    return { result, timedOut: false };
  }).catch(error => {
    clearTimeout(timeoutId);
    console.error(`[${operationName}] Error:`, error);
    return { result: fallback, timedOut: false };
  });

  return Promise.race([resultPromise, timeoutPromise]);
}

const TIMEOUTS = {
  SEMANTIC_SEARCH_MS: 2000,
} as const;

// ── Hook Dependencies Interface ─────────────────────────────────────────────

export interface ContentGenerationDeps {
  // Chat state
  chatMode: ChatMode;
  chatMessages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  replaceMessage: (id: string, msg: ChatMessage) => void;

  // Content trust config
  ecosystem: EcosystemType;
  contentChannel: ContentChannelType;
  trustSettings: TrustSettings;

  // Generation params
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
  selectedLLMProvider: LLMProviderType;

  // User context
  userProfile: UserProfile | null;
  activeProject: { defaultUserProfile?: unknown } | null;

  // Convex data (pre-fetched by React hooks in App.tsx)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convexKnowledge: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convexCorrections: any[] | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convexTrainingExamples: any[] | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convexDirectiveOverrides: any[] | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convexTokenEnforcementRules: any[] | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  convexUserLearningProfile: any | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runSemanticSearch: (...args: any[]) => Promise<any>;

  // Memory
  midTermMemory: MidTermMemory | null;
  setMidTermMemory: (memory: MidTermMemory) => void;

  // UI state setters
  setIsChatLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  setStreamingAIResponse: (text: string) => void;

  // Abort control
  getChatAbortSignal: () => AbortSignal;
  resetChatAbort: () => void;

  // Helpers
  tryAutoRenameProject: (userMsg: string, aiMsg: string) => void;
}

// ── The Hook ────────────────────────────────────────────────────────────────

export function useContentGeneration(deps: ContentGenerationDeps) {
  const {
    chatMode,
    chatMessages,
    addMessage,
    replaceMessage,
    ecosystem,
    contentChannel,
    trustSettings,
    temperature,
    maxTokens,
    streamResponse,
    selectedLLMProvider,
    userProfile,
    activeProject,
    convexKnowledge,
    convexCorrections,
    convexTrainingExamples,
    convexDirectiveOverrides,
    convexTokenEnforcementRules,
    convexUserLearningProfile,
    runSemanticSearch,
    midTermMemory,
    setMidTermMemory,
    setIsChatLoading,
    setError,
    setStreamingAIResponse,
    getChatAbortSignal,
    resetChatAbort,
    tryAutoRenameProject,
  } = deps;

  const sendMessage = useCallback(async (
    message: string,
    options: SendMessageOptions = {}
  ): Promise<SendMessageResult | null> => {
    const { parentMessageId, replaceResponseId, skipUserMessage } = options;

    // =========================================================================
    // Idempotency: Prevent duplicate rapid submissions
    // =========================================================================
    const idempotencyKey = generateIdempotencyKey(message.substring(0, 20));

    // Use request deduplication - if same message is already in flight, wait for it
    return deduplicateRequest(`chat-${message.substring(0, 50)}`, async () => {

    // Reset abort controller for new request
    resetChatAbort();

    // Create user message ONLY if not skipping (backward compatible)
    let userMessageId: string;
    if (skipUserMessage && parentMessageId) {
      userMessageId = parentMessageId;
    } else {
      const userMessage = createTextMessage('user', message, chatMode);
      addMessage(userMessage);
      userMessageId = userMessage.id;

      // v2: Track user message in session
      if (featureFlags.sessionAnalytics) {
        const sessionManager = getSessionManager();
        sessionManager.trackUserMessage(false); // false = text input
      }
    }

    // v2: Start response timer
    const isRegeneration = !!replaceResponseId;
    if (featureFlags.responseTimeTracking) {
      const responseTimer = getResponseTimer();
      responseTimer.startTimer({
        requestId: userMessageId,
        wasRegeneration: isRegeneration,
        ecosystem,
        channel: contentChannel,
        persona: featureFlags.persona ? (userProfile?.role || 'unknown') : 'unknown',
      });
    }

    setIsChatLoading(true);
    setError(null);

    try {
      // =====================================================================
      // Conversational Mode: Classify intent and branch
      // =====================================================================
      const intentClassification = featureFlags.conversationalMode
        ? classifyIntent(message, {
            profileEcosystem: ecosystem,
            profileChannel: contentChannel,
          })
        : null;

      // =====================================================================
      // Safety Gate: Pre-generation safety check
      // =====================================================================
      let safetyGateResult: SafetyGateResult | null = null;
      if (featureFlags.safetyGate) {
        safetyGateResult = checkSafetyGate(message, {
          ecosystem,
          channel: contentChannel,
        });

        // Handle emergency responses immediately
        if (safetyGateResult.routing === 'emergency_response' && safetyGateResult.emergencyResponse) {
          console.log('[SafetyGate] Emergency response triggered for:', safetyGateResult.classification.domain);

          const emergencyMessage = {
            ...createTextMessage('assistant', safetyGateResult.emergencyResponse.message, chatMode, userMessageId),
            messageIntent: 'safety_response' as const,
            safetyRouting: safetyGateResult.routing,
          };

          addMessage(emergencyMessage);

          const syncService = getSyncService();
          if (syncService) {
            syncService.logAnalyticsEvent({
              eventType: 'safety_gate_emergency',
              ecosystem,
              channel: contentChannel,
              persona: featureFlags.persona ? (userProfile?.role || 'unknown') : 'unknown',
              timestamp: Date.now(),
            });
          }

          return { success: true, message: 'Emergency response provided' };
        }

        // Block and log if required
        if (safetyGateResult.routing === 'block_and_log') {
          console.warn('[SafetyGate] Request blocked:', safetyGateResult.classification.domain);

          const blockedMessage = {
            ...createTextMessage('assistant',
              "I'm sorry, but I'm not able to help with that request. Please let me know if there's something else I can assist you with.",
              chatMode, userMessageId),
            messageIntent: 'safety_response' as const,
            safetyRouting: safetyGateResult.routing,
          };

          addMessage(blockedMessage);

          return { success: true, message: 'Request blocked for safety' };
        }

        // Log proceed_modified for monitoring
        if (safetyGateResult.routing === 'proceed_modified') {
          console.log('[SafetyGate] Proceeding with modifications:', safetyGateResult.modifications);
        }
      }

      const isContentGeneration = !intentClassification || intentClassification.intent === 'content_generation';

      if (isContentGeneration) {
        // =================================================================
        // CONTENT GENERATION PATH (Full Content Trust Pipeline)
        // =================================================================
        const effectiveEcosystem = intentClassification?.detectedEcosystem?.ecosystem || ecosystem;
        const effectiveChannel = intentClassification?.detectedChannel?.channel || contentChannel;
        const classifiedIntent = intentClassification?.intent;

        const generationContext = buildGenerationContext({
          ecosystem: effectiveEcosystem,
          channel: effectiveChannel,
          userMessage: message,
          userProfile: activeProject?.defaultUserProfile,
          persona: featureFlags.persona ? userProfile?.role : undefined,
        });

        // Build knowledge + learning data for prompt injection
        let promptKnowledge: RetrievedKnowledge | undefined;

        if (featureFlags.knowledgeBase) {
          if (convexKnowledge) {
            promptKnowledge = retrieveKnowledge(
              {
                avoidWords: convexKnowledge.avoidWords,
                preferredWords: convexKnowledge.preferredWords,
                autoFixRules: convexKnowledge.autoFixRules,
                approvedExamples: convexKnowledge.approvedExamples,
                corrections: convexCorrections || undefined,
              },
              effectiveEcosystem,
              effectiveChannel
            );
          } else {
            promptKnowledge = getCodeDefaults(effectiveEcosystem, effectiveChannel);
          }

          // Merge local corrections for immediate learning
          if (featureFlags.learning) {
            const localCorrections = getLocalCorrections(effectiveEcosystem, effectiveChannel);
            promptKnowledge = mergeLearnedCorrections(
              promptKnowledge,
              localCorrections,
              effectiveEcosystem,
              effectiveChannel,
            );

            // Merge Convex corrections if available
            if (convexCorrections && convexCorrections.length > 0) {
              type CorrectionType = typeof convexCorrections[number];
              const convexCorrectionEntries = convexCorrections
                .filter((c: CorrectionType) => c.editedContent || c.comment)
                .map((c: CorrectionType) => ({
                  original: c.originalContent,
                  edited: c.editedContent || '',
                  context: c.comment || `${c.feedbackType} feedback`,
                }));

              if (convexCorrectionEntries.length > 0) {
                promptKnowledge = {
                  ...promptKnowledge,
                  corrections: [
                    ...promptKnowledge.corrections,
                    ...convexCorrectionEntries,
                  ],
                };
              }
            }
          }

          // =====================================================================
          // RAG: Enrich with semantically relevant knowledge
          // =====================================================================
          try {
            let searchQuery = message;
            let queryExpansion: ExpandedQuery | null = null;

            if (featureFlags.ragQueryExpansion) {
              queryExpansion = expandQueryFull(message, {
                channel: effectiveChannel,
                ecosystem: effectiveEcosystem,
                maxExpansions: 3,
              });

              if (queryExpansion.wasExpanded) {
                searchQuery = queryExpansion.expanded;
                console.log(`[RAG] Query expanded: "${message}" → "${searchQuery}" (added: ${queryExpansion.addedTerms.join(', ')})`);
              }
            }

            // Parallel Semantic Searches for Priority Types
            const searchPromises = [
              runSemanticSearch({
                query: searchQuery,
                limit: 20,
                filterActiveOnly: true,
              }) as Promise<SemanticSearchResult[]>,
              runSemanticSearch({
                query: searchQuery,
                limit: 30,
                filterType: 'avoid_word',
                filterActiveOnly: true,
              }) as Promise<SemanticSearchResult[]>,
              runSemanticSearch({
                query: searchQuery,
                limit: 20,
                filterType: 'preferred_word',
                filterActiveOnly: true,
              }) as Promise<SemanticSearchResult[]>,
              runSemanticSearch({
                query: searchQuery,
                limit: 20,
                filterType: 'auto_fix',
                filterActiveOnly: true,
              }) as Promise<SemanticSearchResult[]>,
            ];

            const { result: searchResultsArray, timedOut } = await withTimeout(
              Promise.all(searchPromises),
              TIMEOUTS.SEMANTIC_SEARCH_MS,
              [[], [], [], []] as SemanticSearchResult[][],
              'RAG semantic search'
            );

            if (timedOut) {
              console.warn('[RAG] Semantic search timed out, continuing without RAG enrichment');
            } else {
              const [generalResults, avoidResults, preferredResults, autoFixResults] = searchResultsArray;
              const seenIds = new Set<string>();
              const mergedResults: SemanticSearchResult[] = [];

              for (const result of [...avoidResults, ...autoFixResults, ...preferredResults, ...generalResults]) {
                if (!seenIds.has(result._id)) {
                  seenIds.add(result._id);
                  mergedResults.push(result);
                }
              }

              console.log(`[RAG] Merged results: ${avoidResults.length} avoid, ${preferredResults.length} preferred, ${autoFixResults.length} auto_fix, ${generalResults.length} general → ${mergedResults.length} unique`);

              if (mergedResults.length > 0) {
                let finalResults: SemanticSearchResult[] = mergedResults;

                if (featureFlags.ragResultRanking) {
                  const rankedResults = rankResults(
                    mergedResults,
                    {
                      ecosystem: effectiveEcosystem,
                      channel: effectiveChannel,
                      persona: featureFlags.persona ? userProfile?.role : undefined,
                      query: message,
                    },
                    50
                  );

                  finalResults = rankedResults;
                  console.log(`[RAG] Ranked ${mergedResults.length} results → top ${finalResults.length}`);

                  if (rankedResults.length > 0) {
                    const top = rankedResults[0];
                    console.log(`[RAG] Top result: "${top.content.substring(0, 50)}..." (score: ${top.rankScore.toFixed(3)}, type: ${top.type})`);
                  }
                }

                promptKnowledge = enrichWithSemanticResults(
                  promptKnowledge,
                  finalResults,
                  0.3
                );
                console.log(`[RAG] Enriched prompt with ${finalResults.length} semantic results`);
              }
            }
          } catch (ragError) {
            console.error('[RAG] Semantic search failed, continuing without RAG enrichment:', ragError);
          }
        }

        // =====================================================================
        // Constitutional AI: Prepare context
        // =====================================================================
        let constitutionalContext: ConstitutionalContext | null = null;
        let constitutionalSystemInjection = '';

        if (featureFlags.constitutionalWrapper) {
          try {
            const constitutionalRequest: GenerationRequest = {
              userMessage: message,
              ecosystem: effectiveEcosystem,
              channel: effectiveChannel,
              userProfile: userProfile?.role as 'new_user' | 'regular' | 'premium' | 'enterprise' | 'senior' | 'youth' | 'unknown' | undefined,
              conversationHistory: chatMessages
                .filter(m => m.type === 'text')
                .slice(-10)
                .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
              directiveOverrides: convexDirectiveOverrides?.map((o: { directiveType: string; directiveKey: string; ecosystem?: string; channel?: string; overrideAction: string; overrideValue?: string; priority: number; reason?: string; isActive: boolean }) => ({
                directiveType: o.directiveType,
                directiveKey: o.directiveKey,
                ecosystem: o.ecosystem,
                channel: o.channel,
                overrideAction: o.overrideAction,
                overrideValue: o.overrideValue,
                priority: o.priority,
                reason: o.reason,
                isActive: o.isActive,
              })) || [],
            };

            if (convexDirectiveOverrides && convexDirectiveOverrides.length > 0) {
              console.log(`[Constitutional] Applying ${convexDirectiveOverrides.length} directive overrides from Convex`);
            }

            constitutionalContext = prepareConstitutionalContext(constitutionalRequest);

            // Check if constitutional context blocks the request
            if (!constitutionalContext.shouldProceed && constitutionalContext.prebuiltResponse) {
              console.log('[Constitutional] Using pre-built response:', constitutionalContext.safetyResult.routing);

              const prebuiltMessage = {
                ...createTextMessage('assistant', constitutionalContext.prebuiltResponse, chatMode, userMessageId),
                messageIntent: 'content_generation' as const,
                safetyRouting: constitutionalContext.safetyResult.routing,
              };

              addMessage(prebuiltMessage);
              return { success: true, message: 'Pre-built response used' };
            }

            // Get the system prompt injection from constitutional context
            constitutionalSystemInjection = constitutionalContext.systemPromptInjection;
            console.log(`[Constitutional] Prepared context in ${constitutionalContext.metadata.processingTimeMs.toFixed(1)}ms`);

            // Token Gate: Pre-generation blocking based on token values
            if (constitutionalContext.tokens) {
              const gateDecision = checkTokenGate(constitutionalContext.tokens);
              console.log(`[TokenGate] ${formatGateDecision(gateDecision)}`);

              if (!gateDecision.shouldProceed && gateDecision.prebuiltResponse) {
                console.log('[TokenGate] Request blocked, using pre-built response');

                const blockedMessage = {
                  ...createTextMessage('assistant', gateDecision.prebuiltResponse, chatMode, userMessageId),
                  messageIntent: 'content_generation' as const,
                  tokenGateBlocked: true,
                  blockReason: gateDecision.reason,
                };

                addMessage(blockedMessage);
                return { success: true, message: 'Token gate blocked - pre-built response used' };
              }

              if (gateDecision.promptInjection) {
                constitutionalSystemInjection = `${constitutionalSystemInjection}\n\n---\n\n${gateDecision.promptInjection}`;
                console.log(`[TokenGate] Added prompt modifications for ${gateDecision.triggeringTokens.length} tokens`);
              }
            }
          } catch (constitutionalError) {
            console.warn('[Constitutional] Context preparation failed, continuing without:', constitutionalError);
          }
        }

        // Build comprehensive prompt
        const { system: systemPrompt, context: finalContext } = buildPrompt(
          generationContext,
          message,
          promptKnowledge ? { knowledge: promptKnowledge } : {}
        );

        // Profile Learning: Add personalization section
        let profileLearningSection = '';
        if (featureFlags.learning) {
          const learningProfile: UserLearningProfile | null = convexUserLearningProfile ? {
            userId: convexUserLearningProfile.userId,
            deviceId: convexUserLearningProfile.deviceId,
            avoidPatterns: convexUserLearningProfile.avoidPatterns ?? [],
            preferredWarmth: convexUserLearningProfile.preferredWarmth,
            preferredDetail: convexUserLearningProfile.preferredDetail,
            preferredLanguage: convexUserLearningProfile.preferredLanguage,
            traitPreferences: convexUserLearningProfile.traitPreferences ?? [],
            correctionCount: convexUserLearningProfile.correctionCount ?? 0,
            lastCorrectionAt: convexUserLearningProfile.lastCorrectionAt,
          } : null;

          const correctionEntries: CorrectionEntry[] = (convexCorrections ?? [])
            .filter((c: { editedContent?: string; comment?: string }) => c.editedContent || c.comment)
            .map((c: { originalContent: string; editedContent?: string; comment?: string; feedbackType: string; timestamp: number }) => ({
              original: c.originalContent,
              edited: c.editedContent || '',
              context: c.comment || `${c.feedbackType} feedback`,
              timestamp: c.timestamp,
              feedbackType: c.feedbackType,
            }));

          profileLearningSection = buildProfileLearningSection(learningProfile, correctionEntries);

          if (profileLearningSection) {
            const summary = getPersonalizationSummary(learningProfile, correctionEntries);
            console.log(`[ProfileLearning] Injecting personalization: ${summary.topWeightedCount} corrections, ${summary.avoidPatternCount} avoid patterns`);
          }
        }

        // Combine system prompt with all injections
        let enhancedSystemPrompt = systemPrompt;

        if (constitutionalSystemInjection) {
          enhancedSystemPrompt = `${constitutionalSystemInjection}\n\n---\n\n${enhancedSystemPrompt}`;
        }

        if (profileLearningSection) {
          enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${profileLearningSection}`;
        }

        // Memory Context: Add session and mid-term memory
        if (featureFlags.learning) {
          const sessionMemoryBlock = formatSessionMemoryForPrompt();
          if (sessionMemoryBlock) {
            enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${sessionMemoryBlock}`;
          }

          if (midTermMemory) {
            const memoryContext = extractMemoryContext(
              midTermMemory,
              classifiedIntent || undefined,
              effectiveEcosystem
            );

            const midTermMemoryBlock = formatMemoryForPrompt(memoryContext);
            if (midTermMemoryBlock) {
              enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${midTermMemoryBlock}`;
            }

            const continuationGreeting = getContinuationGreeting(memoryContext);
            if (continuationGreeting) {
              console.log(`[Memory] Continuation greeting: "${continuationGreeting}"`);
            }

            if (memoryContext.hasRecentInteraction) {
              console.log(`[Memory] User returning after ${memoryContext.daysSinceLastInteraction} days, top intents: ${memoryContext.topIntents.join(', ')}`);
            }
          }

          const entity = extractPrimaryEntity(message);
          updateSessionMemory({
            intent: classifiedIntent || undefined,
            entity: entity || undefined,
            incrementTurn: true,
          });
        }

        // Nudge Controller
        let nudgeDecision: NudgeDecision | undefined;
        try {
          const nudgeContext: NudgeContext = {
            permission: 'allowed',
            emotion: constitutionalContext?.tokens?.userEmotion || 'shanta',
            intent: classifiedIntent || 'general',
            resolutionStatus: constitutionalContext?.stateContext?.resolutionStatus || 'in_progress',
            turnNumber: chatMessages.filter(m => m.role === 'user').length + 1,
            ecosystem: effectiveEcosystem,
            userSegment: userProfile?.role,
          };

          nudgeDecision = decideNudge(nudgeContext);

          if (nudgeDecision.shouldNudge && nudgeDecision.nudge) {
            const nudgePromptBlock = formatNudgeForPrompt(nudgeDecision);
            enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${nudgePromptBlock}`;
            console.log(`[Nudge] Including ${nudgeDecision.nudge.type} nudge: "${nudgeDecision.nudge.message.substring(0, 50)}..."`);
          } else if (nudgeDecision.blockedBySensitivity) {
            console.log('[Nudge] Blocked by sensitivity override');
          }
        } catch (nudgeError) {
          console.warn('[Nudge] Decision failed:', nudgeError);
        }

        // Domain Playbooks
        try {
          const detectedDomain = detectDomain(message, effectiveEcosystem);
          const domainPlaybook = getPlaybook(detectedDomain);

          if (domainPlaybook) {
            const playbookGuidance = formatPlaybookForPrompt(domainPlaybook, message);
            enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${playbookGuidance}`;
            console.log(`[Playbook] Applied ${detectedDomain} domain playbook`);
          }
        } catch (playbookError) {
          console.warn('[Playbook] Failed to apply:', playbookError);
        }

        // Training Examples: Add few-shot examples
        if (featureFlags.learning && convexTrainingExamples && convexTrainingExamples.length > 0) {
          const examplesSection = [
            '# high-quality examples',
            'use these verified examples as a reference for style and format:',
            '',
            ...convexTrainingExamples.map((ex: { inputContext: string; outputContent: string; ecosystem?: string; channel?: string }, i: number) => {
              const lines = [
                `## example ${i + 1}`,
                `input: "${ex.inputContext}"`,
                `output: "${ex.outputContent}"`,
              ];
              if (ex.ecosystem) lines.push(`ecosystem: ${ex.ecosystem}`);
              if (ex.channel) lines.push(`channel: ${ex.channel}`);
              return lines.join('\n');
            }),
          ].join('\n\n');

          enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${examplesSection}`;
          console.log(`[TrainingExamples] Injected ${convexTrainingExamples.length} few-shot examples`);
        }

        // Build messages with system prompt and history
        const contextMessages = chatMessages
          .filter(m => m.type === 'text')
          .slice(-20);

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: enhancedSystemPrompt },
          ...contextMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: message },
        ];

        // Use the orchestrator for generation with retry and fallback
        const orchestrator = getOrchestratorInstance();

        let result: { content: string; usage: import('../services/providers/llm/types').LLMUsageMetrics };

        // Use streaming if enabled
        if (streamResponse) {
          let accumulatedText = '';
          try {
            const streamResult = await orchestrator.generateStream(
              selectedLLMProvider,
              {
                messages,
                maxTokens: maxTokens,
                temperature: temperature,
                signal: getChatAbortSignal(),
              },
              createLLMProvider,
              (chunk: string) => {
                accumulatedText += chunk;
                setStreamingAIResponse(accumulatedText);
              }
            );
            result = streamResult;
          } finally {
            setStreamingAIResponse('');
          }
        } else {
          const nonStreamResult = await orchestrator.generate(
            selectedLLMProvider,
            {
              messages,
              maxTokens: maxTokens,
              temperature: temperature,
              stream: false,
              signal: getChatAbortSignal(),
            },
            createLLMProvider,
            ['intent:content_generation']
          );
          result = nonStreamResult;
        }

        // Finishing Layer: Apply Small Joy & Signature
        let finishedContent = result.content;
        let joySelection: JoySelection | undefined;
        let signatureSelection: SignatureSelection | undefined;

        try {
          const resolutionStatus = constitutionalContext?.stateContext?.resolutionStatus || 'in_progress';
          const hasSolutionContext =
            resolutionStatus === 'resolved' ||
            /(?:step\s*\d|follow these|here's how|to fix this|you can|try this)/i.test(finishedContent);

          const joyContext: JoyContext = {
            emotion: constitutionalContext?.tokens?.userEmotion || 'shanta',
            emotionIntensity: constitutionalContext?.tokens?.emotionIntensity || 'moderate',
            intent: classifiedIntent || 'general',
            topic: effectiveEcosystem,
            ecosystem: effectiveEcosystem,
            resolutionStatus,
            turnNumber: chatMessages.filter(m => m.role === 'user').length + 1,
            isMilestone: false,
            safetyDomain: constitutionalContext?.safetyResult?.domain,
            riskLevel: constitutionalContext?.tokens?.risk,
            isComplaint: classifiedIntent === 'complaint',
            isEscalated: constitutionalContext?.stateContext?.wasEscalated || false,
            contextEvent: undefined,
            hasSolutionContext,
          };

          joySelection = selectJoy(joyContext);
          if (joySelection.shouldInclude && joySelection.element) {
            finishedContent = injectJoy(finishedContent, joySelection);
            console.log(`[Finishing] Added ${joySelection.element.type} joy at ${joySelection.element.placement}`);
          }

          const signatureContext: SignatureContext = {
            resolutionStatus: constitutionalContext?.stateContext?.resolutionStatus || 'in_progress',
            emotion: constitutionalContext?.tokens?.userEmotion || 'shanta',
            emotionIntensity: constitutionalContext?.tokens?.emotionIntensity || 'moderate',
            intent: classifiedIntent || 'general',
            turnNumber: chatMessages.filter(m => m.role === 'user').length + 1,
            isLastTurn: false,
            wasEscalated: constitutionalContext?.stateContext?.wasEscalated || false,
            channel: effectiveChannel,
            safetyDomain: constitutionalContext?.safetyResult?.domain,
            riskLevel: constitutionalContext?.tokens?.risk,
            isComplaint: classifiedIntent === 'complaint',
            isHealthContext: constitutionalContext?.safetyResult?.domain?.includes('health'),
          };

          signatureSelection = selectSignature(signatureContext);
          if (signatureSelection.shouldInclude && signatureSelection.text) {
            finishedContent = appendSignature(finishedContent, signatureSelection);
            console.log(`[Finishing] Added ${signatureSelection.type} signature`);
          }
        } catch (finishingError) {
          console.warn('[Finishing] Error applying finishing layer:', finishingError);
          finishedContent = result.content;
        }

        let contentForValidation = finishedContent;
        let hasAttemptedRegeneration = false;

        // Token Enforcement: Post-generation validation against Convex rules
        const cachedRules = getCachedEnforcementRules();
        if (cachedRules.length > 0) {
          try {
            const activeTokens = {
              ecosystem: effectiveEcosystem,
              channel: effectiveChannel,
              'safety.domain': constitutionalContext?.safetyResult?.domain || 'general',
              'safety.level': constitutionalContext?.tokens?.safetyLevel || 'none',
              'emotion.rasa.user': constitutionalContext?.tokens?.userEmotion || 'shanta',
              'emotion.intensity': constitutionalContext?.tokens?.emotionIntensity || 'moderate',
              persona: featureFlags.persona ? userProfile?.role : undefined,
            };

            const enforcementContext: TokenEnforcementContext = {
              activeTokens,
              rules: cachedRules,
            };

            const enforcementAgent = createTokenEnforcementAgent(enforcementContext);
            const enforcementResult = await enforcementAgent.validate(contentForValidation);

            if (!enforcementResult.passed) {
              console.warn('[TokenEnforcement] Response violations detected:',
                enforcementResult.violations.map((v: { rule: string; term: string; severity: string; autoFixable: boolean }) => ({
                  rule: v.rule,
                  term: v.term,
                  severity: v.severity,
                  autoFixable: v.autoFixable,
                }))
              );

              const autoFixableViolations = enforcementResult.violations.filter((v: { autoFixable: boolean; autoFixAction?: string }) =>
                v.autoFixable && v.autoFixAction === 'remove'
              );

              if (autoFixableViolations.length > 0) {
                let fixedContent = contentForValidation;

                for (const violation of autoFixableViolations) {
                  const termRegex = new RegExp(`\\b${violation.term}\\b`, 'gi');
                  fixedContent = fixedContent.replace(termRegex, '');
                }

                fixedContent = fixedContent
                  .replace(/ {2,}/g, ' ')
                  .replace(/ +([.,!?])/g, '$1')
                  .replace(/([.,!?]) *([.,!?])/g, '$1')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();

                console.log(`[TokenEnforcement] Auto-fixed ${autoFixableViolations.length} brand violations`);
                contentForValidation = fixedContent;
              }

              const severeViolations = enforcementResult.violations.filter((v: { severity: string; autoFixable: boolean }) =>
                v.severity === 'error' && !v.autoFixable
              );

              if (severeViolations.length > 0) {
                console.error('[TokenEnforcement] CRITICAL: Severe violations that need regeneration:',
                  severeViolations.map((v: { term: string }) => v.term)
                );
              }
            } else {
              console.log('[TokenEnforcement] Response passed brand protection checks');
            }
          } catch (enforcementError) {
            console.warn('[TokenEnforcement] Validation failed:', enforcementError);
          }
        }

        // Content Trust System: Validate and Score Content
        let trustScore: TrustScore | undefined;
        let validationSummary: { passedCount: number; warningCount: number; errorCount: number; autoFixesApplied: number } | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let validationResult: any;

        try {
          validationResult = await runValidationPipeline(contentForValidation, finalContext);
          trustScore = calculateTrustScore(validationResult, trustSettings);

          validationSummary = {
            passedCount: validationResult.agentResults.filter((r: { passed: boolean }) => r.passed).length,
            warningCount: validationResult.agentResults
              .flatMap((r: { violations: Array<{ severity: string }> }) => r.violations)
              .filter((v: { severity: string }) => v.severity === 'warning').length,
            errorCount: validationResult.agentResults
              .flatMap((r: { violations: Array<{ severity: string }> }) => r.violations)
              .filter((v: { severity: string }) => v.severity === 'error').length,
            autoFixesApplied: 0,
          };
        } catch (validationError) {
          console.warn('Content validation failed:', validationError);
        }

        // Constitutional AI: Validate response and ENFORCE violations
        let constitutionalValidation: ConstitutionalValidationResult | undefined;
        let constitutionalViolations: Array<{
          severity: 'error' | 'warning' | 'info';
          rule: string;
          text: string;
          suggestion: string;
          category: string;
          autoFixable: boolean;
        }> = [];

        if (featureFlags.constitutionalWrapper && constitutionalContext) {
          try {
            constitutionalValidation = validateConstitutionalResponse(
              contentForValidation,
              constitutionalContext
            );

            if (!constitutionalValidation.passed) {
              constitutionalViolations = convertToViolations(constitutionalValidation);

              logger.warn('[Constitutional] Response validation issues:', {
                checks: constitutionalValidation.checks.filter((c: { passed: boolean }) => !c.passed).map((c: { name: string; severity: string; message: string }) => ({
                  name: c.name,
                  severity: c.severity,
                  message: c.message,
                })),
                hasCritical: constitutionalValidation.hasCriticalIssues,
                hasError: constitutionalValidation.hasErrorIssues,
              });

              if (constitutionalValidation.hasCriticalIssues && !hasAttemptedRegeneration) {
                logger.error('[Constitutional] CRITICAL violations detected - triggering regeneration');
                hasAttemptedRegeneration = true;

                const criticalChecks = constitutionalValidation.checks
                  .filter((c: { severity: string }) => c.severity === 'critical')
                  .map((c: { message: string }) => c.message)
                  .join(', ');

                logger.warn(`[Constitutional] Critical issues that would trigger regeneration: ${criticalChecks}`);
              }
            } else {
              logger.debug('[Constitutional] Response passed validation');
            }
          } catch (constitutionalValidationError) {
            logger.warn('[Constitutional] Response validation failed:', constitutionalValidationError);
          }
        }

        // Merge constitutional violations into main validation result
        if (constitutionalViolations.length > 0 && validationResult) {
          const existingViolations = validationResult.results.flatMap((r: { violations: unknown[] }) => r.violations);
          const mergedViolations = [
            ...existingViolations,
            ...constitutionalViolations.map(cv => ({
              severity: cv.severity,
              rule: cv.rule,
              text: cv.text,
              suggestion: cv.suggestion,
              category: cv.category,
              autoFixable: cv.autoFixable,
              position: undefined,
            })),
          ];

          validationResult.summary.totalViolations += constitutionalViolations.length;
          validationResult.summary.errorCount += constitutionalViolations.filter(v => v.severity === 'error').length;

          if (constitutionalViolations.some(v => v.severity === 'error')) {
            if (validationResult.summary.errorCount > 2) {
              validationResult.certification = 'issues_found';
            } else if (validationResult.overallScore < 70) {
              validationResult.certification = 'issues_found';
            } else if (validationResult.overallScore < 90) {
              validationResult.certification = 'review_recommended';
            }
          }

          validationResult.results.push({
            agentId: 'constitutional',
            score: constitutionalValidation?.passed ? 100 : Math.max(0, 100 - (constitutionalViolations.length * 15)),
            violations: constitutionalViolations.map(cv => ({
              severity: cv.severity,
              rule: cv.rule,
              text: cv.text,
              suggestion: cv.suggestion,
              category: cv.category,
              autoFixable: cv.autoFixable,
            })),
            processingTimeMs: 0,
          });
        }

        // Auto-Fix Preview
        let autoFixPreview: AutoFixPreview | undefined;

        console.log('[AutoFix] Checking for auto-fixable violations:', {
          hasTrustScore: !!trustScore,
          autoFixableCount: trustScore?.autoFixableCount ?? 'N/A',
        });

        if (trustScore && trustScore.autoFixableCount > 0) {
          try {
            const autoFixableViolations = trustScore.validationResults
              .flatMap((r: { violations: Array<{ autoFixable: boolean }> }) => r.violations)
              .filter((v: { autoFixable: boolean }) => v.autoFixable);

            console.log('[AutoFix] Auto-fixable violations found:', autoFixableViolations.map((v: { term?: string; type?: string; suggestion?: string }) => ({
              term: v.term,
              type: v.type,
              suggestion: v.suggestion,
            })));

            if (autoFixableViolations.length > 0) {
              const dynamicReplacements = convexKnowledge?.autoFixRules?.map((rule: { content: string; metadata?: { suggestion?: string } }) => ({
                from: rule.content,
                to: rule.metadata?.suggestion,
              }));

              console.log('[AutoFix] Dynamic replacements from Convex:', dynamicReplacements?.length ?? 0);

              const fixes = generateAutoFixes(autoFixableViolations, dynamicReplacements);
              console.log('[AutoFix] Generated fixes:', fixes);

              const fixResult = applyAutoFixes(contentForValidation, fixes);
              console.log('[AutoFix] Applied fixes:', {
                totalGenerated: fixes.length,
                appliedCount: fixResult.appliedFixes.length,
                originalLength: contentForValidation.length,
                fixedLength: fixResult.fixedContent.length,
              });

              if (fixResult.appliedFixes.length > 0) {
                autoFixPreview = {
                  originalContent: contentForValidation,
                  fixedContent: fixResult.fixedContent,
                  appliedFixes: fixResult.appliedFixes,
                  isPending: false,
                };

                const fixedValidationResult = await runValidationPipeline(fixResult.fixedContent, finalContext);
                trustScore = calculateTrustScore(fixedValidationResult, trustSettings);

                console.log(`[AutoFix] Auto-applied ${fixResult.appliedFixes.length} fixes (${dynamicReplacements?.length || 0} Convex rules). New trust score: ${trustScore?.overall ?? 'N/A'}`);
              } else {
                console.log('[AutoFix] No fixes were actually applied to content');
              }
            } else {
              console.log('[AutoFix] No auto-fixable violations after filtering');
            }
          } catch (autoFixError) {
            console.warn('[AutoFix] Failed to generate preview:', autoFixError);
          }
        } else {
          console.log('[AutoFix] Skipping - no auto-fixable count:', trustScore?.autoFixableCount ?? 'no trustScore');
        }

        const finalContent = autoFixPreview?.fixedContent ?? contentForValidation;

        // Privacy: Mask any sensitive data
        let privacyMaskedContent = finalContent;
        try {
          if (containsSensitiveData(finalContent)) {
            const maskResult = maskSensitiveData(finalContent);
            if (maskResult.wasModified) {
              privacyMaskedContent = maskResult.maskedText;
              console.log(`[Privacy] Masked ${maskResult.sensitiveDataFound.length} sensitive items:`,
                maskResult.sensitiveDataFound.map((d: { type: string }) => d.type));
            }
          }
        } catch (privacyError) {
          console.warn('[Privacy] Error masking sensitive data:', privacyError);
          privacyMaskedContent = finalContent;
        }

        // Build Generation Evidence for Trust panel transparency
        const evidence: GenerationEvidence = {
          knowledgeUsed: {
            avoidWordsMatched: trustScore?.validationResults
              .flatMap((r: { violations: Array<{ agentId?: string; text?: string; rule?: string }> }) => r.violations)
              .filter((v: { agentId?: string }) => v.agentId === 'avoid_words')
              .map((v: { text?: string; rule?: string }) => v.text || v.rule)
              .filter((t: string | undefined): t is string => !!t)
              .slice(0, 10) ?? [],
            preferredWordsUsed: promptKnowledge?.preferredWords?.slice(0, 10) ?? [],
            autoFixRulesCount: promptKnowledge?.autoFixRules?.length ?? 0,
            source: promptKnowledge?.source ?? 'code_defaults',
          },
          learningsApplied: {
            correctionsCount: promptKnowledge?.corrections?.length ?? 0,
            avoidPatterns: promptKnowledge?.avoidWords
              ?.filter((w: string) => !getCodeDefaults().avoidWords.includes(w))
              .slice(0, 5) ?? [],
            stylePreferences: promptKnowledge?.stylePreferences?.slice(0, 3) ?? [],
          },
          autoFixes: {
            applied: autoFixPreview?.appliedFixes?.map((f: { original: string; replacement: string }) => ({ from: f.original, to: f.replacement })) ?? [],
            totalCount: autoFixPreview?.appliedFixes?.length ?? 0,
          },
        };

        // Create AI response with trust data
        const aiMessage = {
          ...createTextMessage('assistant', privacyMaskedContent, chatMode, userMessageId),
          messageIntent: 'content_generation' as const,
          trustScore,
          generationContext: finalContext,
          validationSummary,
          autoFixPreview,
          evidence,
        };

        if (replaceResponseId) {
          replaceMessage(replaceResponseId, aiMessage);
        } else {
          addMessage(aiMessage);
        }

        tryAutoRenameProject(message, privacyMaskedContent);

        // v2: Track assistant message and response time
        let responseTimeMs: number | undefined;
        if (featureFlags.responseTimeTracking || featureFlags.sessionAnalytics) {
          const responseTimer = getResponseTimer();
          responseTimeMs = responseTimer.endTimer() ?? undefined;

          if (featureFlags.sessionAnalytics) {
            const sessionManager = getSessionManager();
            sessionManager.trackAssistantMessage(responseTimeMs);
          }
        }

        // Log analytics event
        const syncService = getSyncService();
        const allViolations = trustScore?.validationResults.flatMap((r: { violations: unknown[] }) => r.violations) ?? [];
        syncService?.logAnalyticsEvent({
          eventType: 'generation',
          ecosystem: finalContext.ecosystem,
          channel: finalContext.channel,
          persona: finalContext.persona || 'unknown',
          trustScore: trustScore?.overall,
          violationCount: trustScore?.totalViolations ?? 0,
          topViolations: allViolations.slice(0, 5).map((v: { rule?: string }) => v.rule) ?? [],
          tokenCount: result.usage?.totalTokens,
          llmProvider: selectedLLMProvider,
          timestamp: Date.now(),
          responseTimeMs,
          wasRegeneration: isRegeneration,
        });

        // Update mid-term memory
        if (featureFlags.learning) {
          const userId = userProfile?.userId || getDeviceId();
          const deviceId = getDeviceId();

          const updatedMemory = updateMemory(
            midTermMemory || createEmptyMemory(userId, deviceId),
            {
              intent: classifiedIntent || 'content_generation',
              topic: effectiveEcosystem,
              ecosystem: effectiveEcosystem,
              channel: contentChannel,
              language: 'en',
              resolutionStatus: 'resolved',
              turnCount: chatMessages.filter(m => m.role === 'user').length,
              wasEscalated: false,
            }
          );

          setMidTermMemory(updatedMemory);
          console.log('[Memory] Updated mid-term memory for content generation');
        }

        return {
          userMessageId,
          aiMessageId: aiMessage.id,
          success: true,
        } as SendMessageResult;

      } else {
        // =================================================================
        // CONVERSATIONAL PATH (General Chat / Jio Inquiry)
        // =================================================================
        const systemPrompt = intentClassification.intent === 'jio_inquiry'
          ? buildJioInquiryPrompt()
          : buildConversationalPrompt();

        const contextMessages = chatMessages
          .filter(m => m.type === 'text')
          .slice(-20);

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...contextMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: message },
        ];

        const orchestrator = getOrchestratorInstance();

        let result: { content: string; usage: import('../services/providers/llm/types').LLMUsageMetrics };

        if (streamResponse) {
          let accumulatedText = '';
          try {
            const streamResult = await orchestrator.generateStream(
              selectedLLMProvider,
              {
                messages,
                maxTokens: maxTokens,
                temperature: temperature,
                signal: getChatAbortSignal(),
              },
              createLLMProvider,
              (chunk: string) => {
                accumulatedText += chunk;
                setStreamingAIResponse(accumulatedText);
              }
            );
            result = streamResult;
          } finally {
            setStreamingAIResponse('');
          }
        } else {
          const nonStreamResult = await orchestrator.generate(
            selectedLLMProvider,
            {
              messages,
              maxTokens: maxTokens,
              temperature: temperature,
              stream: false,
              signal: getChatAbortSignal(),
            },
            createLLMProvider,
            [`intent:${intentClassification.intent}`]
          );
          result = nonStreamResult;
        }

        // Finishing Layer for conversational path
        let conversationalFinishedContent = result.content;
        const isGeneralChat = intentClassification.intent === 'general_chat';

        if (!isGeneralChat) {
          try {
            const conversationalHasSolution =
              /(?:step\s*\d|follow these|here's how|to fix this|you can|try this)/i.test(conversationalFinishedContent);

            const conversationalJoyContext: JoyContext = {
              emotion: 'shanta',
              intent: intentClassification.intent,
              topic: intentClassification.detectedEcosystem?.ecosystem || 'general',
              ecosystem: intentClassification.detectedEcosystem?.ecosystem || 'general',
              resolutionStatus: 'in_progress',
              turnNumber: chatMessages.filter(m => m.role === 'user').length + 1,
              isMilestone: false,
              safetyDomain: undefined,
              riskLevel: 'low',
              isComplaint: intentClassification.intent === 'complaint',
              isEscalated: false,
              hasSolutionContext: conversationalHasSolution,
            };

            const conversationalJoy = selectJoy(conversationalJoyContext);
            if (conversationalJoy.shouldInclude && conversationalJoy.element) {
              conversationalFinishedContent = injectJoy(conversationalFinishedContent, conversationalJoy);
              console.log(`[Finishing] Conversational: Added ${conversationalJoy.element.type} joy`);
            }

            const conversationalSignatureContext: SignatureContext = {
              resolutionStatus: 'in_progress',
              emotion: 'shanta',
              intent: intentClassification.intent,
              turnNumber: chatMessages.filter(m => m.role === 'user').length + 1,
              isLastTurn: false,
              wasEscalated: false,
              channel: contentChannel,
              isComplaint: intentClassification.intent === 'complaint',
            };

            const conversationalSignature = selectSignature(conversationalSignatureContext);
            if (conversationalSignature.shouldInclude && conversationalSignature.text) {
              conversationalFinishedContent = appendSignature(conversationalFinishedContent, conversationalSignature);
              console.log(`[Finishing] Conversational: Added ${conversationalSignature.type} signature`);
            }
          } catch (finishingError) {
            console.warn('[Finishing] Conversational error:', finishingError);
            conversationalFinishedContent = result.content;
          }
        } else {
          console.log('[Finishing] Skipping joy/signature for general_chat intent');
        }

        // Token Enforcement for conversational path
        const conversationalCachedRules = getCachedEnforcementRules();
        if (conversationalCachedRules.length > 0) {
          try {
            const effectiveEcosystem = intentClassification?.detectedEcosystem?.ecosystem || ecosystem;
            const effectiveChannel = intentClassification?.detectedChannel?.channel || contentChannel;

            const activeTokens = {
              ecosystem: effectiveEcosystem,
              channel: effectiveChannel,
              'safety.domain': 'general',
              'safety.level': 'none',
              'emotion.rasa.user': 'shanta',
              'emotion.intensity': 'moderate',
              persona: featureFlags.persona ? userProfile?.role : undefined,
            };

            const enforcementContext: TokenEnforcementContext = {
              activeTokens,
              rules: conversationalCachedRules,
            };

            const enforcementAgent = createTokenEnforcementAgent(enforcementContext);
            const enforcementResult = await enforcementAgent.validate(conversationalFinishedContent);

            console.log('[TokenEnforcement] Conversational path - checking response against',
              conversationalCachedRules.length, 'cached rules');

            if (!enforcementResult.passed) {
              console.warn('[TokenEnforcement] Conversational violations detected:',
                enforcementResult.violations.map((v: { rule: string; term: string; severity: string; autoFixable: boolean }) => ({
                  rule: v.rule,
                  term: v.term,
                  severity: v.severity,
                  autoFixable: v.autoFixable,
                }))
              );

              const autoFixableViolations = enforcementResult.violations.filter((v: { autoFixable: boolean; autoFixAction?: string }) =>
                v.autoFixable && v.autoFixAction === 'remove'
              );

              if (autoFixableViolations.length > 0) {
                let fixedContent = conversationalFinishedContent;

                for (const violation of autoFixableViolations) {
                  const termRegex = new RegExp(`\\b${violation.term}\\b`, 'gi');
                  fixedContent = fixedContent.replace(termRegex, '');
                }

                fixedContent = fixedContent
                  .replace(/ {2,}/g, ' ')
                  .replace(/ +([.,!?])/g, '$1')
                  .replace(/([.,!?]) *([.,!?])/g, '$1')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();

                console.log(`[TokenEnforcement] Conversational: Auto-fixed ${autoFixableViolations.length} brand violations`);
                conversationalFinishedContent = fixedContent;
              }
            } else {
              console.log('[TokenEnforcement] Conversational response passed brand protection checks');
            }
          } catch (enforcementError) {
            console.warn('[TokenEnforcement] Conversational validation failed:', enforcementError);
          }
        } else {
          console.log('[TokenEnforcement] No cached enforcement rules available. Convex query state:', {
            queryValue: convexTokenEnforcementRules,
            queryLoaded: convexTokenEnforcementRules !== undefined,
          });
        }

        // Lightweight validation on conversational content
        let conversationalTrustScore: TrustScore | undefined;
        if (featureFlags.validateConversational && !isGeneralChat) {
          try {
            const effectiveEcosystem = intentClassification?.detectedEcosystem?.ecosystem || ecosystem;
            const effectiveChannel = intentClassification?.detectedChannel?.channel || contentChannel;

            const minimalContext = buildGenerationContext({
              ecosystem: effectiveEcosystem,
              channel: effectiveChannel,
              persona: featureFlags.persona ? userProfile?.role : undefined,
              originalInput: message,
              userMessageId,
              messageHistory: contextMessages.slice(-5),
            });

            const validationResults = await runValidationPipeline(
              conversationalFinishedContent,
              minimalContext
            );

            conversationalTrustScore = calculateTrustScore(validationResults, trustSettings);

            if (conversationalTrustScore.overall < 60) {
              console.warn(
                `[P0-FIX] Conversational content scored low (${conversationalTrustScore.overall}):`,
                conversationalTrustScore.validationResults
                  .flatMap((r: { violations: Array<{ rule: string }> }) => r.violations)
                  .slice(0, 3)
                  .map((v: { rule: string }) => v.rule)
              );
            }
          } catch (validationErr) {
            console.error('[P0-FIX] Conversational validation error:', validationErr);
          }
        } else if (isGeneralChat) {
          console.log('[Validation] Skipping trust validation for general_chat intent');
        }

        // Auto-Fix Preview for Conversational Path
        let conversationalAutoFixPreview: AutoFixPreview | undefined;

        if (conversationalTrustScore && conversationalTrustScore.autoFixableCount > 0) {
          try {
            const autoFixableViolations = conversationalTrustScore.validationResults
              .flatMap((r: { violations: Array<{ autoFixable: boolean }> }) => r.violations)
              .filter((v: { autoFixable: boolean }) => v.autoFixable);

            if (autoFixableViolations.length > 0) {
              const dynamicReplacements = convexKnowledge?.autoFixRules?.map((rule: { content: string; metadata?: { suggestion?: string } }) => ({
                from: rule.content,
                to: rule.metadata?.suggestion,
              }));

              const fixes = generateAutoFixes(autoFixableViolations, dynamicReplacements);
              const fixResult = applyAutoFixes(conversationalFinishedContent, fixes);

              if (fixResult.appliedFixes.length > 0) {
                conversationalAutoFixPreview = {
                  originalContent: conversationalFinishedContent,
                  fixedContent: fixResult.fixedContent,
                  appliedFixes: fixResult.appliedFixes,
                  isPending: false,
                };

                const fixedValidationResult = await runValidationPipeline(fixResult.fixedContent, undefined);
                conversationalTrustScore = calculateTrustScore(fixedValidationResult, trustSettings);

                console.log(`[AutoFix Conversational] Auto-applied ${fixResult.appliedFixes.length} fixes. New trust score: ${conversationalTrustScore?.overall ?? 'N/A'}`);
              }
            }
          } catch (autoFixError) {
            console.warn('[AutoFix] Failed to generate preview:', autoFixError);
          }
        }

        const finalConversationalContent = conversationalAutoFixPreview?.fixedContent ?? conversationalFinishedContent;

        // Privacy: Mask sensitive data in conversational response
        let privacyMaskedConversational = finalConversationalContent;
        try {
          if (containsSensitiveData(finalConversationalContent)) {
            const maskResult = maskSensitiveData(finalConversationalContent);
            if (maskResult.wasModified) {
              privacyMaskedConversational = maskResult.maskedText;
              console.log(`[Privacy] Conversational: Masked ${maskResult.sensitiveDataFound.length} items`);
            }
          }
        } catch (privacyError) {
          console.warn('[Privacy] Conversational masking error:', privacyError);
          privacyMaskedConversational = finalConversationalContent;
        }

        const aiMessage = {
          ...createTextMessage('assistant', privacyMaskedConversational, chatMode, userMessageId),
          messageIntent: intentClassification.intent,
          ...(conversationalTrustScore && { trustScore: conversationalTrustScore }),
          ...(conversationalAutoFixPreview && { autoFixPreview: conversationalAutoFixPreview }),
        };

        if (replaceResponseId) {
          replaceMessage(replaceResponseId, aiMessage);
        } else {
          addMessage(aiMessage);
        }

        tryAutoRenameProject(message, privacyMaskedConversational);

        // v2: Track assistant message and response time for conversational path
        if (featureFlags.responseTimeTracking || featureFlags.sessionAnalytics) {
          const responseTimer = getResponseTimer();
          const responseTimeMs = responseTimer.endTimer();

          if (featureFlags.sessionAnalytics) {
            const sessionManager = getSessionManager();
            sessionManager.trackAssistantMessage(responseTimeMs ?? undefined);
          }
        }

        // Update mid-term memory
        if (featureFlags.learning) {
          const userId = userProfile?.userId || getDeviceId();
          const deviceId = getDeviceId();

          const memoryEcosystem = intentClassification?.detectedEcosystem?.ecosystem || ecosystem;

          const updatedMemory = updateMemory(
            midTermMemory || createEmptyMemory(userId, deviceId),
            {
              intent: intentClassification.intent,
              topic: intentClassification.intent === 'jio_inquiry' ? 'jio_support' : 'general_chat',
              ecosystem: memoryEcosystem,
              channel: contentChannel,
              language: 'en',
              resolutionStatus: 'ongoing',
              turnCount: chatMessages.filter(m => m.role === 'user').length,
              wasEscalated: false,
            }
          );

          setMidTermMemory(updatedMemory);
          console.log('[Memory] Updated mid-term memory for conversational');
        }

        return {
          userMessageId,
          aiMessageId: aiMessage.id,
          success: true,
        } as SendMessageResult;
      }
    } catch (err) {
      // Cancel response timer on error
      if (featureFlags.responseTimeTracking) {
        const responseTimer = getResponseTimer();
        responseTimer.cancelTimer();
      }

      // Don't show error if request was cancelled
      if ((err as Error).name === 'AbortError' || (err as Error).message?.includes('cancelled')) {
        console.log('Chat request cancelled');
        return null;
      }

      // Wire StateManager: Handle system error
      if (featureFlags.conversationState) {
        try {
          const wrapper = getConstitutionalWrapper();
          const stateManager = wrapper.getStateManager('default');
          if (stateManager) {
            stateManager.handleSystemEvent('error');
            console.log('[StateManager] Recorded system error');
          }
        } catch (stateErr) {
          console.warn('[StateManager] Failed to handle error event:', stateErr);
        }
      }

      // v2: Track error in analytics
      const errorLogger = getErrorLogger();
      errorLogger.logLLMError(selectedLLMProvider, err as Error);

      console.error('Chat error:', err);
      setError({
        code: 'CHAT_ERROR',
        message: err instanceof Error ? err.message : 'Failed to send message',
      });
      return { userMessageId, aiMessageId: '', success: false } as SendMessageResult;
    } finally {
      setIsChatLoading(false);
      markIdempotencyKeyProcessed(idempotencyKey);
    }
    }); // End deduplicateRequest wrapper
  }, [resetChatAbort, chatMode, addMessage, replaceMessage, chatMessages, selectedLLMProvider, getChatAbortSignal, ecosystem, contentChannel, activeProject?.defaultUserProfile, trustSettings, temperature, maxTokens, streamResponse, userProfile, tryAutoRenameProject, setIsChatLoading, setError, setStreamingAIResponse, midTermMemory, setMidTermMemory, convexKnowledge, convexCorrections, convexTrainingExamples, convexDirectiveOverrides, convexTokenEnforcementRules, convexUserLearningProfile, runSemanticSearch]);

  return { sendMessage };
}
