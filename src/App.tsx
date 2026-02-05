import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { 
  ActiveView, 
  ColorMode,
  AppError,
  ChatMessage,
  ChatMode,
} from './types';
import { 
  VoiceGender, 
  AppState,
  createTextMessage,
  createAudioMessage,
} from './types';
import { getSystemInstruction, AUDIO_CONFIG, getCopySystemPrompt } from './constants';
import { 
  ConfigPanel, 
  AudioPlayer, 
  StatusIndicator, 
  DocumentationPanel,
  SoundWave,
  ProjectSidebar,
  SaveAudioModal,
  UsageModal,
  ChatPanel,
  ErrorBoundary,
  ModelSelector,
  TTSProviderSelector,
  DesignSystemLibrary,
  LibraryPage,
  ChannelSelector,
  PlatformSelector,
} from './components';
import type { TTSProviderType } from './components';
import { useChatPersistence, useNetworkStatus } from './hooks';
import { audioBufferManager } from './services/audioBufferManager';
import {
  TwConfigPanel,
  TwAudioPlayer,
  TwDocumentationPanel,
  TwButton,
  TwTextArea,
  TwChatPanel
} from './components/tailwind';
import { 
  createTTSProvider, 
  createConversationProvider,
  type TTSProvider,
  type ConversationProvider 
} from './services/providers';
import { getOrchestratorInstance } from './services/llm/orchestrator';
import { getDefaultLLMProviderType, createLLMProvider, type LLMProviderType } from './services/providers/llm';
import { createAudioContext, checkAudioSupport } from './services/audioUtils';
import { validateConfig } from './config/providers';
import { useThemeColors } from './theme';
import { useDesignSystem } from './context/DesignSystemContext';
import { useProject } from './context/ProjectContext';
import { useAudioLibrary } from './context/AudioLibraryContext';
import { useAbortController } from './hooks';
import { TextArea, Button } from '@marcelinodzn/ds-react';

// Storage key for chat mode persistence
const CHAT_MODE_STORAGE_KEY = 'voiceDesigner_chatMode';

interface AppProps {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

function App({ colorMode, onColorModeChange }: AppProps) {
  // Design system context
  const { designSystem } = useDesignSystem();
  
  // Theme colors from DS tokens
  const theme = useThemeColors();
  
  // Project context
  const { activeProject, updateProjectConfig, updateProjectVoiceGender, updateProjectChannel, updateProjectPlatform } = useProject();
  const { saveAudio } = useAudioLibrary();
  
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [audioToSave, setAudioToSave] = useState<{ messageId: string; audioData: string; transcript: string } | null>(null);
  const [isConfigPanelCollapsed, setIsConfigPanelCollapsed] = useState(true);
  const [showUsageModal, setShowUsageModal] = useState(false);
  
  // Voice feature support detection
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);

  // TTS State (for standalone TTS generation within voice mode)
  const [ttsText, setTtsText] = useState('');
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<AudioBuffer | null>(null);
  const [lastGeneratedVoice, setLastGeneratedVoice] = useState<string>('');

  // Conversation State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscript] = useState('');

  // Chat Persistence - automatically syncs with localStorage
  const {
    messages: chatMessages,
    setMessages: setChatMessages,
    addMessage,
    storageWarning,
    isLoaded: isChatLoaded,
    forceSave,
  } = useChatPersistence(activeProject?.id || null);
  
  // Network status for offline detection
  const { isOnline, offlineDuration } = useNetworkStatus({
    onReconnect: () => console.log('[App] Network reconnected'),
    onDisconnect: () => console.log('[App] Network disconnected'),
  });

  // Chat/Generation State
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedLLMProvider, setSelectedLLMProvider] = useState<LLMProviderType>(getDefaultLLMProviderType());
  const [selectedTTSProvider, setSelectedTTSProvider] = useState<TTSProviderType>('dashscope');
  const [selectedTalkLLMProvider, setSelectedTalkLLMProvider] = useState<LLMProviderType>('qwen-text');
  
  // Filter messages by current mode
  const filteredMessages = useMemo(() => {
    return chatMessages.filter(m => m.sourceMode === chatMode);
  }, [chatMessages, chatMode]);

  // Request cancellation - use getSignal() to get fresh signal after reset
  const { abort: abortChat, reset: resetChatAbort, getSignal: getChatAbortSignal } = useAbortController();

  // Refs for audio handling
  const ttsProviderRef = useRef<TTSProvider | null>(null);
  const conversationProviderRef = useRef<ConversationProvider | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Refs for conversation turn tracking (to link user message to AI response)
  const currentTurnRef = useRef<{
    userMessageId: string | null;
    responseText: string;
  }>({ userMessageId: null, responseText: '' });

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
  const handleSendChatMessage = useCallback(async (message: string) => {
    // Reset abort controller for new request
    resetChatAbort();

    // Create user message with new format
    const userMessage = createTextMessage('user', message, chatMode);
    addMessage(userMessage);
    setIsChatLoading(true);
    setError(null);

    try {
      // Build messages with system prompt and history (use all messages for context, not filtered)
      // Include channel and platform context from active project
      const systemPrompt = getCopySystemPrompt(
        undefined, 
        activeProject?.channel, 
        activeProject?.platform
      );
      const contextMessages = chatMessages
        .filter(m => m.type === 'text') // Only use text messages for context
        .slice(-20); // Limit context to last 20 messages
      
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
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
          maxTokens: 1000,
          temperature: 0.7,
          signal: getChatAbortSignal(), // Get fresh signal after reset
        },
        createLLMProvider
      );

      // Create AI response with new format
      const aiMessage = createTextMessage('assistant', result.content, chatMode, userMessage.id);
      addMessage(aiMessage);
    } catch (err) {
      // Don't show error if request was cancelled
      if ((err as Error).name === 'AbortError' || (err as Error).message?.includes('cancelled')) {
        console.log('Chat request cancelled');
        return;
      }
      
      console.error('Chat error:', err);
      setError({
        code: 'CHAT_ERROR',
        message: err instanceof Error ? err.message : 'Failed to send message',
      });
    } finally {
      setIsChatLoading(false);
    }
  }, [resetChatAbort, chatMode, addMessage, chatMessages, selectedLLMProvider, getChatAbortSignal]);

  // Cancel ongoing chat request
  const handleCancelChat = useCallback(() => {
    abortChat();
    setIsChatLoading(false);
  }, [abortChat]);

  // Auto-dismiss error
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Get TTS provider
  const getTTSProvider = useCallback((): TTSProvider => {
    if (!ttsProviderRef.current) {
      ttsProviderRef.current = createTTSProvider();
    }
    return ttsProviderRef.current;
  }, []);

  // Handle TTS generation
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) {
      setError({ code: 'NO_TEXT', message: 'Please enter some text to generate' });
      return;
    }

    if (!activeProject) {
      setError({ code: 'NO_PROJECT', message: 'No active project' });
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

    setIsTtsLoading(true);
    setError(null);

    try {
      const provider = getTTSProvider();
      const voice = provider.getDefaultVoice(activeProject.voiceGender === VoiceGender.FEMALE ? 'female' : 'male');
      
      const audioBuffer = await provider.synthesize(ttsText, {
        voice,
        format: 'mp3',
        sampleRate: AUDIO_CONFIG.alibabaOutputSampleRate,
      });

      setGeneratedAudio(audioBuffer);
      setLastGeneratedVoice(voice);
    } catch (err) {
      console.error('TTS generation error:', err);
      setError({
        code: 'TTS_ERROR',
        message: err instanceof Error ? err.message : 'Failed to generate audio',
      });
    } finally {
      setIsTtsLoading(false);
    }
  };

  // Handle save audio to library (from TTS generation or chat audio message)
  const handleSaveAudio = useCallback(async (name: string) => {
    if (!activeProject) return;

    try {
      // If saving from chat message
      if (audioToSave) {
        // Convert base64 to AudioBuffer
        const buffer = await audioBufferManager.fromBase64(
          audioToSave.audioData,
          24000,
          `save-${audioToSave.messageId}`
        );
        
        saveAudio(
          activeProject.id,
          name,
          audioToSave.transcript,
          buffer,
          {
            gender: activeProject.voiceGender,
            voice: lastGeneratedVoice || 'default',
          }
        );
        setAudioToSave(null);
      } 
      // If saving from TTS generation
      else if (generatedAudio) {
        saveAudio(
          activeProject.id,
          name,
          ttsText,
          generatedAudio,
          {
            gender: activeProject.voiceGender,
            voice: lastGeneratedVoice,
          }
        );
      }
      
      setShowSaveModal(false);
    } catch (err) {
      console.error('Error saving audio:', err);
      setError({
        code: 'SAVE_ERROR',
        message: 'Failed to save audio to library',
      });
    }
  }, [activeProject, audioToSave, generatedAudio, ttsText, lastGeneratedVoice, saveAudio]);

  // Handle save audio from chat message
  const handleSaveAudioFromChat = useCallback((messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (message?.audioData) {
      setAudioToSave({
        messageId: message.id,
        audioData: message.audioData,
        transcript: message.content,
      });
      setShowSaveModal(true);
    }
  }, [chatMessages]);

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
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_CONFIG.inputSampleRate,
          channelCount: AUDIO_CONFIG.channels,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Create audio context for input
      inputAudioContextRef.current = createAudioContext(AUDIO_CONFIG.inputSampleRate);

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

      // Set up audio processing
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

      source.connect(processor);
      processor.connect(inputAudioContextRef.current.destination);

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

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
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
    const ConfigPanelComponent = designSystem === 'jio' ? ConfigPanel : TwConfigPanel;
    const DocPanelComponent = designSystem === 'jio' ? DocumentationPanel : TwDocumentationPanel;
    
    return (
      <div 
        className="flex h-screen"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <ProjectSidebar 
          onNavigateToLibrary={() => setActiveView('library')}
          isLibraryActive={false}
          onNavigateToUsage={() => setShowUsageModal(true)}
          onProjectSelect={() => setActiveView('main')}
        />
        <main className="flex-1 overflow-hidden">
          <DocPanelComponent onBack={() => setActiveView('main')} />
        </main>
        <ConfigPanelComponent
          voiceGender={activeProject.voiceGender}
          onVoiceGenderChange={updateProjectVoiceGender}
          config={activeProject.config}
          onConfigChange={updateProjectConfig}
          colorMode={colorMode}
          onColorModeChange={onColorModeChange}
          onShowDocs={() => setActiveView('docs')}
          onShowDesignSystem={() => setActiveView('design-system')}
          disabled={appState !== AppState.IDLE}
          isCollapsed={isConfigPanelCollapsed}
          onToggleCollapse={() => setIsConfigPanelCollapsed(!isConfigPanelCollapsed)}
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

  // Render audio library view
  if (activeView === 'library') {
    const ConfigPanelComponent = designSystem === 'jio' ? ConfigPanel : TwConfigPanel;
    
    return (
      <div 
        className="flex h-screen"
        style={{ backgroundColor: theme.background.ghost }}
      >
        <ProjectSidebar 
          onNavigateToLibrary={() => setActiveView('library')}
          isLibraryActive={true}
          onNavigateToUsage={() => setShowUsageModal(true)}
          onProjectSelect={() => setActiveView('main')}
        />
        <main className="flex-1 overflow-hidden">
          <LibraryPage onBack={() => setActiveView('main')} />
        </main>
        <ConfigPanelComponent
          voiceGender={activeProject.voiceGender}
          onVoiceGenderChange={updateProjectVoiceGender}
          config={activeProject.config}
          onConfigChange={updateProjectConfig}
          colorMode={colorMode}
          onColorModeChange={onColorModeChange}
          onShowDocs={() => setActiveView('docs')}
          onShowDesignSystem={() => setActiveView('design-system')}
          disabled={appState !== AppState.IDLE}
          isCollapsed={isConfigPanelCollapsed}
          onToggleCollapse={() => setIsConfigPanelCollapsed(!isConfigPanelCollapsed)}
        />
      </div>
    );
  }

  // Render main view
  const ConfigPanelComponent = designSystem === 'jio' ? ConfigPanel : TwConfigPanel;
  const ChatPanelComponent = designSystem === 'jio' ? ChatPanel : TwChatPanel;
  
  return (
    <div 
      className="flex h-screen"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Left Sidebar - Projects */}
      <ProjectSidebar 
        onNavigateToLibrary={() => setActiveView('library')}
        isLibraryActive={false}
        onNavigateToUsage={() => setShowUsageModal(true)}
        onProjectSelect={() => setActiveView('main')}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden items-center">
        <div className="w-full max-w-[1200px] flex flex-col h-full">
          {/* Header with Status and Usage Stats */}
          <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1 flex items-center gap-2">
            {/* Offline indicator */}
            {!isOnline && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  Offline {offlineDuration > 0 ? `(${offlineDuration}s)` : ''}
                </span>
              </div>
            )}
            {storageWarning && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <span className="text-xs text-amber-700 dark:text-amber-400">{storageWarning}</span>
              </div>
            )}
          </div>
        </div>

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
              {/* Header with Mode-specific Controls */}
              <div className="flex items-center justify-end px-4 py-2 border-b" style={{ borderColor: theme.stroke.low }}>
                <div className="flex items-center gap-2">
                  {chatMode === 'voice' && <StatusIndicator state={appState} />}
                  {isChatLoading && (
                    <button
                      onClick={handleCancelChat}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Voice Mode: Microphone Control + Chat History */}
              {chatMode === 'voice' && (
                <div 
                  className="px-4 py-3 border-b flex items-center justify-center gap-4 relative"
                  style={{ borderColor: theme.stroke.low, backgroundColor: theme.background.subtle }}
                >
                  {/* Close button - return to text mode */}
                  <button
                    onClick={() => handleModeChange('copy')}
                    className="absolute top-2 right-2 p-2 rounded-full transition-colors hover:opacity-80"
                    style={{ 
                      backgroundColor: theme.background.ghost,
                      color: theme.text.medium,
                    }}
                    aria-label="Close voice chat and return to text input"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  {/* Microphone button */}
                  <button
                    data-voice-mic-button
                    onClick={handleToggleConversation}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 transform"
                    style={{
                      backgroundColor: appState === AppState.IDLE || appState === AppState.ERROR
                        ? (theme.isLight ? '#f5f5f5' : '#27272a')
                        : appState === AppState.LISTENING
                        ? '#f97316'
                        : appState === AppState.SPEAKING
                        ? '#fb923c'
                        : '#3b82f6',
                      border: appState === AppState.IDLE || appState === AppState.ERROR
                        ? `2px solid ${theme.isLight ? '#e4e4e7' : '#3f3f46'}`
                        : appState === AppState.LISTENING
                        ? '3px solid #fdba74'
                        : appState === AppState.SPEAKING
                        ? '3px solid #fed7aa'
                        : '3px solid #93c5fd',
                      transform: appState === AppState.LISTENING ? 'scale(1.05)' : 'scale(1)',
                      ...(appState === AppState.ERROR && { borderColor: '#ef4444' })
                    }}
                    aria-label={
                      appState === AppState.IDLE ? 'Start voice conversation' :
                      appState === AppState.CONNECTING ? 'Connecting...' :
                      appState === AppState.LISTENING ? 'Listening - tap to stop' :
                      appState === AppState.SPEAKING ? 'AI speaking - tap to stop' :
                      'Error - tap to retry'
                    }
                  >
                    {appState === AppState.CONNECTING ? (
                      <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : appState === AppState.IDLE || appState === AppState.ERROR ? (
                      <svg 
                        className="w-6 h-6" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        style={{ color: appState === AppState.ERROR ? '#ef4444' : theme.text.medium }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    )}
                  </button>

                  {/* Sound wave animation */}
                  <div className="w-24">
                    <SoundWave state={appState} />
                  </div>

                  {/* Status text */}
                  <p 
                    className="text-xs"
                    style={{ color: theme.text.medium }}
                  >
                    {appState === AppState.IDLE
                      ? 'Tap mic to talk'
                      : appState === AppState.CONNECTING
                      ? 'Connecting...'
                      : appState === AppState.LISTENING
                      ? 'Listening...'
                      : appState === AppState.SPEAKING
                      ? 'Speaking...'
                      : 'Error'}
                  </p>

                  {/* Live transcript */}
                  {transcript && (
                    <div 
                      className="flex-1 max-w-xs px-3 py-1.5 rounded-lg text-sm truncate"
                      style={{ 
                        backgroundColor: theme.background.ghost,
                        color: theme.text.high,
                      }}
                    >
                      {transcript}
                    </div>
                  )}
                </div>
              )}

              {/* Chat Panel (shared for both modes) */}
              <div className="flex-1 overflow-hidden">
                <ChatPanelComponent
                  messages={filteredMessages}
                  onSendMessage={handleSendChatMessage}
                  isLoading={isChatLoading}
                  mode={chatMode}
                  placeholder={chatMode === 'copy' 
                    ? 'What do you want to know?' 
                    : 'Type a message or use the microphone...'}
                  onSaveAudio={handleSaveAudioFromChat}
                  emptyStateMessage={chatMode === 'copy'
                    ? 'Start a conversation to generate copy'
                    : 'Start a voice conversation or type a message'}
                  inputDisabled={chatMode === 'voice' && appState !== AppState.IDLE && appState !== AppState.ERROR}
                  id={`${chatMode}-panel`}
                  onVoiceClick={chatMode === 'copy' ? () => handleModeChange('voice') : undefined}
                  voiceSupported={voiceSupported ?? true}
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
                  channelSelector={
                    <ChannelSelector
                      value={activeProject.channel || 'sms'}
                      onChange={updateProjectChannel}
                      size="sm"
                      disabled={isChatLoading}
                    />
                  }
                  platformSelector={
                    <PlatformSelector
                      value={activeProject.platform || 'notifications'}
                      onChange={updateProjectPlatform}
                      size="sm"
                      disabled={isChatLoading}
                    />
                  }
                />
              </div>
            </div>
          </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Config Panel */}
      <ConfigPanelComponent
        voiceGender={activeProject.voiceGender}
        onVoiceGenderChange={updateProjectVoiceGender}
        config={activeProject.config}
        onConfigChange={updateProjectConfig}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        onShowDocs={() => setActiveView('docs')}
        onShowDesignSystem={() => setActiveView('design-system')}
        disabled={appState !== AppState.IDLE && chatMode === 'voice'}
        isCollapsed={isConfigPanelCollapsed}
        onToggleCollapse={() => setIsConfigPanelCollapsed(!isConfigPanelCollapsed)}
      />

      {/* Save Audio Modal */}
      <SaveAudioModal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setAudioToSave(null);
        }}
        onSave={handleSaveAudio}
        defaultName={
          audioToSave 
            ? audioToSave.transcript.slice(0, 30) + (audioToSave.transcript.length > 30 ? '...' : '')
            : ttsText.slice(0, 30) + (ttsText.length > 30 ? '...' : '')
        }
      />

      {/* Usage Modal */}
      <UsageModal
        isOpen={showUsageModal}
        onClose={() => setShowUsageModal(false)}
      />

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
