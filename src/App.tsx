import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import type { 
  ActiveView, 
  ColorMode,
  AppError,
  ChatMode,
  EcosystemType,
  ContentChannelType,
  TrustSettings,
} from './types';
import { 
  AppState,
} from './types';
import { 
  DocumentationPanel,
  ProjectSidebar,
  ChatPanel,
  ErrorBoundary,
  ModelSelector,
  HowItWorksPage,
  AIOrb,
  DSIcon,
  // Content Trust System components
  ContentContextSelector,
  TrustContextPanel,
  AdvancedSettingsPanel,
} from './components';
import { setDynamicAvoidWords } from './services/validation';
import { setDynamicAutoFixRules } from './services/trust';
import { useChatPersistence, useVoiceConversation, useMessageInteractions, useTrustPanel, useContentGeneration } from './hooks';
import { useThemeColors } from './theme';
// Design system context removed - locked to Jio only
import { useProject } from './context/ProjectContext';
import { useAbortController } from './hooks';
// Zustand stores
import { useConversationStore } from './stores/conversationStore';
import { useUIStore } from './stores/uiStore';
// Onboarding & Sync
import OnboardingModal, { loadUserProfile, getDeviceId, type UserProfile } from './components/OnboardingModal';
import { getSyncService } from './services/sync/convexSync';
// Persona Engine (Phase 1)
import { getAutoConfig, type PersonaRole } from './services/persona';
// Feature Flags
import { featureFlags } from './services/featureFlags';
// Memory Services (Phase F)
import {
  initSessionMemory,
  hasActiveSession,
  type MidTermMemory,
} from './services/memory';
// Analytics Services (v2)
import { 
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
  type CorrectionEntry,
} from './services/knowledge';
// Token Enforcement cache (for useEffect injection)
import {
  setCachedEnforcementRules,
} from './services/validation/tokenEnforcementCache';
import type { TokenEnforcementRule } from './services/validation/tokenEnforcementAgent';
// Project auto-naming (ChatGPT-style)
import { generateProjectNameFromExchange } from './services/projectNaming';
import type { 
  FeedbackPayload, 
} from './types';

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
    updateProject,
    updateProjectConfig, 
    updateProjectVoiceGender, 
    // New Content Trust methods
    updateProjectDefaultChannel,
    updateProjectDefaultEcosystem,
    updateProjectDefaultLanguage,
    updateProjectDefaultRegion,
  } = useProject();
  
  // ── Auto-rename Project (ChatGPT-style) ────────────────────────
  // Automatically rename "Untitled N" projects based on first message exchange
  const tryAutoRenameProject = useCallback((userMessage: string, aiResponse: string) => {
    // Only auto-rename if project still has default "Untitled" name
    if (!activeProject?.name.startsWith('Untitled')) return;
    
    // Generate name from user message + AI response (ChatGPT-style)
    const suggestedName = generateProjectNameFromExchange(userMessage, aiResponse);
    if (suggestedName) {
      updateProject(activeProject.id, { name: suggestedName });
      console.log(`[AutoRename] Project renamed to: "${suggestedName}"`);
    }
  }, [activeProject, updateProject]);
  
  // ── Onboarding State ──────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => loadUserProfile());
  
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

    // NOTE: Profile sync to Convex is handled by the useEffect above
    // (triggers on userProfile?.deviceId change), avoiding a race condition
    // where initSyncService() would destroy an in-flight sync call.

    // Phase 1: Auto-configure from persona engine (gated by feature flag)
    if (featureFlags.persona) {
      const autoConfig = getAutoConfig(profile.role as PersonaRole, profile.product);
      setEcosystem(autoConfig.ecosystem);
      setContentChannel(autoConfig.channel);
    }
  }, [setShowOnboarding, setEcosystem, setContentChannel]);

  // ==========================================================================
  // Zustand Store Selectors (replaces 15+ useState + persistence useEffects)
  // ==========================================================================

  // Conversation store -- generation config, providers, memory
  const {
    ecosystem, setEcosystem,
    contentChannel, setContentChannel,
    trustSettings, setTrustSettings,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    streamResponse, setStreamResponse,
    isChatLoading, setIsChatLoading,
    selectedLLMProvider, setSelectedLLMProvider,
    selectedTTSProvider, setSelectedTTSProvider,
    selectedTalkLLMProvider, setSelectedTalkLLMProvider,
    midTermMemory, setMidTermMemory,
  } = useConversationStore(useShallow((s) => ({
    ecosystem: s.ecosystem, setEcosystem: s.setEcosystem,
    contentChannel: s.contentChannel, setContentChannel: s.setContentChannel,
    trustSettings: s.trustSettings, setTrustSettings: s.setTrustSettings,
    temperature: s.temperature, setTemperature: s.setTemperature,
    maxTokens: s.maxTokens, setMaxTokens: s.setMaxTokens,
    streamResponse: s.streamResponse, setStreamResponse: s.setStreamResponse,
    isChatLoading: s.isChatLoading, setIsChatLoading: s.setIsChatLoading,
    selectedLLMProvider: s.selectedLLMProvider, setSelectedLLMProvider: s.setSelectedLLMProvider,
    selectedTTSProvider: s.selectedTTSProvider, setSelectedTTSProvider: s.setSelectedTTSProvider,
    selectedTalkLLMProvider: s.selectedTalkLLMProvider, setSelectedTalkLLMProvider: s.setSelectedTalkLLMProvider,
    midTermMemory: s.midTermMemory, setMidTermMemory: s.setMidTermMemory,
  })));

  // UI store -- navigation, modals, error
  const {
    chatMode, setChatMode,
    activeView, setActiveView,
    error, setError, clearError,
    isConfigPanelCollapsed, setConfigPanelCollapsed,
    showOnboarding, setShowOnboarding,
  } = useUIStore(useShallow((s) => ({
    chatMode: s.chatMode, setChatMode: s.setChatMode,
    activeView: s.activeView, setActiveView: s.setActiveView,
    error: s.error, setError: s.setError, clearError: s.clearError,
    isConfigPanelCollapsed: s.isConfigPanelCollapsed, setConfigPanelCollapsed: s.setConfigPanelCollapsed,
    showOnboarding: s.showOnboarding, setShowOnboarding: s.setShowOnboarding,
  })));

  // Initialize session memory on mount
  useEffect(() => {
    if (!hasActiveSession()) {
      initSessionMemory();
    }
  }, []);

  // Sync ecosystem/channel with active project changes
  useEffect(() => {
    if (activeProject?.defaultEcosystem) {
      setEcosystem(activeProject.defaultEcosystem);
    }
    if (activeProject?.defaultChannel) {
      setContentChannel(activeProject.defaultChannel);
    }
  }, [activeProject?.id, activeProject?.defaultEcosystem, activeProject?.defaultChannel, setEcosystem, setContentChannel]);
  
  // ==========================================================================
  
  // (Voice hook call is below, after useChatPersistence which provides addMessage)

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

  // Filter messages by current mode
  const filteredMessages = useMemo(() => {
    return chatMessages.filter(m => m.sourceMode === chatMode || !m.sourceMode);
  }, [chatMessages, chatMode]);

  // Request cancellation - use getSignal() to get fresh signal after reset
  const { reset: resetChatAbort, getSignal: getChatAbortSignal } = useAbortController();

  // Voice conversation -- extracted to hook (refs + state + handlers)
  const {
    voiceSupported,
    appState,
    transcript,
    streamingAIResponse,
    setStreamingAIResponse,
    voiceError,
    audioAnalyzerRef,
    handleStartConversation,
    handleStopConversation,
    handleToggleConversation,
    handleModeChange: handleVoiceModeChange,
  } = useVoiceConversation({
    activeProject: activeProject ? {
      voiceGender: activeProject.voiceGender,
      config: activeProject.config,
    } : null,
    addMessage,
    tryAutoRenameProject,
  });

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
  
  // Fetch directive overrides from Convex for constitutional AI
  // Returns active overrides filtered by ecosystem and channel
  const convexDirectiveOverrides = useQuery(
    featureFlags.constitutionalWrapper ? api.seedDirectiveOverrides.getByContext : undefined,
    featureFlags.constitutionalWrapper ? { ecosystem, channel: contentChannel } : 'skip'
  );
  
  // Fetch token enforcement rules from Convex
  // Used for post-generation validation and auto-fix
  // NOTE: Always fetch regardless of feature flag - brand protection is critical
  const convexTokenEnforcementRules = useQuery(
    api.tokenEnforcement.getActive,
    {}
  );
  
  // Semantic search action for RAG (called on-demand during message generation)
  const runSemanticSearch = useAction(api.embeddings.semanticSearch);

  // Inject CSS variables for local tokens
  useEffect(() => {
    document.documentElement.style.setProperty('--local-white', theme.local.white);
  }, [theme.local.white]);

  // Voice support detection moved to useVoiceConversation hook

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

  // Cache token enforcement rules when they load from Convex
  // Critical for brand protection - must be cached to avoid race conditions
  useEffect(() => {
    if (convexTokenEnforcementRules && convexTokenEnforcementRules.length > 0) {
      setCachedEnforcementRules(convexTokenEnforcementRules as TokenEnforcementRule[]);
    }
  }, [convexTokenEnforcementRules]);

  // Voice cleanup moved to useVoiceConversation hook

  // Content generation -- extracted to useContentGeneration hook
  const { sendMessage: handleSendChatMessage } = useContentGeneration({
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
  });

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
  // Message interactions -- extracted to useMessageInteractions hook
  // ========================================================================
  const {
    editingMessageId,
    editValue,
    setEditValue,
    editTriggerRef,
    dislikeModalMessageId,
    handleStartEdit,
    handleCancelEdit,
    handleSubmitEdit,
    handleVersionChange,
    handleLike,
    handleDislike,
    handleDislikeModalSubmit,
    handleDislikeModalClose,
    handleTryAgain,
  } = useMessageInteractions({
    chatMessages,
    updateMessage,
    handleSendChatMessage,
    handleMessageFeedback,
  });
  
  // Stop generation - cancels ongoing streaming request
  const handleStopGeneration = useCallback(() => {
    resetChatAbort();
    setStreamingAIResponse('');
    setIsChatLoading(false);
    console.log('[Chat] Generation stopped by user');
  }, [resetChatAbort]);
  
  // Edit/version handlers extracted to useMessageInteractions hook
  
  // Like/Dislike/TryAgain handlers extracted to useMessageInteractions hook

  // Auto-dismiss error (uses store clearError)
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

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


  // Trust panel handlers extracted to useTrustPanel hook
  const {
    showTrustPanel,
    setShowTrustPanel,
    selectedMessageForTrust,
    setSelectedMessageForTrust,
    selectedMessageForTrustPanel,
    isAutoFixing,
    handleTrustBadgeClick,
    handleAutoFix,
    handleAcceptAutoFix,
  } = useTrustPanel({
    chatMessages,
    trustSettings,
    setMessages,
    convexAutoFixRules: convexKnowledge?.autoFixRules,
  });

  // Voice handlers extracted to useVoiceConversation hook

  // Mode change wrapper (voice hook handles cleanup, App handles chatMode)
  const handleModeChange = useCallback((newMode: ChatMode) => {
    handleVoiceModeChange(newMode, setChatMode);
  }, [handleVoiceModeChange, setChatMode]);

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
          onToggleCollapse={() => setConfigPanelCollapsed(!isConfigPanelCollapsed)}
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
        onNavigateToHowItWorks={() => setActiveView('how-it-works')}
        isHowItWorksActive={false}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        userName={userProfile?.name}
        userRole={userProfile?.role}
        onEditProfile={() => setShowOnboarding(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
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
                      ? 'Ask anything or create content'
                      : 'What would you like to create today?')
                    : 'Start a voice conversation or type a message'}
                  inputDisabled={chatMode === 'voice' && appState !== AppState.IDLE && appState !== AppState.ERROR}
                  id={`${chatMode}-panel`}
                  onVoiceClick={() => handleModeChange(chatMode === 'voice' ? 'copy' : 'voice')}
                  voiceSupported={voiceSupported ?? true}
                  // Streaming transcription/response props
                  streamingUserTranscript={chatMode === 'voice' && appState === AppState.LISTENING ? transcript : undefined}
                  streamingAIResponse={streamingAIResponse || undefined}
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
                      onClick={() => setConfigPanelCollapsed(!isConfigPanelCollapsed)}
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
                  // Stop generation handler
                  onStopGeneration={handleStopGeneration}
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
        onToggleCollapse={() => setConfigPanelCollapsed(!isConfigPanelCollapsed)}
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
        evidence={selectedMessageForTrustPanel?.evidence}
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
