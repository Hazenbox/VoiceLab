/**
 * useContentGeneration -- Thin React adapter for the generation pipeline
 *
 * Bridges React state (hooks, Convex queries, abort signals) to
 * the pure pipeline.run() function.
 *
 * Responsibilities:
 * - Convert React deps into PipelineInput
 * - Handle user message creation and loading state
 * - Map PipelineResult back to React state (addMessage, trustScore, etc.)
 * - Manage idempotency, deduplication, analytics, and memory updates
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
  SendMessageOptions,
  SendMessageResult,
} from '../types';
import { createTextMessage } from '../types';
import { run as pipelineRun } from '../services/pipeline';
import type { PipelineInput, PipelineFeatureFlags, PipelineExternalData } from '../services/pipeline';
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
// State manager
import { getConstitutionalWrapper } from '../services/generation/constitutionalWrapper';

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

    // ── Idempotency ─────────────────────────────────────────────────
    const idempotencyKey = generateIdempotencyKey(message.substring(0, 20));

    return deduplicateRequest(`chat-${message.substring(0, 50)}`, async () => {
      // Reset abort controller for new request
      resetChatAbort();

      // ── Create user message ───────────────────────────────────────
      let userMessageId: string;
      if (skipUserMessage && parentMessageId) {
        userMessageId = parentMessageId;
      } else {
        const userMessage = createTextMessage('user', message, chatMode);
        addMessage(userMessage);
        userMessageId = userMessage.id;

        if (featureFlags.sessionAnalytics) {
          const sessionManager = getSessionManager();
          sessionManager.trackUserMessage(false);
        }
      }

      // ── Start response timer ──────────────────────────────────────
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
        // ── Build pipeline input ──────────────────────────────────────
        const conversationHistory = chatMessages
          .filter(m => m.type === 'text')
          .slice(-20)
          .map(m => ({ role: m.role, content: m.content }));

        const pipelineFlags: PipelineFeatureFlags = {
          conversationalMode: featureFlags.conversationalMode,
          safetyGate: featureFlags.safetyGate,
          constitutionalWrapper: featureFlags.constitutionalWrapper,
          knowledgeBase: featureFlags.knowledgeBase,
          learning: featureFlags.learning,
          persona: featureFlags.persona,
          ragQueryExpansion: featureFlags.ragQueryExpansion,
          ragResultRanking: featureFlags.ragResultRanking,
          conversationState: featureFlags.conversationState,
          validateConversational: featureFlags.validateConversational,
          sessionAnalytics: featureFlags.sessionAnalytics,
          responseTimeTracking: featureFlags.responseTimeTracking,
        };

        const externalData: PipelineExternalData = {
          knowledge: convexKnowledge ? {
            avoidWords: convexKnowledge.avoidWords,
            preferredWords: convexKnowledge.preferredWords,
            autoFixRules: convexKnowledge.autoFixRules,
            approvedExamples: convexKnowledge.approvedExamples,
          } : undefined,
          corrections: convexCorrections || undefined,
          trainingExamples: convexTrainingExamples || undefined,
          directiveOverrides: convexDirectiveOverrides || undefined,
          tokenEnforcementRules: convexTokenEnforcementRules || undefined,
          userLearningProfile: convexUserLearningProfile || undefined,
          runSemanticSearch,
        };

        const pipelineInput: PipelineInput = {
          message,
          ecosystem,
          contentChannel,
          trustSettings,
          temperature,
          maxTokens,
          stream: streamResponse,
          llmProvider: selectedLLMProvider,
          userProfile: userProfile ? {
            role: userProfile.role,
            name: userProfile.name,
            userId: userProfile.userId,
            deviceId: getDeviceId(),
          } : undefined,
          conversationHistory,
          featureFlags: pipelineFlags,
          externalData,
          abortSignal: getChatAbortSignal(),
          callbacks: {
            onStreamChunk: (text: string) => setStreamingAIResponse(text),
            onStreamEnd: () => setStreamingAIResponse(''),
          },
          createLLMProvider: createLLMProvider,
        };

        // ── Run the pipeline ──────────────────────────────────────────
        const result = await pipelineRun(pipelineInput);

        // ── Handle safety blocks (early return paths) ─────────────────
        if (result.pipelinePath === 'emergency_response' || result.pipelinePath === 'safety_blocked') {
          const safetyMessage = {
            ...createTextMessage('assistant', result.output, chatMode, userMessageId),
            messageIntent: result.pipelinePath === 'emergency_response'
              ? 'safety_response' as const
              : 'safety_response' as const,
            safetyRouting: result.safetyResult?.routing,
          };
          addMessage(safetyMessage);

          // Log safety event
          const syncService = getSyncService();
          if (syncService) {
            syncService.logAnalyticsEvent({
              eventType: result.pipelinePath === 'emergency_response'
                ? 'safety_gate_emergency'
                : 'safety_gate_blocked',
              ecosystem,
              channel: contentChannel,
              persona: featureFlags.persona ? (userProfile?.role || 'unknown') : 'unknown',
              timestamp: Date.now(),
            });
          }

          return { success: true, message: `Safety: ${result.pipelinePath}` };
        }

        // ── Handle pipeline failure ───────────────────────────────────
        if (!result.success) {
          throw new Error(result.error || 'Pipeline failed');
        }

        // ── Create AI response message ────────────────────────────────
        const aiMessage = {
          ...createTextMessage('assistant', result.output, chatMode, userMessageId),
          messageIntent: (result.intent || 'content_generation') as 'content_generation' | 'general_chat' | 'jio_inquiry',
          trustScore: result.trustScore || undefined,
          generationContext: undefined,
          validationSummary: result.validationSummary || undefined,
          autoFixPreview: result.autoFixPreview || undefined,
          evidence: result.evidence || undefined,
        };

        if (replaceResponseId) {
          replaceMessage(replaceResponseId, aiMessage);
        } else {
          addMessage(aiMessage);
        }

        tryAutoRenameProject(message, result.output);

        // ── Track analytics ──────────────────────────────────────────
        let responseTimeMs: number | undefined;
        if (featureFlags.responseTimeTracking || featureFlags.sessionAnalytics) {
          const responseTimer = getResponseTimer();
          responseTimeMs = responseTimer.endTimer() ?? undefined;

          if (featureFlags.sessionAnalytics) {
            const sessionManager = getSessionManager();
            sessionManager.trackAssistantMessage(responseTimeMs);
          }
        }

        // Log generation event
        const syncService = getSyncService();
        syncService?.logAnalyticsEvent({
          eventType: 'generation',
          ecosystem: result.metadata.effectiveEcosystem,
          channel: result.metadata.effectiveChannel,
          persona: userProfile?.role || 'unknown',
          trustScore: result.trustScore?.overall,
          violationCount: result.trustScore?.totalViolations ?? 0,
          topViolations: result.trustScore?.validationResults
            ?.flatMap((r: { violations: Array<{ rule?: string }> }) => r.violations)
            .slice(0, 5)
            .map((v: { rule?: string }) => v.rule) ?? [],
          tokenCount: result.metadata.tokensUsed.totalTokens,
          llmProvider: selectedLLMProvider,
          timestamp: Date.now(),
          responseTimeMs,
          wasRegeneration: isRegeneration,
        });

        // ── Update memory ────────────────────────────────────────────
        if (featureFlags.learning) {
          const userId = userProfile?.userId || getDeviceId();
          const deviceId = getDeviceId();

          const entity = extractPrimaryEntity(message);
          updateSessionMemory({
            intent: result.intent || undefined,
            entity: entity || undefined,
            incrementTurn: true,
          });

          const updatedMemory = updateMemory(
            midTermMemory || createEmptyMemory(userId, deviceId),
            {
              intent: result.intent || 'content_generation',
              topic: result.metadata.effectiveEcosystem,
              ecosystem: result.metadata.effectiveEcosystem,
              channel: contentChannel,
              language: 'en',
              resolutionStatus: result.pipelinePath === 'content_generation' ? 'resolved' : 'ongoing',
              turnCount: chatMessages.filter(m => m.role === 'user').length,
              wasEscalated: false,
            },
          );

          setMidTermMemory(updatedMemory);
        }

        return {
          userMessageId,
          aiMessageId: aiMessage.id,
          success: true,
        } as SendMessageResult;

      } catch (err) {
        // Cancel response timer on error
        if (featureFlags.responseTimeTracking) {
          const responseTimer = getResponseTimer();
          responseTimer.cancelTimer();
        }

        // Cancelled request -- silent
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
            }
          } catch { /* ignore */ }
        }

        // Track error
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
