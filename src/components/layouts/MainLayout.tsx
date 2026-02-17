/**
 * MainLayout -- primary chat/voice view with sidebar, chat panel,
 * settings panel, trust panel, onboarding, and error toast.
 *
 * Reads from conversationStore + uiStore + useProject directly.
 * Receives hook-provided handlers and voice/chat state as props.
 */

import type React from 'react';
import type { RefObject } from 'react';
import { useShallow } from 'zustand/shallow';
import type {
  ColorMode,
  AppError,
  ChatMode,
  ChatMessage,
  SendMessageOptions,
  SendMessageResult,
  FeedbackPayload,
} from '../../types';
import { AppState } from '../../types';
import { featureFlags } from '../../services/featureFlags';
import {
  ProjectSidebar,
  ChatPanel,
  ErrorBoundary,
  ModelSelector,
  AIOrb,
  DSIcon,
  ContentContextSelector,
  TrustContextPanel,
  AdvancedSettingsPanel,
} from '../../components';
import OnboardingModal from '../../components/OnboardingModal';
import type { UserProfile } from '../../components/OnboardingModal';
import { useThemeColors } from '../../theme';
import { useProject } from '../../context/ProjectContext';
import { useConversationStore } from '../../stores/conversationStore';
import { useUIStore } from '../../stores/uiStore';

// ── Props Interface ───────────────────────────────────────────────────

export interface MainLayoutProps {
  // App-level props (not in stores)
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  userProfile: UserProfile | null;
  onOnboardingComplete: (profile: UserProfile) => void;

  // Chat data (from useChatPersistence via App.tsx)
  filteredMessages: ChatMessage[];

  // Generation handler (from useContentGeneration)
  onSendMessage: (
    message: string,
    options?: SendMessageOptions,
  ) => Promise<(SendMessageResult & { aiMessageId?: string }) | null>;

  // Voice state (from useVoiceConversation -- NOT in store)
  voiceSupported: boolean | null;
  appState: typeof AppState[keyof typeof AppState];
  transcript: string;
  streamingAIResponse: string;
  audioAnalyzerRef: RefObject<AnalyserNode | null>;
  onToggleConversation: () => void;
  onModeChange: (mode: ChatMode) => void;

  // Message interactions (from useMessageInteractions)
  editingMessageId: string | null;
  editValue: string;
  onEditChange: (value: string) => void;
  onStartEdit: (id: string, content: string) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (messageId: string, newContent: string) => void;
  onVersionChange: (messageId: string, versionIndex: number) => void;
  onLike: (messageId: string) => void;
  onDislike: (messageId: string) => void;
  onTryAgain: (messageId: string) => void;
  dislikeModalMessageId: string | null;
  onDislikeModalSubmit: (reasons: string[], comment: string) => void;
  onDislikeModalClose: () => void;

  // Trust panel (from useTrustPanel)
  showTrustPanel: boolean;
  onTrustPanelClose: () => void;
  selectedMessageForTrustPanel: ChatMessage | null;
  isAutoFixing: boolean;
  onTrustBadgeClick: (messageId: string) => void;
  onAutoFix: () => void;
  onAcceptAutoFix: (messageId: string) => void;

  // Feedback + learning
  onMessageFeedback: (payload: FeedbackPayload) => void;
  onSaveAsExample: (content: string) => void;

  // Stop generation
  onStopGeneration: () => void;
}

// ── Component ─────────────────────────────────────────────────────────

export function MainLayout({
  colorMode,
  onColorModeChange,
  userProfile,
  onOnboardingComplete,
  filteredMessages,
  onSendMessage,
  voiceSupported,
  appState,
  transcript,
  streamingAIResponse,
  audioAnalyzerRef,
  onToggleConversation,
  onModeChange,
  editingMessageId,
  editValue,
  onEditChange,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onVersionChange,
  onLike,
  onDislike,
  onTryAgain,
  dislikeModalMessageId,
  onDislikeModalSubmit,
  onDislikeModalClose,
  showTrustPanel,
  onTrustPanelClose,
  selectedMessageForTrustPanel,
  isAutoFixing,
  onTrustBadgeClick,
  onAutoFix,
  onAcceptAutoFix,
  onMessageFeedback,
  onSaveAsExample,
  onStopGeneration,
}: MainLayoutProps) {
  const theme = useThemeColors();

  // Read from stores directly (no props needed)
  const {
    ecosystem, setEcosystem,
    contentChannel, setContentChannel,
    trustSettings, setTrustSettings,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    streamResponse, setStreamResponse,
    isChatLoading,
    selectedLLMProvider, setSelectedLLMProvider,
    selectedTTSProvider, setSelectedTTSProvider,
    selectedTalkLLMProvider, setSelectedTalkLLMProvider,
  } = useConversationStore(useShallow((s) => ({
    ecosystem: s.ecosystem, setEcosystem: s.setEcosystem,
    contentChannel: s.contentChannel, setContentChannel: s.setContentChannel,
    trustSettings: s.trustSettings, setTrustSettings: s.setTrustSettings,
    temperature: s.temperature, setTemperature: s.setTemperature,
    maxTokens: s.maxTokens, setMaxTokens: s.setMaxTokens,
    streamResponse: s.streamResponse, setStreamResponse: s.setStreamResponse,
    isChatLoading: s.isChatLoading,
    selectedLLMProvider: s.selectedLLMProvider, setSelectedLLMProvider: s.setSelectedLLMProvider,
    selectedTTSProvider: s.selectedTTSProvider, setSelectedTTSProvider: s.setSelectedTTSProvider,
    selectedTalkLLMProvider: s.selectedTalkLLMProvider, setSelectedTalkLLMProvider: s.setSelectedTalkLLMProvider,
  })));

  const {
    chatMode,
    isConfigPanelCollapsed, setConfigPanelCollapsed,
    showOnboarding, setShowOnboarding,
    error, setError,
    setActiveView,
  } = useUIStore(useShallow((s) => ({
    chatMode: s.chatMode,
    isConfigPanelCollapsed: s.isConfigPanelCollapsed, setConfigPanelCollapsed: s.setConfigPanelCollapsed,
    showOnboarding: s.showOnboarding, setShowOnboarding: s.setShowOnboarding,
    error: s.error, setError: s.setError,
    setActiveView: s.setActiveView,
  })));

  const {
    activeProject,
    updateProjectVoiceGender,
    updateProjectConfig,
    updateProjectDefaultEcosystem,
    updateProjectDefaultChannel,
    updateProjectDefaultLanguage,
    updateProjectDefaultRegion,
  } = useProject();

  if (!activeProject) return null;

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
              <div className="voice-panel px-4 py-6 flex flex-col items-center gap-4 relative">
                <AIOrb
                  state={appState}
                  audioAnalyzer={audioAnalyzerRef.current}
                  onClick={onToggleConversation}
                  size={105}
                  disabled={false}
                />
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
              <ChatPanel
                messages={filteredMessages}
                onSendMessage={onSendMessage}
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
                onVoiceClick={() => onModeChange(chatMode === 'voice' ? 'copy' : 'voice')}
                voiceSupported={voiceSupported ?? true}
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
                onTrustBadgeClick={onTrustBadgeClick}
                onMessageFeedback={onMessageFeedback}
                onSaveAsExample={onSaveAsExample}
                onLike={onLike}
                onDislike={onDislike}
                onTryAgain={onTryAgain}
                editingMessageId={editingMessageId}
                editValue={editValue}
                onStartEdit={onStartEdit}
                onEditChange={onEditChange}
                onSubmitEdit={onSubmitEdit}
                onCancelEdit={onCancelEdit}
                onVersionChange={onVersionChange}
                onStopGeneration={onStopGeneration}
                dislikeModalMessageId={dislikeModalMessageId}
                onDislikeModalSubmit={onDislikeModalSubmit}
                onDislikeModalClose={onDislikeModalClose}
                onAcceptAutoFix={onAcceptAutoFix}
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
        onClose={onTrustPanelClose}
        trustScore={selectedMessageForTrustPanel?.trustScore}
        generationContext={selectedMessageForTrustPanel?.generationContext}
        analyzedContent={selectedMessageForTrustPanel?.content}
        onAutoFix={onAutoFix}
        autoFixAvailable={
          !isAutoFixing &&
          (selectedMessageForTrustPanel?.trustScore?.autoFixableCount ?? 0) > 0
        }
        evidence={selectedMessageForTrustPanel?.evidence}
      />

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={onOnboardingComplete}
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
