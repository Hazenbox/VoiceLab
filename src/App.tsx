import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import type { 
  ColorMode,
  ChatMode,
} from './types';
import { MainLayout, DocsLayout, HowItWorksLayout } from './components/layouts';
import { useChatPersistence, useVoiceConversation, useMessageInteractions, useTrustPanel, useContentGeneration, useConvexData, useProfileSync } from './hooks';
import { useThemeColors } from './theme';
// Design system context removed - locked to Jio only
import { useProject } from './context/ProjectContext';
import { useAbortController } from './hooks';
// Zustand stores
import { useConversationStore } from './stores/conversationStore';
import { useUIStore } from './stores/uiStore';
// Onboarding & Sync
import { loadUserProfile, type UserProfile } from './components/OnboardingModal';
import { getSyncService } from './services/sync/convexSync';
// Persona Engine (Phase 1)
import { getAutoConfig, type PersonaRole } from './services/persona';
// Feature Flags
import { featureFlags } from './services/featureFlags';
// Memory Services (Phase F)
import {
  initSessionMemory,
  hasActiveSession,
} from './services/memory';
// Session analytics hook (extracted from App.tsx for cleaner separation)
import { useSessionAnalytics } from './hooks';
// Knowledge & Learning (Phase 2-3)
import {
  storeLocalCorrection,
  saveAsExample,
  type CorrectionEntry,
} from './services/knowledge';
// Project auto-naming (ChatGPT-style)
import { generateProjectNameFromExchange } from './services/projectNaming';
import { ComplianceTestRunner } from './components/ComplianceTestRunner';
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
  
  // Project context (layouts read other methods directly from useProject())
  const { activeProject, updateProject } = useProject();
  
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
  
  // Sync user profile to Convex (extracted to hook)
  useProfileSync(userProfile);

  // ==========================================================================
  // Zustand Store Selectors (replaces 15+ useState + persistence useEffects)
  // ==========================================================================

  // Conversation store -- only fields used directly by App.tsx logic
  // (Layouts + hooks read other fields from the store directly)
  const {
    ecosystem, setEcosystem,
    contentChannel, setContentChannel,
    setIsChatLoading,
  } = useConversationStore(useShallow((s) => ({
    ecosystem: s.ecosystem, setEcosystem: s.setEcosystem,
    contentChannel: s.contentChannel, setContentChannel: s.setContentChannel,
    setIsChatLoading: s.setIsChatLoading,
  })));

  // UI store -- only fields used directly by App.tsx logic
  // (Layouts read activeView, isConfigPanelCollapsed, showOnboarding directly)
  const {
    chatMode, setChatMode,
    activeView,
    error, clearError,
    setShowOnboarding,
  } = useUIStore(useShallow((s) => ({
    chatMode: s.chatMode, setChatMode: s.setChatMode,
    activeView: s.activeView,
    error: s.error, clearError: s.clearError,
    setShowOnboarding: s.setShowOnboarding,
  })));

  // Onboarding complete handler (after store selectors so dependencies are in scope)
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
  // (voiceError, handleStartConversation, handleStopConversation unused here)
  const {
    voiceSupported,
    appState,
    transcript,
    streamingAIResponse,
    setStreamingAIResponse,
    audioAnalyzerRef,
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
  // Convex Knowledge Base & Learning Integration (extracted to hook)
  // ========================================================================
  const {
    convexKnowledge,
    convexCorrections,
    convexUserLearningProfile,
    convexTrainingExamples,
    convexDirectiveOverrides,
    convexTokenEnforcementRules,
    runSemanticSearch,
  } = useConvexData(userProfile?.deviceId);

  // Inject CSS variables for local tokens
  useEffect(() => {
    document.documentElement.style.setProperty('--local-white', theme.local.white);
  }, [theme.local.white]);

  // Content generation -- reads store values via getState() internally
  const { sendMessage: handleSendChatMessage } = useContentGeneration({
    chatMessages,
    addMessage,
    replaceMessage,
    userProfile,
    activeProject,
    convexKnowledge,
    convexCorrections,
    convexTrainingExamples,
    convexDirectiveOverrides,
    convexTokenEnforcementRules,
    convexUserLearningProfile,
    runSemanticSearch,
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

  // Trust panel handlers extracted to useTrustPanel hook
  const {
    showTrustPanel,
    setShowTrustPanel,
    setSelectedMessageForTrust,
    selectedMessageForTrustPanel,
    isAutoFixing,
    handleTrustBadgeClick,
    handleAutoFix,
    handleAcceptAutoFix,
  } = useTrustPanel({
    chatMessages,
    setMessages,
    convexAutoFixRules: convexKnowledge?.autoFixRules,
  });

  // Voice handlers extracted to useVoiceConversation hook

  // Mode change wrapper (voice hook handles cleanup, App handles chatMode)
  const handleModeChange = useCallback((newMode: ChatMode) => {
    handleVoiceModeChange(newMode, setChatMode);
  }, [handleVoiceModeChange, setChatMode]);

  // ── Layout Rendering ─────────────────────────────────────────────────

  // Loading state
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

  // Shared sidebar props
  const sidebarProps = {
    colorMode,
    onColorModeChange,
    userName: userProfile?.name,
    userRole: userProfile?.role,
    onEditProfile: () => setShowOnboarding(true),
  };

  if (activeView === 'docs') {
    return <DocsLayout {...sidebarProps} voiceAppState={appState} />;
  }

  if (activeView === 'how-it-works') {
    return <HowItWorksLayout {...sidebarProps} />;
  }

  if (activeView === 'compliance-tests') {
    return <ComplianceTestRunner />;
  }

  return (
    <MainLayout
      {...sidebarProps}
      userProfile={userProfile}
      onOnboardingComplete={handleOnboardingComplete}
      filteredMessages={filteredMessages}
      onSendMessage={handleSendChatMessage}
      voiceSupported={voiceSupported}
      appState={appState}
      transcript={transcript}
      streamingAIResponse={streamingAIResponse}
      audioAnalyzerRef={audioAnalyzerRef}
      onToggleConversation={handleToggleConversation}
      onModeChange={handleModeChange}
      editingMessageId={editingMessageId}
      editValue={editValue}
      onEditChange={setEditValue}
      onStartEdit={handleStartEdit}
      onCancelEdit={handleCancelEdit}
      onSubmitEdit={handleSubmitEdit}
      onVersionChange={handleVersionChange}
      onLike={handleLike}
      onDislike={handleDislike}
      onTryAgain={handleTryAgain}
      dislikeModalMessageId={dislikeModalMessageId}
      onDislikeModalSubmit={handleDislikeModalSubmit}
      onDislikeModalClose={handleDislikeModalClose}
      showTrustPanel={showTrustPanel}
      onTrustPanelClose={() => {
        setShowTrustPanel(false);
        setSelectedMessageForTrust(null);
      }}
      selectedMessageForTrustPanel={selectedMessageForTrustPanel}
      isAutoFixing={isAutoFixing}
      onTrustBadgeClick={handleTrustBadgeClick}
      onAutoFix={handleAutoFix}
      onAcceptAutoFix={handleAcceptAutoFix}
      onMessageFeedback={handleMessageFeedback}
      onSaveAsExample={handleSaveAsExample}
      onStopGeneration={handleStopGeneration}
    />
  );
}

export default App;
