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
  // Content Trust System components
  ContentContextSelector,
  TrustContextPanel,
  AdvancedSettingsPanel,
} from './components';
import type { TTSProviderType } from './components';
// Content Trust System services
import { buildPrompt } from './services/prompt';
import { buildGenerationContext } from './services/context';
import { runValidationPipeline } from './services/validation';
import { calculateTrustScore } from './services/trust';
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
import { initSyncService, getSyncService } from './services/sync/convexSync';
// Persona Engine (Phase 1)
import { getAutoConfig, type PersonaRole } from './services/persona';
// Feature Flags
import { featureFlags } from './services/featureFlags';
// Knowledge & Learning (Phase 2-3)
import {
  storeLocalCorrection,
  saveAsExample,
  getCodeDefaults,
  mergeLearnedCorrections,
  getLocalCorrections,
  type CorrectionEntry,
} from './services/knowledge';
import type { FeedbackPayload } from './components/MessageFeedback';

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
  
  // Initialize sync service on mount or when profile changes (gated by feature flag)
  useEffect(() => {
    if (!featureFlags.convexSync) return;

    const syncService = initSyncService();
    
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
    }

    return () => syncService.destroy();
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
  } = useChatPersistence(activeProject?.id || null);

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
      // =======================================================================
      // Content Trust System: Build Generation Context
      // =======================================================================
      const generationContext = buildGenerationContext({
        ecosystem,
        channel: contentChannel,
        userMessage: message,
        // Optional: add profile/timing if available from project
        userProfile: activeProject?.defaultUserProfile,
        // Phase 1: Pass persona role for prompt personality injection (gated)
        persona: featureFlags.persona ? userProfile?.role : undefined,
      });

      // Build knowledge + learning data for prompt injection (Phase 2-3, gated)
      let promptKnowledge: import('./services/knowledge').RetrievedKnowledge | undefined;
      if (featureFlags.knowledgeBase) {
        const baseKnowledge = getCodeDefaults(ecosystem, contentChannel);
        if (featureFlags.learning) {
          const localCorrections = getLocalCorrections(ecosystem, contentChannel);
          promptKnowledge = mergeLearnedCorrections(
            baseKnowledge,
            localCorrections,
            ecosystem,
            contentChannel,
          );
        } else {
          promptKnowledge = baseKnowledge;
        }
      }

      // Build comprehensive prompt using Content Trust System + Knowledge
      const { system: systemPrompt, context: finalContext } = buildPrompt(
        generationContext,
        message,
        promptKnowledge ? { knowledge: promptKnowledge } : {}
      );

      // Build messages with system prompt and history
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
          maxTokens: maxTokens,
          temperature: temperature,
          stream: streamResponse,
          signal: getChatAbortSignal(), // Get fresh signal after reset
        },
        createLLMProvider
      );

      // =======================================================================
      // Content Trust System: Validate and Score Content
      // =======================================================================
      let trustScore: TrustScore | undefined;
      let validationSummary: { passedCount: number; warningCount: number; errorCount: number; autoFixesApplied: number } | undefined;

      try {
        // Run validation on generated content
        const validationResult = await runValidationPipeline(result.content, finalContext);
        
        // Calculate trust score
        trustScore = calculateTrustScore(validationResult, trustSettings);
        
        // Create validation summary for quick display
        validationSummary = {
          passedCount: validationResult.agentResults.filter(r => r.passed).length,
          warningCount: validationResult.agentResults
            .flatMap(r => r.violations)
            .filter(v => v.severity === 'warning').length,
          errorCount: validationResult.agentResults
            .flatMap(r => r.violations)
            .filter(v => v.severity === 'error').length,
          autoFixesApplied: 0, // No auto-fixes applied by default
        };
      } catch (validationError) {
        // Log validation error but don't block message
        console.warn('Content validation failed:', validationError);
      }

      // Create AI response with trust data attached
      const aiMessage = {
        ...createTextMessage('assistant', result.content, chatMode, userMessage.id),
        trustScore,
        generationContext: finalContext,
        validationSummary,
      };
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
  }, [resetChatAbort, chatMode, addMessage, chatMessages, selectedLLMProvider, getChatAbortSignal, ecosystem, contentChannel, activeProject?.defaultUserProfile, trustSettings, temperature, maxTokens, streamResponse, userProfile]);

  // ========================================================================
  // Phase 3: Feedback & Learning Handlers
  // ========================================================================

  const handleMessageFeedback = useCallback((payload: FeedbackPayload) => {
    // Look up the original message to get its generation-time context
    const originalMessage = chatMessages.find(m => m.id === payload.messageId);
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
        ecosystem: feedbackEcosystem,
        channel: feedbackChannel,
        persona: userProfile?.role || '',
        timestamp: Date.now(),
      };
      storeLocalCorrection(correction);
    }

    // Sync to Convex via the sync service (gated by convex sync flag)
    if (featureFlags.convexSync) {
      const syncService = getSyncService();
      if (syncService) {
        syncService.logCorrection({
          messageContent: payload.originalContent,
          originalContent: payload.originalContent,
          editedContent: payload.editedContent,
          feedbackType: payload.feedbackType,
          comment: payload.comment,
          ecosystem: feedbackEcosystem,
          channel: feedbackChannel,
          persona: userProfile?.role || '',
        });
      }
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
                  placeholder="Ask or describe what you need..."
                  showEmptyState={chatMode !== 'voice'}
                  emptyStateMessage={chatMode === 'copy'
                    ? 'What would you like to create today?'
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
                  // Content Trust System: New context selector with settings toggle
                  contextSelector={
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
                  }
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  }
                  // Content Trust System: Trust badge click handler
                  onTrustBadgeClick={handleTrustBadgeClick}
                  // Phase 3: Feedback & Learning
                  onMessageFeedback={handleMessageFeedback}
                  onSaveAsExample={handleSaveAsExample}
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
