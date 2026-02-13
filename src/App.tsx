import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { 
  ActiveView, 
  ColorMode,
  AppError,
  ChatMode,
  // Content Trust System types
  EcosystemType,
  ContentChannelType,
  TrustSettings,
  TrustScore,
} from './types';
import { 
  VoiceGender, 
  AppState,
  createTextMessage,
  createAudioMessage,
} from './types';
import { getSystemInstruction, AUDIO_CONFIG } from './constants';
import { 
  DocumentationPanel,
  ProjectSidebar,
  ChatPanel,
  ErrorBoundary,
  ModelSelector,
  DesignSystemLibrary,
  HowItWorksPage,
  AIOrb,
  DSIcon,
  // Content Trust System components
  ContentContextSelector,
  TrustContextPanel,
  AdvancedSettingsPanel,
} from './components';
import type { TTSProviderType } from './components';
// Content Trust System services
import { buildPrompt } from './services/prompt';
import { buildGenerationContext } from './services/context';
import { runValidationPipeline, setDynamicAvoidWords } from './services/validation';
import { calculateTrustScore, generateAutoFixes, applyAutoFixes, setDynamicAutoFixRules } from './services/trust';
import { storageTrustSettings, storageProjectDefaults, DEFAULT_PROJECT_DEFAULTS } from './services/trustStorage';
import { useChatPersistence } from './hooks';
import { audioBufferManager } from './services/audioBufferManager';
// Tailwind components removed - using single Jio DS
import { 
  createTTSProvider, 
  createConversationProvider,
  type TTSProvider,
  type ConversationProvider 
} from './services/providers';
import { getOrchestratorInstance } from './services/llm/orchestrator';
import { getDefaultLLMProviderType, createLLMProvider, type LLMProviderType } from './services/providers/llm';
import { createAudioContext, checkAudioSupport } from './services/audioUtils';
import { getNoiseSuppressionService, isNoiseSuppressionSupported, type NoiseSuppressionService } from './services/audio';
import { validateConfig } from './config/providers';
import { useThemeColors } from './theme';
// Design system context removed - locked to Jio only
import { useProject } from './context/ProjectContext';
import { useAbortController } from './hooks';
// Onboarding & Sync
import OnboardingModal, { loadUserProfile, getDeviceId, type UserProfile } from './components/OnboardingModal';
import { getSyncService } from './services/sync/convexSync';
// Reliability utilities (Phase 4)
import { 
  generateIdempotencyKey, 
  markIdempotencyKeyProcessed,
  deduplicateRequest,
} from './services/reliability';
// Persona Engine (Phase 1)
import { getAutoConfig, type PersonaRole } from './services/persona';
// Feature Flags
import { featureFlags } from './services/featureFlags';
// Analytics Services (v2) - hooks now handle most session management
import { 
  getResponseTimer,
  getSessionManager,
  getErrorLogger,
} from './services/analytics';
// Session analytics hook (extracted from App.tsx for cleaner separation)
import { useSessionAnalytics } from './hooks';
// Convex (Phase 2-4: Knowledge Base & RAG)
import { useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
// Knowledge & Learning (Phase 2-3)
import {
  storeLocalCorrection,
  saveAsExample,
  getCodeDefaults,
  mergeLearnedCorrections,
  getLocalCorrections,
  retrieveKnowledge,
  enrichWithSemanticResults,
  type CorrectionEntry,
  type RetrievedKnowledge,
  type SemanticSearchResult,
} from './services/knowledge';
// Conversational Mode: Intent Classification + Base Persona
import { classifyIntent } from './services/intent';
import { buildConversationalPrompt, buildJioInquiryPrompt } from './services/prompt/basePersona';
// Safety Gate & Constitutional AI (wiring orphaned code)
import { 
  checkSafetyGate, 
  type SafetyGateResult 
} from './services/safety';
import { 
  prepareConstitutionalContext, 
  validateConstitutionalResponse,
  getConstitutionalWrapper,
  type ConstitutionalContext,
  type GenerationRequest 
} from './services/generation/constitutionalWrapper';
// RAG enhancements (wiring orphaned code)
import {
  expandQueryFull,
  rankResults,
  type ExpandedQuery,
  type RankedResult,
} from './services/rag';
// Profile Learning (wiring orphaned code)
import {
  buildProfileLearningSection,
  getPersonalizationSummary,
  type UserLearningProfile,
} from './services/learning';
import type { 
  FeedbackPayload, 
  SendMessageOptions, 
  SendMessageResult,
  PromptVersion,
} from './types';

// ── Performance Utilities ────────────────────────────────────────────────────

/**
 * Race a promise against a timeout. If the timeout wins, returns fallback value.
 * Used for graceful degradation of non-critical async operations like RAG.
 */
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

// Timeout configuration for various operations
const TIMEOUTS = {
  SEMANTIC_SEARCH_MS: 2000, // RAG timeout - HuggingFace API needs 300-2000ms (especially cold starts)
} as const;

// Storage key for chat mode persistence
const CHAT_MODE_STORAGE_KEY = 'voiceDesigner_chatMode';

interface AppProps {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

function App({ colorMode, onColorModeChange }: AppProps) {
  // Design system context
  // Design system fixed to 'jio' only
  
  // Theme colors from DS tokens
  const theme = useThemeColors();
  
  // Project context
  const { 
    activeProject, 
    updateProjectConfig, 
    updateProjectVoiceGender, 
    // New Content Trust methods
    updateProjectDefaultChannel,
    updateProjectDefaultEcosystem,
    updateProjectDefaultLanguage,
    updateProjectDefaultRegion,
  } = useProject();
  
  // ── Onboarding State ──────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => loadUserProfile());
  const [showOnboarding, setShowOnboarding] = useState(() => !getDeviceId());
  
  // Sync user profile to Convex when profile changes (always enabled)
  // NOTE: Sync service is initialized at module level in main.tsx
  useEffect(() => {
    const syncService = getSyncService();
    if (!syncService) {
      console.warn('[App] Sync service not available');
      return;
    }
    
    if (userProfile?.deviceId) {
      syncService.setDeviceId(userProfile.deviceId);
      // Sync full profile to Convex (non-blocking) -- also handles first-time onboarding
      syncService.syncUserProfile({
        deviceId: userProfile.deviceId,
        name: userProfile.name,
        role: userProfile.role,
        product: userProfile.product,
      });
      // Heartbeat on mount (non-blocking)
      syncService.heartbeat();
      
      // Log session start event (ecosystem/channel captured at mount time)
      syncService.logAnalyticsEvent({
        eventType: 'session_start',
        ecosystem: userProfile.product as string || 'connectivity',  // Use product as ecosystem proxy at mount
        channel: 'app_session',  // Generic channel for session events
        persona: featureFlags.persona ? userProfile.role : 'unknown',
        timestamp: Date.now(),
      });

      // v2: Initialize SessionManager for detailed session tracking
      if (featureFlags.sessionAnalytics) {
        const sessionManager = getSessionManager();
        const errorLogger = getErrorLogger();
        
        // Wire up the sync callback for Convex operations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sessionManager.setSyncCallback(async (action: string, data: Record<string, any>) => {
          // Route action to appropriate sync service method
          const [module, method] = action.split(':');
          if (module === 'sessions') {
            if (method === 'create') return syncService.createSession(data as Parameters<typeof syncService.createSession>[0]);
            if (method === 'updateMetrics') return syncService.updateSession(data as Parameters<typeof syncService.updateSession>[0]);
            if (method === 'end') return syncService.endSession(data.sessionId, data.exitReason);
          } else if (module === 'interactions') {
            if (method === 'log') return syncService.logInteraction(data as Parameters<typeof syncService.logInteraction>[0]);
            if (method === 'batchLog') return syncService.batchLogInteractions(data.events);
          }
        });
        
        // Also wire up error logger
        errorLogger.setSyncCallback(sessionManager.setSyncCallback.bind(sessionManager));
      }
    }
  }, [userProfile?.deviceId, userProfile?.name, userProfile?.role, userProfile?.product]);

  const handleOnboardingComplete = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    setShowOnboarding(false);

    // NOTE: Profile sync to Convex is handled by the useEffect below
    // (triggers on userProfile?.deviceId change), avoiding a race condition
    // where initSyncService() would destroy an in-flight sync call.

    // Phase 1: Auto-configure from persona engine (gated by feature flag)
    if (featureFlags.persona) {
      const autoConfig = getAutoConfig(profile.role as PersonaRole, profile.product);
      setEcosystem(autoConfig.ecosystem);
      setContentChannel(autoConfig.channel);
    }
  }, []);

  // UI State - chatMode persisted to localStorage
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    try {
      const stored = localStorage.getItem(CHAT_MODE_STORAGE_KEY);
      return (stored === 'voice' || stored === 'copy') ? stored : 'copy';
    } catch {
      return 'copy';
    }
  });
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [error, setError] = useState<AppError | null>(null);
  const [isConfigPanelCollapsed, setIsConfigPanelCollapsed] = useState(true);
  
  // ==========================================================================
  // Content Trust System State
  // ==========================================================================
  
  // Ecosystem and Channel - with migration from old project fields
  const [ecosystem, setEcosystem] = useState<EcosystemType>(() => {
    // Priority: project.defaultEcosystem > storage > default
    if (activeProject?.defaultEcosystem) return activeProject.defaultEcosystem;
    return storageProjectDefaults.get()?.ecosystem || 'connectivity';
  });
  
  const [contentChannel, setContentChannel] = useState<ContentChannelType>(() => {
    // Priority: project.defaultChannel > storage > default
    if (activeProject?.defaultChannel) return activeProject.defaultChannel;
    return storageProjectDefaults.get()?.channel || 'push_notification';
  });
  
  // Trust settings
  const [trustSettings, setTrustSettings] = useState<TrustSettings>(() => 
    storageTrustSettings.get()
  );
  
  // Trust panel state
  const [showTrustPanel, setShowTrustPanel] = useState(false);
  const [selectedMessageForTrust, setSelectedMessageForTrust] = useState<string | null>(null);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  
  // Chat generation settings
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [streamResponse, setStreamResponse] = useState(true);
  
  // Sync ecosystem/channel changes to storage
  useEffect(() => {
    try {
      const currentDefaults = storageProjectDefaults.get() || DEFAULT_PROJECT_DEFAULTS;
      storageProjectDefaults.save({ 
        ...currentDefaults, 
        ecosystem, 
        channel: contentChannel,
      });
    } catch (e) {
      console.warn('[App] Failed to save project defaults to storage:', e);
    }
  }, [ecosystem, contentChannel]);
  
  // Sync trust settings to storage
  useEffect(() => {
    try {
      storageTrustSettings.save(trustSettings);
    } catch (e) {
      console.warn('[App] Failed to save trust settings to storage:', e);
    }
  }, [trustSettings]);
  
  // Sync ecosystem/channel with active project changes
  useEffect(() => {
    if (activeProject?.defaultEcosystem) {
      setEcosystem(activeProject.defaultEcosystem);
    }
    if (activeProject?.defaultChannel) {
      setContentChannel(activeProject.defaultChannel);
    }
  }, [activeProject?.id, activeProject?.defaultEcosystem, activeProject?.defaultChannel]);
  
  // ==========================================================================
  
  // Voice feature support detection
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);

  // Conversation State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscript] = useState('');
  const [streamingAIResponse, setStreamingAIResponse] = useState('');

  // Chat Persistence - automatically syncs with localStorage
  const {
    messages: chatMessages,
    addMessage,
    setMessages,
    updateMessage,
    replaceMessage,
  } = useChatPersistence(activeProject?.id || null);

  // ========================================================================
  // Session Analytics Tracking (v2) - extracted to hook for cleaner code
  // ========================================================================
  useSessionAnalytics({
    deviceId: userProfile?.deviceId || null,
    userRole: userProfile?.role,
    userProduct: userProfile?.product,
    projectId: activeProject?.id || null,
    projectName: activeProject?.name,
    ecosystem,
    channel: contentChannel,
  });

  // Chat/Generation State
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedLLMProvider, setSelectedLLMProvider] = useState<LLMProviderType>(getDefaultLLMProviderType());
  const [selectedTTSProvider, setSelectedTTSProvider] = useState<TTSProviderType>('dashscope');
  const [selectedTalkLLMProvider, setSelectedTalkLLMProvider] = useState<LLMProviderType>('qwen-text');
  
  // Filter messages by current mode
  const filteredMessages = useMemo(() => {
    return chatMessages.filter(m => m.sourceMode === chatMode || !m.sourceMode);
  }, [chatMessages, chatMode]);

  // Request cancellation - use getSignal() to get fresh signal after reset
  const { reset: resetChatAbort, getSignal: getChatAbortSignal } = useAbortController();

  // Refs for audio handling
  const ttsProviderRef = useRef<TTSProvider | null>(null);
  const conversationProviderRef = useRef<ConversationProvider | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioAnalyzerRef = useRef<AnalyserNode | null>(null);
  const noiseSuppressionRef = useRef<NoiseSuppressionService | null>(null);
  
  // Refs for conversation turn tracking (to link user message to AI response)
  const currentTurnRef = useRef<{
    userMessageId: string | null;
    responseText: string;
  }>({ userMessageId: null, responseText: '' });

  // ========================================================================
  // Convex Knowledge Base & Learning Integration (Phase 2-4)
  // ========================================================================
  
  // Fetch knowledge from Convex for prompt injection (gated by knowledgeBase flag)
  // Returns avoid words, preferred words, auto-fix rules, and approved examples
  const convexKnowledge = useQuery(
    featureFlags.knowledgeBase ? api.knowledge.getKnowledgeForPrompt : undefined,
    featureFlags.knowledgeBase ? { ecosystem, channel: contentChannel } : 'skip'
  );
  
  // Fetch learning corrections from Convex (gated by learning flag)
  // Returns user edits and thumbs-down feedback for prompt injection
  const convexCorrections = useQuery(
    featureFlags.learning ? api.corrections.getLearningCorrections : undefined,
    featureFlags.learning ? { ecosystem, channel: contentChannel, limit: 20 } : 'skip'
  );
  
  // Fetch user learning profile from Convex (gated by learning flag)
  // Returns aggregated preferences, avoid patterns, and style preferences
  const convexUserLearningProfile = useQuery(
    featureFlags.learning && userProfile?.deviceId ? api.userProfiles.getProfileByDeviceId : undefined,
    featureFlags.learning && userProfile?.deviceId ? { deviceId: userProfile.deviceId } : 'skip'
  );
  
  // Fetch high-quality training examples for few-shot prompting (wiring orphaned code)
  // Returns verified examples with high quality scores
  const convexTrainingExamples = useQuery(
    featureFlags.learning ? api.seedTrainingExamples.getHighQuality : undefined,
    featureFlags.learning ? { minScore: 4, limit: 5 } : 'skip'
  );
  
  // Semantic search action for RAG (called on-demand during message generation)
  const runSemanticSearch = useAction(api.embeddings.semanticSearch);

  // Inject CSS variables for local tokens
  useEffect(() => {
    document.documentElement.style.setProperty('--local-white', theme.local.white);
  }, [theme.local.white]);

  // Feature detection for voice support
  useEffect(() => {
    const support = checkAudioSupport();
    setVoiceSupported(support.supported);
    if (!support.supported) {
      console.warn('[App] Voice not supported:', support.message);
    }
  }, []);

  // Persist chatMode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_MODE_STORAGE_KEY, chatMode);
    } catch {
      // Ignore storage errors (e.g., private browsing)
    }
  }, [chatMode]);

  // Inject Convex avoid words into validation agent
  // This enables admin-added avoid words to be used during validation
  useEffect(() => {
    if (convexKnowledge?.avoidWords && featureFlags.knowledgeBase) {
      // Convert Convex avoid words to format expected by validation agent
      const dynamicWords = convexKnowledge.avoidWords.map(item => ({
        content: item.content,
        category: item.category || 'dynamic',
        severity: item.metadata?.severity || 'warning',
      }));
      setDynamicAvoidWords(dynamicWords);
    }
  }, [convexKnowledge?.avoidWords]);

  // Inject Convex auto-fix rules into auto-fix engine
  // This enables admin-added replacements to be used during auto-fix
  useEffect(() => {
    if (convexKnowledge?.autoFixRules && featureFlags.knowledgeBase) {
      setDynamicAutoFixRules(convexKnowledge.autoFixRules);
    }
  }, [convexKnowledge?.autoFixRules]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ttsProviderRef.current) {
        ttsProviderRef.current.disconnect();
      }
      if (conversationProviderRef.current) {
        conversationProviderRef.current.disconnect();
      }
      if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle sending chat message via LLM Orchestrator
  // Extended with options for edit/regeneration flows
  // Conversational Mode: branches into general chat vs content generation
  const handleSendChatMessage = useCallback(async (
    message: string,
    options: SendMessageOptions = {} // Backward compatible default
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
        : null; // null = legacy mode, always content_generation pipeline

      // =====================================================================
      // Safety Gate: Pre-generation safety check (wiring orphaned code)
      // Checks for critical safety concerns BEFORE calling LLM
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
          
          // Create AI response with emergency message
          const emergencyMessage = {
            ...createTextMessage('assistant', safetyGateResult.emergencyResponse.message, chatMode, userMessageId),
            messageIntent: 'safety_response' as const,
            safetyRouting: safetyGateResult.routing,
          };
          
          addMessage(emergencyMessage);
          
          // Log safety event
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
        // Uses auto-detected channel/ecosystem when available
        // =================================================================
        const effectiveEcosystem = intentClassification?.detectedEcosystem?.ecosystem || ecosystem;
        const effectiveChannel = intentClassification?.detectedChannel?.channel || contentChannel;

        const generationContext = buildGenerationContext({
          ecosystem: effectiveEcosystem,
          channel: effectiveChannel,
          userMessage: message,
          userProfile: activeProject?.defaultUserProfile,
          persona: featureFlags.persona ? userProfile?.role : undefined,
        });

        // Build knowledge + learning data for prompt injection (Phase 2-4, gated)
        // Priority: Convex data > Code defaults, with optional RAG enrichment
        let promptKnowledge: RetrievedKnowledge | undefined;
        
        if (featureFlags.knowledgeBase) {
          // Use Convex data if available, otherwise fall back to code defaults
          if (convexKnowledge) {
            promptKnowledge = retrieveKnowledge(
              {
                avoidWords: convexKnowledge.avoidWords,
                preferredWords: convexKnowledge.preferredWords,
                autoFixRules: convexKnowledge.autoFixRules,
                approvedExamples: convexKnowledge.approvedExamples,
              },
              effectiveEcosystem,
              effectiveChannel
            );
          } else {
            promptKnowledge = getCodeDefaults(effectiveEcosystem, effectiveChannel);
          }
          
          // Merge local corrections for immediate learning (Phase 3)
          if (featureFlags.learning) {
            const localCorrections = getLocalCorrections(effectiveEcosystem, effectiveChannel);
            promptKnowledge = mergeLearnedCorrections(
              promptKnowledge,
              localCorrections,
              effectiveEcosystem,
              effectiveChannel,
            );
            
            // Also merge Convex corrections if available (cloud-synced learning)
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
          // RAG: Enrich with semantically relevant knowledge (wiring orphaned code)
          // Now includes: Query Expansion + Parallel Type-Specific Searches + Result Ranking
          // Priority types: avoid_word, preferred_word, auto_fix (for pre-generation injection)
          // =====================================================================
          try {
            // Step 1: Query Expansion (wiring orphaned queryExpander)
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
            
            // Step 2: Parallel Semantic Searches for Priority Types
            // Search for avoid_word, preferred_word, auto_fix separately to ensure coverage
            const searchPromises = [
              // General search (all types)
              runSemanticSearch({
                query: searchQuery,
                limit: 20,
                filterActiveOnly: true,
              }) as Promise<SemanticSearchResult[]>,
              // Priority: avoid_word - words to avoid during generation
              runSemanticSearch({
                query: searchQuery,
                limit: 30, // Higher limit for avoid words
                filterType: 'avoid_word',
                filterActiveOnly: true,
              }) as Promise<SemanticSearchResult[]>,
              // Priority: preferred_word - words to use during generation
              runSemanticSearch({
                query: searchQuery,
                limit: 20,
                filterType: 'preferred_word',
                filterActiveOnly: true,
              }) as Promise<SemanticSearchResult[]>,
              // Priority: auto_fix - replacement rules for avoid words
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
              // Merge and deduplicate results
              const [generalResults, avoidResults, preferredResults, autoFixResults] = searchResultsArray;
              const seenIds = new Set<string>();
              const mergedResults: SemanticSearchResult[] = [];
              
              // Add results in priority order (avoid_word and auto_fix first for pre-generation)
              for (const result of [...avoidResults, ...autoFixResults, ...preferredResults, ...generalResults]) {
                if (!seenIds.has(result._id)) {
                  seenIds.add(result._id);
                  mergedResults.push(result);
                }
              }
              
              console.log(`[RAG] Merged results: ${avoidResults.length} avoid, ${preferredResults.length} preferred, ${autoFixResults.length} auto_fix, ${generalResults.length} general → ${mergedResults.length} unique`);
              
              if (mergedResults.length > 0) {
                // Step 3: Result Ranking (wiring orphaned resultRanker)
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
                    50 // Keep more results after ranking for comprehensive injection
                  );
                  
                  // Convert back to SemanticSearchResult (rankResults adds extra fields)
                  finalResults = rankedResults;
                  console.log(`[RAG] Ranked ${mergedResults.length} results → top ${finalResults.length}`);
                  
                  // Log top result for debugging
                  if (rankedResults.length > 0) {
                    const top = rankedResults[0];
                    console.log(`[RAG] Top result: "${top.content.substring(0, 50)}..." (score: ${top.rankScore.toFixed(3)}, type: ${top.type})`);
                  }
                }
                
                promptKnowledge = enrichWithSemanticResults(
                  promptKnowledge,
                  finalResults,
                  0.3 // minimum similarity score threshold
                );
                console.log(`[RAG] Enriched prompt with ${finalResults.length} semantic results`);
              }
            }
          } catch (ragError) {
            // Graceful degradation - continue without RAG if it fails
            console.error('[RAG] Semantic search failed, continuing without RAG enrichment:', ragError);
          }
        }

        // =====================================================================
        // Constitutional AI: Prepare context (wiring orphaned code)
        // This integrates token classification, directives, and state machine
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
            };
            
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
          } catch (constitutionalError) {
            // Graceful degradation - continue without constitutional context
            console.warn('[Constitutional] Context preparation failed, continuing without:', constitutionalError);
          }
        }

        // Build comprehensive prompt using Content Trust System + Knowledge
        const { system: systemPrompt, context: finalContext } = buildPrompt(
          generationContext,
          message,
          promptKnowledge ? { knowledge: promptKnowledge } : {}
        );
        
        // =====================================================================
        // Profile Learning: Add personalization section (wiring orphaned code)
        // Injects user's correction history and style preferences into prompt
        // =====================================================================
        let profileLearningSection = '';
        if (featureFlags.learning) {
          // Convert Convex profile to UserLearningProfile format (may be undefined)
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
          
          // Convert Convex corrections to CorrectionEntry format
          const correctionEntries: CorrectionEntry[] = (convexCorrections ?? [])
            .filter(c => c.editedContent || c.comment)
            .map(c => ({
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
        
        // Combine system prompt with constitutional injection and profile learning
        let enhancedSystemPrompt = systemPrompt;
        
        if (constitutionalSystemInjection) {
          enhancedSystemPrompt = `${constitutionalSystemInjection}\n\n---\n\n${enhancedSystemPrompt}`;
        }
        
        if (profileLearningSection) {
          enhancedSystemPrompt = `${enhancedSystemPrompt}\n\n---\n\n${profileLearningSection}`;
        }
        
        // =====================================================================
        // Training Examples: Add few-shot examples (wiring orphaned code)
        // Injects high-quality verified examples for few-shot prompting
        // =====================================================================
        if (featureFlags.learning && convexTrainingExamples && convexTrainingExamples.length > 0) {
          const examplesSection = [
            '# high-quality examples',
            'use these verified examples as a reference for style and format:',
            '',
            ...convexTrainingExamples.map((ex, i) => {
              const lines = [
                `## example ${i + 1}`,
                `input: "${ex.input}"`,
                `output: "${ex.content}"`,
              ];
              if (ex.context) lines.push(`context: ${ex.context}`);
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
        const result = await orchestrator.generate(
          selectedLLMProvider,
          {
            messages,
            maxTokens: maxTokens,
            temperature: temperature,
            stream: streamResponse,
            signal: getChatAbortSignal(),
          },
          createLLMProvider,
          ['intent:content_generation']
        );

        // Content Trust System: Validate and Score Content
        let trustScore: TrustScore | undefined;
        let validationSummary: { passedCount: number; warningCount: number; errorCount: number; autoFixesApplied: number } | undefined;

        try {
          const validationResult = await runValidationPipeline(result.content, finalContext);
          trustScore = calculateTrustScore(validationResult, trustSettings);
          
          validationSummary = {
            passedCount: validationResult.agentResults.filter(r => r.passed).length,
            warningCount: validationResult.agentResults
              .flatMap(r => r.violations)
              .filter(v => v.severity === 'warning').length,
            errorCount: validationResult.agentResults
              .flatMap(r => r.violations)
              .filter(v => v.severity === 'error').length,
            autoFixesApplied: 0,
          };
        } catch (validationError) {
          console.warn('Content validation failed:', validationError);
        }
        
        // =====================================================================
        // Constitutional AI: Validate response (wiring orphaned code)
        // Checks for forbidden phrases, emotion appropriateness, safety compliance
        // =====================================================================
        if (featureFlags.constitutionalWrapper && constitutionalContext) {
          try {
            const constitutionalValidation = validateConstitutionalResponse(
              result.content,
              constitutionalContext
            );
            
            // Log constitutional validation results
            if (!constitutionalValidation.passed) {
              console.warn(
                '[Constitutional] Response validation issues:',
                constitutionalValidation.checks.filter(c => !c.passed).map(c => c.message)
              );
              
              // Add suggestions to validation summary if applicable
              if (constitutionalValidation.suggestions.length > 0) {
                console.info('[Constitutional] Suggestions:', constitutionalValidation.suggestions);
              }
            } else {
              console.log('[Constitutional] Response passed validation');
            }
            
            // Note: We don't block/regenerate here - just log for monitoring
            // In future, could trigger auto-regeneration if shouldRegenerate is true
          } catch (constitutionalValidationError) {
            console.warn('[Constitutional] Response validation failed:', constitutionalValidationError);
          }
        }

        // =================================================================
        // Auto-Fix Preview: Generate side-by-side preview if fixes available
        // =================================================================
        let autoFixPreview: import('./types').AutoFixPreview | undefined;
        
        console.log('[AutoFix] Checking for auto-fixable violations:', {
          hasTrustScore: !!trustScore,
          autoFixableCount: trustScore?.autoFixableCount ?? 'N/A',
        });
        
        if (trustScore && trustScore.autoFixableCount > 0) {
          try {
            // Gather all auto-fixable violations
            const autoFixableViolations = trustScore.validationResults
              .flatMap(r => r.violations)
              .filter(v => v.autoFixable);
            
            console.log('[AutoFix] Auto-fixable violations found:', autoFixableViolations.map(v => ({
              term: v.term,
              type: v.type,
              suggestion: v.suggestion,
            })));
            
            if (autoFixableViolations.length > 0) {
              // Extract Convex dynamic rules (admin-managed auto-fix rules)
              // These are merged with static vocabulary rules in generateAutoFixes
              // Note: Convex knowledgeItems have content/metadata.suggestion, not from/to
              const dynamicReplacements = convexKnowledge?.autoFixRules?.map(rule => ({
                from: rule.content,
                to: rule.metadata?.suggestion,
              }));
              
              console.log('[AutoFix] Dynamic replacements from Convex:', dynamicReplacements?.length ?? 0);
              
              // Generate and apply fixes to create preview
              // Pass Convex rules so admin-managed rules also work for auto-fix
              const fixes = generateAutoFixes(autoFixableViolations, dynamicReplacements);
              console.log('[AutoFix] Generated fixes:', fixes);
              
              const fixResult = applyAutoFixes(result.content, fixes);
              console.log('[AutoFix] Applied fixes:', {
                totalGenerated: fixes.length,
                appliedCount: fixResult.appliedFixes.length,
                originalLength: result.content.length,
                fixedLength: fixResult.fixedContent.length,
              });
              
              // Only show preview if fixes were actually applied
              if (fixResult.appliedFixes.length > 0) {
                // Auto-accept all fixes - no manual intervention needed
                autoFixPreview = {
                  originalContent: result.content,
                  fixedContent: fixResult.fixedContent,
                  appliedFixes: fixResult.appliedFixes,
                  isPending: false,  // Auto-accepted, not pending
                };
                
                // Recalculate trust score on fixed content so badge shows 100%
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

        // Determine which content to use - fixed content if auto-fix was applied
        const finalContent = autoFixPreview?.fixedContent ?? result.content;

        // Create AI response with trust data, intent tag, and auto-fix preview
        const aiMessage = {
          ...createTextMessage('assistant', finalContent, chatMode, userMessageId),
          messageIntent: 'content_generation' as const,
          trustScore,
          generationContext: finalContext,
          validationSummary,
          autoFixPreview,
        };
        
        if (replaceResponseId) {
          replaceMessage(replaceResponseId, aiMessage);
        } else {
          addMessage(aiMessage);
        }
        
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
        
        // Log analytics event for content generation (always enabled)
        const syncService = getSyncService();
        const allViolations = trustScore?.validationResults.flatMap(r => r.violations) ?? [];
        syncService?.logAnalyticsEvent({
          eventType: 'generation',
          ecosystem: finalContext.ecosystem,
          channel: finalContext.channel,
          persona: finalContext.persona || 'unknown',
          trustScore: trustScore?.overall,
          violationCount: trustScore?.totalViolations ?? 0,
          topViolations: allViolations.slice(0, 5).map(v => v.rule) ?? [],
          tokenCount: result.usage?.totalTokens,
          llmProvider: selectedLLMProvider,
          timestamp: Date.now(),
          // v2: Add response time and regeneration flag
          responseTimeMs,
          wasRegeneration: isRegeneration,
        });
        
        return {
          userMessageId,
          aiMessageId: aiMessage.id,
          success: true,
        } as SendMessageResult;

      } else {
        // =================================================================
        // CONVERSATIONAL PATH (General Chat / Jio Inquiry)
        // Lightweight prompt, with optional validation (P0-FIX)
        // =================================================================
        const systemPrompt = intentClassification.intent === 'jio_inquiry'
          ? buildJioInquiryPrompt()
          : buildConversationalPrompt();

        // Build messages with lightweight system prompt and history
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

        // Use the orchestrator for generation (same retry/fallback)
        const orchestrator = getOrchestratorInstance();
        const result = await orchestrator.generate(
          selectedLLMProvider,
          {
            messages,
            maxTokens: maxTokens,
            temperature: temperature,
            stream: streamResponse,
            signal: getChatAbortSignal(),
          },
          createLLMProvider,
          [`intent:${intentClassification.intent}`]
        );

        // P0-FIX: Run lightweight validation on conversational content
        // This catches safety issues that could slip through in chat mode
        let conversationalTrustScore: TrustScore | undefined;
        if (featureFlags.validateConversational) {
          try {
            // Use detected ecosystem/channel if available, otherwise fall back to UI selection
            const effectiveEcosystem = intentClassification?.detectedEcosystem?.ecosystem || ecosystem;
            const effectiveChannel = intentClassification?.detectedChannel?.channel || contentChannel;
            
            // Build minimal context for validation (no full generation context)
            const minimalContext = buildGenerationContext({
              ecosystem: effectiveEcosystem,
              channel: effectiveChannel,
              persona: featureFlags.persona ? userProfile?.role : undefined,
              originalInput: message,
              userMessageId,
              messageHistory: contextMessages.slice(-5),
            });

            // Run validation pipeline
            const validationResults = await runValidationPipeline(
              result.content,
              minimalContext
            );

            // Calculate trust score with proper trustSettings (not minimalContext)
            conversationalTrustScore = calculateTrustScore(validationResults, trustSettings);

            // Log if score is concerning (but don't block - conversational is lower risk)
            if (conversationalTrustScore.overall < 60) {
              console.warn(
                `[P0-FIX] Conversational content scored low (${conversationalTrustScore.overall}):`,
                conversationalTrustScore.validationResults
                  .flatMap(r => r.violations)
                  .slice(0, 3)
                  .map(v => v.rule)
              );
            }
          } catch (validationErr) {
            // Don't fail the response if validation fails - log and continue
            console.error('[P0-FIX] Conversational validation error:', validationErr);
          }
        }

        // =================================================================
        // Auto-Fix Preview for Conversational Path
        // Generate side-by-side preview if auto-fixable violations exist
        // =================================================================
        let conversationalAutoFixPreview: import('./types').AutoFixPreview | undefined;
        
        if (conversationalTrustScore && conversationalTrustScore.autoFixableCount > 0) {
          try {
            // Gather all auto-fixable violations
            const autoFixableViolations = conversationalTrustScore.validationResults
              .flatMap(r => r.violations)
              .filter(v => v.autoFixable);
            
            if (autoFixableViolations.length > 0) {
              // Extract Convex dynamic rules (admin-managed auto-fix rules)
              const dynamicReplacements = convexKnowledge?.autoFixRules?.map(rule => ({
                from: rule.content,
                to: rule.metadata?.suggestion,
              }));
              
              // Generate and apply fixes to create preview
              const fixes = generateAutoFixes(autoFixableViolations, dynamicReplacements);
              const fixResult = applyAutoFixes(result.content, fixes);
              
              // Only show preview if fixes were actually applied
              if (fixResult.appliedFixes.length > 0) {
                // Auto-accept all fixes - no manual intervention needed
                conversationalAutoFixPreview = {
                  originalContent: result.content,
                  fixedContent: fixResult.fixedContent,
                  appliedFixes: fixResult.appliedFixes,
                  isPending: false,  // Auto-accepted, not pending
                };
                
                // Recalculate trust score on fixed content so badge shows 100%
                const fixedValidationResult = await runValidationPipeline(fixResult.fixedContent, undefined);
                conversationalTrustScore = calculateTrustScore(fixedValidationResult, trustSettings);
                
                console.log(`[AutoFix Conversational] Auto-applied ${fixResult.appliedFixes.length} fixes. New trust score: ${conversationalTrustScore?.overall ?? 'N/A'}`);
              }
            }
          } catch (autoFixError) {
            console.warn('[AutoFix] Failed to generate preview:', autoFixError);
          }
        }

        // Determine which content to use - fixed content if auto-fix was applied
        const finalConversationalContent = conversationalAutoFixPreview?.fixedContent ?? result.content;

        // Create AI response -- now WITH optional trustScore and autoFixPreview
        const aiMessage = {
          ...createTextMessage('assistant', finalConversationalContent, chatMode, userMessageId),
          messageIntent: intentClassification.intent,
          ...(conversationalTrustScore && { trustScore: conversationalTrustScore }),
          ...(conversationalAutoFixPreview && { autoFixPreview: conversationalAutoFixPreview }),
        };
        
        if (replaceResponseId) {
          replaceMessage(replaceResponseId, aiMessage);
        } else {
          addMessage(aiMessage);
        }
        
        // v2: Track assistant message and response time for conversational path
        if (featureFlags.responseTimeTracking || featureFlags.sessionAnalytics) {
          const responseTimer = getResponseTimer();
          const responseTimeMs = responseTimer.endTimer();
          
          if (featureFlags.sessionAnalytics) {
            const sessionManager = getSessionManager();
            sessionManager.trackAssistantMessage(responseTimeMs ?? undefined);
          }
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
      
      // Wire StateManager: Handle system error (wiring orphaned code)
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
      // Mark idempotency key as processed (even on error, to prevent retry storms)
      markIdempotencyKeyProcessed(idempotencyKey);
    }
    }); // End deduplicateRequest wrapper
  }, [resetChatAbort, chatMode, addMessage, replaceMessage, chatMessages, selectedLLMProvider, getChatAbortSignal, ecosystem, contentChannel, activeProject?.defaultUserProfile, trustSettings, temperature, maxTokens, streamResponse, userProfile]);

  // ========================================================================
  // Phase 3: Feedback & Learning Handlers
  // ========================================================================

  const handleMessageFeedback = useCallback((payload: FeedbackPayload) => {
    // Look up the original message to get its generation-time context
    const originalMessage = chatMessages.find(m => m.id === payload.messageId);
    
    // Conversational Mode: Skip learning for non-content-generation messages
    // General chat and Jio inquiry feedback should not pollute the content learning engine
    if (featureFlags.conversationalMode && originalMessage?.messageIntent && originalMessage.messageIntent !== 'content_generation') {
      console.log(`[Feedback] Skipping learning for ${originalMessage.messageIntent} message (not content generation)`);
      return;
    }
    
    // Use generation-time context if available, fall back to current UI state
    const feedbackEcosystem = originalMessage?.generationContext?.ecosystem || ecosystem;
    const feedbackChannel = originalMessage?.generationContext?.channel || contentChannel;

    // Store locally for immediate learning (gated by learning flag)
    if (featureFlags.learning) {
      const correction: CorrectionEntry = {
        originalContent: payload.originalContent,
        editedContent: payload.editedContent,
        feedbackType: payload.feedbackType as CorrectionEntry['feedbackType'],
        comment: payload.comment,
        reasons: payload.reasons,
        ecosystem: feedbackEcosystem,
        channel: feedbackChannel,
        persona: userProfile?.role || '',
        timestamp: Date.now(),
      };
      storeLocalCorrection(correction);
    }

    // Sync to Convex via the sync service (always enabled)
    const syncService = getSyncService();
    if (syncService) {
      syncService.logCorrection({
        messageContent: payload.originalContent,
        originalContent: payload.originalContent,
        editedContent: payload.editedContent,
        feedbackType: payload.feedbackType,
        comment: payload.comment,
        reasons: payload.reasons,
        ecosystem: feedbackEcosystem,
        channel: feedbackChannel,
        persona: userProfile?.role || '',
      });
    }
  }, [chatMessages, ecosystem, contentChannel, userProfile]);

  const handleSaveAsExample = useCallback((content: string) => {
    saveAsExample({
      content,
      ecosystem,
      channel: contentChannel,
      persona: userProfile?.role,
    });
  }, [ecosystem, contentChannel, userProfile]);

  // ========================================================================
  // ChatGPT-Style Edit Flow State & Handlers
  // ========================================================================
  
  // Edit flow state - controlled at App level for ChatPanel
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  // Ref to track which button triggered edit for focus restoration
  const editTriggerRef = useRef<string | null>(null);
  
  // ========================================================================
  // Dislike Feedback Modal State
  // ========================================================================
  
  // Message ID for which dislike modal is open (null = modal closed)
  const [dislikeModalMessageId, setDislikeModalMessageId] = useState<string | null>(null);
  
  // Start editing a user message
  const handleStartEdit = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditValue(content);
    editTriggerRef.current = messageId; // Track for focus restoration
  }, []);
  
  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditValue('');
    // Focus restoration handled by ChatPanel
  }, []);
  
  // Submit edit - creates new version and regenerates AI response
  const handleSubmitEdit = useCallback(async (messageId: string, newContent: string) => {
    // Find original message
    const originalMessage = chatMessages.find(m => m.id === messageId);
    if (!originalMessage) return;
    
    // Find the current AI response (the one we'll replace)
    const aiResponseIndex = chatMessages.findIndex(
      m => m.parentMessageId === messageId && m.role === 'assistant'
    );
    const currentAiResponse = aiResponseIndex >= 0 ? chatMessages[aiResponseIndex] : null;
    
    // Clear edit state first
    setEditingMessageId(null);
    setEditValue('');
    
    // Generate new response with edited content
    const result = await handleSendChatMessage(newContent, {
      parentMessageId: messageId,
      replaceResponseId: currentAiResponse?.id,
      skipUserMessage: true,
    });
    
    if (result?.success) {
      // Update user message with new version history (atomic update)
      updateMessage(messageId, (msg) => {
        const existingVersions = msg.promptVersions || [{
          content: msg.content,
          timestamp: msg.timestamp,
          responseId: currentAiResponse?.id || '',
        }];
        
        const newVersion: PromptVersion = {
          content: newContent,
          timestamp: Date.now(),
          responseId: result.aiMessageId,
        };
        
        return {
          ...msg,
          content: newContent, // Update base content to latest
          promptVersions: [...existingVersions, newVersion],
          displayVersion: existingVersions.length + 1, // Show new version
        };
      });
    }
  }, [chatMessages, handleSendChatMessage, updateMessage]);
  
  // Handle version navigation
  const handleVersionChange = useCallback((messageId: string, newVersion: number) => {
    updateMessage(messageId, (msg) => ({
      ...msg,
      displayVersion: newVersion,
    }));
  }, [updateMessage]);
  
  // ========================================================================
  // Like/Dislike/Try Again Handlers
  // ========================================================================
  
  // Handle "like" feedback
  const handleLike = useCallback((messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (!message || message.userFeedback) return; // Already gave feedback
    
    // Persist feedback in message
    updateMessage(messageId, (msg) => ({
      ...msg,
      userFeedback: 'like' as const,
    }));
    
    // Wire StateManager: Record positive satisfaction (wiring orphaned code)
    if (featureFlags.conversationState) {
      try {
        const wrapper = getConstitutionalWrapper();
        const stateManager = wrapper.getStateManager('default');
        if (stateManager) {
          stateManager.recordSatisfaction('positive');
          console.log('[StateManager] Recorded positive satisfaction');
        }
      } catch (err) {
        console.warn('[StateManager] Failed to record satisfaction:', err);
      }
    }
    
    // Log to learning system (reuse existing feedback handler)
    handleMessageFeedback({
      messageId,
      feedbackType: 'thumbs_up',
      originalContent: message.content,
    });
  }, [chatMessages, updateMessage, handleMessageFeedback]);
  
  // Handle "dislike" feedback - opens modal for detailed feedback
  const handleDislike = useCallback((messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (!message || message.userFeedback) return; // Already gave feedback
    
    // Persist visual feedback immediately (for instant UI update)
    updateMessage(messageId, (msg) => ({
      ...msg,
      userFeedback: 'dislike' as const,
    }));
    
    // Open modal to collect detailed feedback
    // (actual feedback storage deferred to modal submit/close)
    setDislikeModalMessageId(messageId);
  }, [chatMessages, updateMessage]);
  
  // Handle dislike modal submit (with reasons + optional comment)
  const handleDislikeModalSubmit = useCallback((reasons: string[], comment: string) => {
    if (!dislikeModalMessageId) return;
    
    const message = chatMessages.find(m => m.id === dislikeModalMessageId);
    if (!message) return;
    
    // Wire StateManager: Record negative satisfaction (wiring orphaned code)
    if (featureFlags.conversationState) {
      try {
        const wrapper = getConstitutionalWrapper();
        const stateManager = wrapper.getStateManager('default');
        if (stateManager) {
          stateManager.recordSatisfaction('negative');
          console.log('[StateManager] Recorded negative satisfaction');
        }
      } catch (err) {
        console.warn('[StateManager] Failed to record satisfaction:', err);
      }
    }
    
    // Store feedback with structured reasons
    handleMessageFeedback({
      messageId: dislikeModalMessageId,
      feedbackType: 'thumbs_down',
      originalContent: message.content,
      reasons,
      comment,
    });
    
    // Close modal
    setDislikeModalMessageId(null);
  }, [dislikeModalMessageId, chatMessages, handleMessageFeedback]);
  
  // Handle dislike modal close (without detailed feedback)
  const handleDislikeModalClose = useCallback(() => {
    if (!dislikeModalMessageId) return;
    
    const message = chatMessages.find(m => m.id === dislikeModalMessageId);
    if (!message) return;
    
    // Store bare thumbs_down without reasons
    handleMessageFeedback({
      messageId: dislikeModalMessageId,
      feedbackType: 'thumbs_down',
      originalContent: message.content,
    });
    
    // Close modal
    setDislikeModalMessageId(null);
  }, [dislikeModalMessageId, chatMessages, handleMessageFeedback]);
  
  // Handle "try again" - regenerate AI response
  const handleTryAgain = useCallback(async (messageId: string) => {
    // Find the AI message and its parent user message
    const aiMessage = chatMessages.find(m => m.id === messageId);
    if (!aiMessage || aiMessage.role !== 'assistant') return;
    
    const userMessage = chatMessages.find(m => m.id === aiMessage.parentMessageId);
    if (!userMessage) return;
    
    // Regenerate with same user message, replacing AI response
    await handleSendChatMessage(userMessage.content, {
      parentMessageId: userMessage.id,
      replaceResponseId: messageId,
      skipUserMessage: true,
    });
  }, [chatMessages, handleSendChatMessage]);

  // Auto-dismiss error
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Get TTS provider
  // const getTTSProvider = useCallback((): TTSProvider => {
  //   if (!ttsProviderRef.current) {
  //     ttsProviderRef.current = createTTSProvider();
  //   }
  //   return ttsProviderRef.current;
  // }, []);

  // Handle TTS generation (disabled)
  // const handleGenerateTTS = async () => {
  //   if (!ttsText.trim()) {
  //     setError({ code: 'NO_TEXT', message: 'Please enter some text to generate' });
  //     return;
  //   }

  //   if (!activeProject) {
  //     setError({ code: 'NO_PROJECT', message: 'No active project' });
  //     return;
  //   }

  //   // Validate config
  //   const configValidation = validateConfig();
  //   if (!configValidation.valid) {
  //     setError({ 
  //       code: 'CONFIG_ERROR', 
  //       message: configValidation.errors.join('. ')
  //     });
  //     return;
  //   }

  //   setIsTtsLoading(true);
  //   setError(null);

  //   try {
  //     const provider = getTTSProvider();
  //     const voice = provider.getDefaultVoice(activeProject.voiceGender === VoiceGender.FEMALE ? 'female' : 'male');
      
  //     const audioBuffer = await provider.synthesize(ttsText, {
  //       voice,
  //       format: 'mp3',
  //       sampleRate: AUDIO_CONFIG.alibabaOutputSampleRate,
  //     });

  //     setGeneratedAudio(audioBuffer);
  //     setLastGeneratedVoice(voice);
  //   } catch (err) {
  //     console.error('TTS generation error:', err);
  //     setError({
  //       code: 'TTS_ERROR',
  //       message: err instanceof Error ? err.message : 'Failed to generate audio',
  //     });
  //   } finally {
  //     setIsTtsLoading(false);
  //   }
  // };


  // Handle trust badge click - opens trust context panel
  const handleTrustBadgeClick = useCallback((messageId: string) => {
    setSelectedMessageForTrust(messageId);
    setShowTrustPanel(true);
  }, []);

  // Handle auto-fix for a message
  const handleAutoFix = useCallback(async () => {
    // Find the currently selected message
    const message = selectedMessageForTrust 
      ? chatMessages.find(m => m.id === selectedMessageForTrust)
      : null;
    
    if (!message?.trustScore || isAutoFixing) return;
    
    setIsAutoFixing(true);
    try {
      // Gather all violations across all agent results
      const violations = message.trustScore.validationResults
        .flatMap(r => r.violations)
        .filter(v => v.autoFixable);
      
      if (violations.length === 0) {
        console.log('[AutoFix] No auto-fixable violations found');
        return;
      }
      
      // Extract Convex dynamic rules (admin-managed auto-fix rules)
      // Note: Convex knowledgeItems have content/metadata.suggestion, not from/to
      const dynamicReplacements = convexKnowledge?.autoFixRules?.map(rule => ({
        from: rule.content,
        to: rule.metadata?.suggestion,
      }));
      
      // Generate fixes using the auto-fix engine (with Convex rules)
      const fixes = generateAutoFixes(violations, dynamicReplacements);
      
      // Apply fixes to the content
      const result = applyAutoFixes(message.content, fixes);
      
      if (result.appliedFixes.length === 0) {
        console.log('[AutoFix] No fixes were applied');
        return;
      }
      
      // Re-validate the fixed content
      const newValidation = await runValidationPipeline(
        result.fixedContent, 
        message.generationContext
      );
      const newTrustScore = calculateTrustScore(newValidation, trustSettings);
      
      // Update the message using setMessages functional updater
      setMessages(prev => prev.map(m =>
        m.id === message.id
          ? {
              ...m,
              content: result.fixedContent,
              trustScore: newTrustScore,
              validationSummary: {
                passedCount: newValidation.agentResults.filter(r => r.passed).length,
                warningCount: newValidation.agentResults
                  .flatMap(r => r.violations)
                  .filter(v => v.severity === 'warning').length,
                errorCount: newValidation.agentResults
                  .flatMap(r => r.violations)
                  .filter(v => v.severity === 'error').length,
                autoFixesApplied: result.appliedFixes.length,
              },
            }
          : m
      ));
      
      console.log(`[AutoFix] Applied ${result.appliedFixes.length} fixes, score improved by ${result.scoreImprovement}`);
    } catch (err) {
      console.error('[AutoFix] Error applying fixes:', err);
    } finally {
      setIsAutoFixing(false);
    }
  }, [selectedMessageForTrust, chatMessages, isAutoFixing, trustSettings, setMessages]);

  // Handle accepting the auto-fix preview (inline side-by-side)
  const handleAcceptAutoFix = useCallback(async (messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    
    if (!message?.autoFixPreview?.isPending) {
      console.log('[AutoFix Accept] No pending auto-fix preview for message:', messageId);
      return;
    }
    
    const { fixedContent, appliedFixes } = message.autoFixPreview;
    
    try {
      console.log(`[AutoFix Accept] Accepting ${appliedFixes.length} fixes for message:`, messageId);
      
      // Re-validate the fixed content to get updated trust score
      const newValidation = await runValidationPipeline(
        fixedContent, 
        message.generationContext
      );
      const newTrustScore = calculateTrustScore(newValidation, trustSettings);
      
      // Update the message: replace content, clear autoFixPreview
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? {
              ...m,
              content: fixedContent,
              trustScore: newTrustScore,
              validationSummary: {
                passedCount: newValidation.agentResults.filter(r => r.passed).length,
                warningCount: newValidation.agentResults
                  .flatMap(r => r.violations)
                  .filter(v => v.severity === 'warning').length,
                errorCount: newValidation.agentResults
                  .flatMap(r => r.violations)
                  .filter(v => v.severity === 'error').length,
                autoFixesApplied: appliedFixes.length,
              },
              // Clear the auto-fix preview since user accepted
              autoFixPreview: undefined,
            }
          : m
      ));
      
      console.log(`[AutoFix Accept] Successfully applied ${appliedFixes.length} fixes`);
    } catch (err) {
      console.error('[AutoFix Accept] Error accepting fixes:', err);
    }
  }, [chatMessages, trustSettings, setMessages]);

  // Get selected message for trust panel
  const selectedMessageForTrustPanel = useMemo(() => 
    selectedMessageForTrust 
      ? chatMessages.find(m => m.id === selectedMessageForTrust) 
      : null,
    [selectedMessageForTrust, chatMessages]
  );

  // Handle microphone access and start conversation
  const handleStartConversation = async () => {
    // Double-click guard - prevent multiple simultaneous starts
    if (appState !== AppState.IDLE && appState !== AppState.ERROR) {
      return;
    }

    // Validate config
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      setError({ 
        code: 'CONFIG_ERROR', 
        message: configValidation.errors.join('. ')
      });
      return;
    }

    setAppState(AppState.CONNECTING);
    setError(null);
    setTranscript('');

    try {
      // Request microphone access with enhanced audio processing
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: AUDIO_CONFIG.inputSampleRate },
          channelCount: AUDIO_CONFIG.channels,
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
        },
      });
      streamRef.current = stream;

      // Create audio context for input
      inputAudioContextRef.current = createAudioContext(AUDIO_CONFIG.inputSampleRate);

      // Create audio analyzer for the AI Orb visualization
      const analyzer = inputAudioContextRef.current.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;
      audioAnalyzerRef.current = analyzer;

      // Connect stream to analyzer for visualization
      const analyzerSource = inputAudioContextRef.current.createMediaStreamSource(stream);
      analyzerSource.connect(analyzer);

      // Create conversation provider
      const provider = createConversationProvider();
      conversationProviderRef.current = provider;

      // Get voice from TTS provider (not conversation provider) to ensure correct voice IDs
      const ttsProvider = createTTSProvider();
      const voice = ttsProvider.getDefaultVoice(activeProject?.voiceGender === VoiceGender.FEMALE ? 'female' : 'male');
      const systemPrompt = getSystemInstruction(activeProject?.config || { persona: { tone: '', pace: 'medium', confidence: 'medium', vibe: 'warm', language: 'english' }, greeting: '', maxResponseLength: 'short' });

      // Connect to conversation service
      await provider.connect(
        {
          voice,
          systemPrompt,
          persona: activeProject?.config.persona || { tone: '', pace: 'medium', confidence: 'medium', vibe: 'warm', language: 'english' },
          greeting: activeProject?.config.greeting || '',
          maxResponseLength: activeProject?.config.maxResponseLength || 'short',
        },
        {
          onStateChange: (state) => {
            switch (state) {
              case 'listening':
                setAppState(AppState.LISTENING);
                // Reset turn tracking when starting to listen
                currentTurnRef.current = { userMessageId: null, responseText: '' };
                break;
              case 'speaking':
                setAppState(AppState.SPEAKING);
                break;
              case 'error':
                setAppState(AppState.ERROR);
                break;
              case 'idle':
                setAppState(AppState.IDLE);
                break;
              default:
                break;
            }
          },
          onTranscript: (text, isFinal) => {
            setTranscript(text);
            if (isFinal && text.trim()) {
              console.log('Final transcript:', text);
              // Add user message to chat history
              const userMessage = createTextMessage('user', text, 'voice');
              addMessage(userMessage);
              currentTurnRef.current.userMessageId = userMessage.id;
              // Clear transcript display after adding to history
              setTimeout(() => setTranscript(''), 500);
            }
          },
          onResponse: (text) => {
            console.log('AI response:', text);
            // Store response text to attach to audio message
            currentTurnRef.current.responseText = text;
            // Show streaming AI response in real-time
            setStreamingAIResponse(text);
          },
          onAudioReceived: (audioBuffer) => {
            console.log('Audio received:', audioBuffer.duration, 'seconds');
            // Convert AudioBuffer to base64 for persistence
            const base64 = audioBufferManager.toBase64(audioBuffer);
            
            // Create audio message with the response text
            const aiMessage = createAudioMessage(
              'assistant',
              currentTurnRef.current.responseText || '(Audio response)',
              base64,
              audioBuffer.duration,
              audioBuffer.sampleRate,
              'voice',
              currentTurnRef.current.userMessageId || undefined
            );
            addMessage(aiMessage);
            
            // Clear streaming AI response after message is created
            setStreamingAIResponse('');
            
            // Reset turn tracking
            currentTurnRef.current = { userMessageId: null, responseText: '' };
          },
          onError: (err) => {
            console.error('Conversation error:', err);
            setError({
              code: 'CONVERSATION_ERROR',
              message: err.message,
            });
          },
        }
      );

      // Set up audio processing with noise suppression
      const source = inputAudioContextRef.current.createMediaStreamSource(stream);
      const processor = inputAudioContextRef.current.createScriptProcessor(
        AUDIO_CONFIG.bufferSize,
        AUDIO_CONFIG.channels,
        AUDIO_CONFIG.channels
      );
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        provider.sendAudio(inputData);
      };

      // Initialize noise suppression if supported
      if (isNoiseSuppressionSupported()) {
        try {
          console.log('[Voice] Initializing RNNoise noise suppression...');
          const noiseSuppression = getNoiseSuppressionService();
          await noiseSuppression.initialize(inputAudioContextRef.current);
          noiseSuppressionRef.current = noiseSuppression;
          
          // Connect: source -> noise suppression -> processor -> destination
          noiseSuppression.connect(source, processor);
          processor.connect(inputAudioContextRef.current.destination);
          console.log('[Voice] Noise suppression enabled');
        } catch (nsError) {
          console.warn('[Voice] Failed to initialize noise suppression, using direct connection:', nsError);
          // Fallback: direct connection without noise suppression
          source.connect(processor);
          processor.connect(inputAudioContextRef.current.destination);
        }
      } else {
        console.log('[Voice] AudioWorklet not supported, noise suppression disabled');
        source.connect(processor);
        processor.connect(inputAudioContextRef.current.destination);
      }

    } catch (err) {
      console.error('Failed to start conversation:', err);
      setAppState(AppState.ERROR);
      
      // Handle specific permission errors with user-friendly messages
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError({
            code: 'PERMISSION_DENIED',
            message: 'Microphone access was denied. Please allow microphone access in your browser settings and try again.',
          });
          return;
        } else if (err.name === 'NotFoundError') {
          setError({
            code: 'NO_MICROPHONE',
            message: 'No microphone found. Please connect a microphone and try again.',
          });
          return;
        }
      }
      
      setError({
        code: 'START_ERROR',
        message: err instanceof Error ? err.message : 'Failed to start conversation',
      });
    }
  };

  // Handle stop conversation
  const handleStopConversation = useCallback(() => {
    // Disconnect provider
    if (conversationProviderRef.current) {
      conversationProviderRef.current.disconnect();
      conversationProviderRef.current = null;
    }

    // Disconnect noise suppression
    if (noiseSuppressionRef.current) {
      noiseSuppressionRef.current.disconnect();
      noiseSuppressionRef.current = null;
    }

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Disconnect audio analyzer
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.disconnect();
      audioAnalyzerRef.current = null;
    }

    // Close audio context
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Reset turn tracking to prevent stale data
    currentTurnRef.current = { userMessageId: null, responseText: '' };

    setAppState(AppState.IDLE);
    setTranscript('');
  }, []);

  // Toggle conversation
  const handleToggleConversation = useCallback(() => {
    if (appState === AppState.IDLE || appState === AppState.ERROR) {
      handleStartConversation();
    } else {
      handleStopConversation();
    }
  }, [appState]);

  // Safe mode change with cleanup and focus management
  const handleModeChange = useCallback((newMode: ChatMode) => {
    // Cleanup any active voice conversation before mode switch
    if (appState !== AppState.IDLE && appState !== AppState.ERROR) {
      handleStopConversation();
    }
    setChatMode(newMode);
    
    // Move focus after state update for accessibility
    requestAnimationFrame(() => {
      if (newMode === 'voice') {
        // Focus the mic button in voice UI
        document.querySelector<HTMLButtonElement>('[data-voice-mic-button]')?.focus();
      } else {
        // Focus the text input
        document.querySelector<HTMLTextAreaElement>('[data-chat-input]')?.focus();
      }
    });
  }, [appState]);

  // Don't render until we have an active project
  if (!activeProject) {
    return (
      <div 
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <p style={{ color: theme.text.medium }}>Loading...</p>
      </div>
    );
  }

  // Render documentation view
  if (activeView === 'docs') {
    const DocPanelComponent = DocumentationPanel;
    
    return (
      <div 
        className="flex h-screen"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <ProjectSidebar 
          onProjectSelect={() => setActiveView('main')}
          onNavigateToDesignSystem={() => setActiveView('design-system')}
          isDesignSystemActive={false}
          onNavigateToHowItWorks={() => setActiveView('how-it-works')}
          isHowItWorksActive={false}
          colorMode={colorMode}
          onColorModeChange={onColorModeChange}
          userName={userProfile?.name}
          userRole={userProfile?.role}
          onEditProfile={() => setShowOnboarding(true)}
        />
        <main className="flex-1 overflow-hidden">
          <DocPanelComponent onBack={() => setActiveView('main')} />
        </main>
        <AdvancedSettingsPanel
          voiceGender={activeProject.voiceGender}
          onVoiceGenderChange={updateProjectVoiceGender}
          config={activeProject.config}
          onConfigChange={updateProjectConfig}
          defaultEcosystem={ecosystem}
          defaultChannel={contentChannel}
          defaultLanguage={activeProject.defaultLanguage || 'english'}
          defaultRegion={activeProject.defaultRegion || 'pan_india'}
          onDefaultEcosystemChange={(eco) => {
            setEcosystem(eco);
            updateProjectDefaultEcosystem(eco);
          }}
          onDefaultChannelChange={(ch) => {
            setContentChannel(ch);
            updateProjectDefaultChannel(ch);
          }}
          onDefaultLanguageChange={updateProjectDefaultLanguage}
          onDefaultRegionChange={updateProjectDefaultRegion}
          trustSettings={trustSettings}
          onTrustSettingsChange={setTrustSettings}
          colorMode={colorMode}
          onColorModeChange={onColorModeChange}
          temperature={temperature}
          maxTokens={maxTokens}
          streamResponse={streamResponse}
          onTemperatureChange={setTemperature}
          onMaxTokensChange={setMaxTokens}
          onStreamResponseChange={setStreamResponse}
          disabled={appState !== AppState.IDLE}
          isCollapsed={isConfigPanelCollapsed}
          onToggleCollapse={() => setIsConfigPanelCollapsed(!isConfigPanelCollapsed)}
          onShowDesignSystem={() => setActiveView('design-system')}
        />
      </div>
    );
  }

  // Render design system library view
  if (activeView === 'design-system') {
    return (
      <div 
        className="flex h-screen"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <DesignSystemLibrary 
          onBack={() => setActiveView('main')} 
          colorMode={colorMode}
        />
      </div>
    );
  }

  // Render how it works view
  if (activeView === 'how-it-works') {
    return (
      <div 
        className="flex h-screen"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <ProjectSidebar 
          onProjectSelect={() => setActiveView('main')}
          onNavigateToDesignSystem={() => setActiveView('design-system')}
          isDesignSystemActive={false}
          onNavigateToHowItWorks={() => setActiveView('how-it-works')}
          isHowItWorksActive={true}
          colorMode={colorMode}
          onColorModeChange={onColorModeChange}
          userName={userProfile?.name}
          userRole={userProfile?.role}
          onEditProfile={() => setShowOnboarding(true)}
        />
        <main className="flex-1 overflow-hidden">
          <HowItWorksPage onBack={() => setActiveView('main')} />
        </main>
      </div>
    );
  }

  // Render main view - Always use Jio components
  const ChatPanelComponent = ChatPanel;
  
  return (
    <div 
      className="flex h-screen"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Left Sidebar - Projects */}
      <ProjectSidebar 
        onProjectSelect={() => setActiveView('main')}
        onNavigateToDesignSystem={() => setActiveView('design-system')}
        isDesignSystemActive={false}
        onNavigateToHowItWorks={() => setActiveView('how-it-works')}
        isHowItWorksActive={false}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        userName={userProfile?.name}
        userRole={userProfile?.role}
        onEditProfile={() => setShowOnboarding(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden items-center">
        <div className="w-full max-w-[1200px] flex flex-col h-full">
        {/* Screen reader announcements for mode changes */}
        <div 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
          className="sr-only"
        >
          {chatMode === 'voice' ? 'Voice chat mode activated' : 'Text chat mode activated'}
        </div>

        {/* Mode Content */}
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <div className="h-full flex flex-col">

              {/* Voice Mode: AI Orb Visualization + Chat History */}
              {chatMode === 'voice' && (
                <div 
                  className="voice-panel px-4 py-6 flex flex-col items-center gap-4 relative"
                >

                  {/* AI Orb - Central interaction point */}
                  <AIOrb
                    state={appState}
                    audioAnalyzer={audioAnalyzerRef.current}
                    onClick={handleToggleConversation}
                    size={105}
                    disabled={false}
                  />

                  {/* Status text */}
                  <p 
                    className="text-sm font-medium"
                    style={{ color: theme.text.medium }}
                  >
                    {appState === AppState.IDLE
                      ? 'Tap orb to talk'
                      : appState === AppState.CONNECTING
                      ? 'Connecting...'
                      : appState === AppState.LISTENING
                      ? 'Listening...'
                      : appState === AppState.SPEAKING
                      ? 'AI is speaking...'
                      : 'Error - tap to retry'}
                  </p>
                </div>
              )}

              {/* Chat Panel (shared for both modes) */}
              <div className="flex-1 overflow-hidden">
                <ChatPanelComponent
                  messages={filteredMessages}
                  onSendMessage={handleSendChatMessage}
                  isLoading={isChatLoading}
                  mode={chatMode}
                  placeholder={featureFlags.conversationalMode
                    ? 'Chat about anything, or say "write an SMS for..." to generate content'
                    : 'Ask or describe what you need...'}
                  showEmptyState={chatMode !== 'voice'}
                  emptyStateMessage={chatMode === 'copy'
                    ? (featureFlags.conversationalMode
                      ? 'Ask me anything, or ask me to create content for you.'
                      : 'What would you like to create today?')
                    : 'Start a voice conversation or type a message'}
                  inputDisabled={chatMode === 'voice' && appState !== AppState.IDLE && appState !== AppState.ERROR}
                  id={`${chatMode}-panel`}
                  onVoiceClick={() => handleModeChange(chatMode === 'voice' ? 'copy' : 'voice')}
                  voiceSupported={voiceSupported ?? true}
                  // Voice streaming transcription props
                  streamingUserTranscript={chatMode === 'voice' && appState === AppState.LISTENING ? transcript : undefined}
                  streamingAIResponse={chatMode === 'voice' && appState === AppState.SPEAKING ? streamingAIResponse : undefined}
                  modelSelector={
                    <ModelSelector
                      value={chatMode === 'copy' ? selectedLLMProvider : selectedTalkLLMProvider}
                      onChange={chatMode === 'copy' ? setSelectedLLMProvider : setSelectedTalkLLMProvider}
                      ttsValue={selectedTTSProvider}
                      onTTSChange={setSelectedTTSProvider}
                      showHealth={false}
                      size="sm"
                      disabled={isChatLoading || (chatMode === 'voice' && appState !== AppState.IDLE)}
                    />
                  }
                  // Content Trust System: Context selector
                  // In conversational mode, hide from chat input (auto-detected from message)
                  // In legacy mode, show ecosystem + channel dropdowns
                  contextSelector={featureFlags.conversationalMode ? undefined : (
                    <div className="flex items-center gap-2">
                      <ContentContextSelector
                        ecosystem={ecosystem}
                        channel={contentChannel}
                        onEcosystemChange={(eco) => {
                          setEcosystem(eco);
                          updateProjectDefaultEcosystem(eco);
                        }}
                        onChannelChange={(ch) => {
                          setContentChannel(ch);
                          updateProjectDefaultChannel(ch);
                        }}
                        compact={true}
                        disabled={isChatLoading}
                      />
                    </div>
                  )}
                  // Settings trigger
                  settingsTrigger={
                    <button
                      onClick={() => setIsConfigPanelCollapsed(!isConfigPanelCollapsed)}
                      className="w-[28px] h-[28px] rounded-full flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
                      style={{
                        backgroundColor: 'transparent',
                        color: theme.text.medium,
                      }}
                      aria-label="Open settings"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.stroke.low;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <DSIcon name="IcSettings" size="XS" attention="medium" />
                    </button>
                  }
                  // Content Trust System: Trust badge click handler
                  onTrustBadgeClick={handleTrustBadgeClick}
                  // Phase 3: Feedback & Learning (deprecated - kept for backward compat)
                  onMessageFeedback={handleMessageFeedback}
                  onSaveAsExample={handleSaveAsExample}
                  // ChatGPT-style message actions
                  onLike={handleLike}
                  onDislike={handleDislike}
                  onTryAgain={handleTryAgain}
                  // Edit flow
                  editingMessageId={editingMessageId}
                  editValue={editValue}
                  onStartEdit={handleStartEdit}
                  onEditChange={setEditValue}
                  onSubmitEdit={handleSubmitEdit}
                  onCancelEdit={handleCancelEdit}
                  onVersionChange={handleVersionChange}
                  // Dislike feedback modal
                  dislikeModalMessageId={dislikeModalMessageId}
                  onDislikeModalSubmit={handleDislikeModalSubmit}
                  onDislikeModalClose={handleDislikeModalClose}
                  // Auto-fix preview accept handler
                  onAcceptAutoFix={handleAcceptAutoFix}
                />
              </div>
            </div>
          </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Advanced Settings */}
      <AdvancedSettingsPanel
        voiceGender={activeProject.voiceGender}
        onVoiceGenderChange={updateProjectVoiceGender}
        config={activeProject.config}
        onConfigChange={updateProjectConfig}
        defaultEcosystem={ecosystem}
        defaultChannel={contentChannel}
        defaultLanguage={activeProject.defaultLanguage || 'english'}
        defaultRegion={activeProject.defaultRegion || 'pan_india'}
        onDefaultEcosystemChange={(eco) => {
          setEcosystem(eco);
          updateProjectDefaultEcosystem(eco);
        }}
        onDefaultChannelChange={(ch) => {
          setContentChannel(ch);
          updateProjectDefaultChannel(ch);
        }}
        onDefaultLanguageChange={updateProjectDefaultLanguage}
        onDefaultRegionChange={updateProjectDefaultRegion}
        trustSettings={trustSettings}
        onTrustSettingsChange={setTrustSettings}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        temperature={temperature}
        maxTokens={maxTokens}
        streamResponse={streamResponse}
        onTemperatureChange={setTemperature}
        onMaxTokensChange={setMaxTokens}
        onStreamResponseChange={setStreamResponse}
        disabled={appState !== AppState.IDLE && chatMode === 'voice'}
        isCollapsed={isConfigPanelCollapsed}
        onToggleCollapse={() => setIsConfigPanelCollapsed(!isConfigPanelCollapsed)}
        onShowDesignSystem={() => setActiveView('design-system')}
      />

      {/* Trust Context Panel - Slide-out */}
      <TrustContextPanel
        isOpen={showTrustPanel}
        onClose={() => {
          setShowTrustPanel(false);
          setSelectedMessageForTrust(null);
        }}
        trustScore={selectedMessageForTrustPanel?.trustScore}
        generationContext={selectedMessageForTrustPanel?.generationContext}
        analyzedContent={selectedMessageForTrustPanel?.content}
        onAutoFix={handleAutoFix}
        autoFixAvailable={
          !isAutoFixing && 
          (selectedMessageForTrustPanel?.trustScore?.autoFixableCount ?? 0) > 0
        }
      />


      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          existingProfile={userProfile ?? undefined}
          onClose={userProfile ? () => setShowOnboarding(false) : undefined}
        />
      )}

      {/* Error Toast */}
      {error && (
          <div className="fixed bottom-3 left-1/2 -translate-x-1/2 max-w-md w-full mx-auto px-4">
            <div className="bg-red-500 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="flex-1 text-xs">{error.message}</p>
              <button
                onClick={() => setError(null)}
                className="p-1 hover:bg-red-600 rounded-full"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

export default App;
