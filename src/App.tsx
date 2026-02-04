import { useState, useRef, useEffect, useCallback } from 'react';
import type { 
  ActiveView, 
  ActiveTab, 
  ColorMode,
  AppError 
} from './types';
import { VoiceGender, AppState } from './types';
import { getSystemInstruction, AUDIO_CONFIG } from './constants';
import { 
  ConfigPanel, 
  AudioPlayer, 
  StatusIndicator, 
  DocumentationPanel,
  SoundWave,
  ProjectSidebar,
  SaveAudioModal
} from './components';
import {
  TwConfigPanel,
  TwAudioPlayer,
  TwDocumentationPanel,
  TwButton,
  TwTextArea,
  TwSegmentedControl,
  TwSegmentedControlItem
} from './components/tailwind';
import { 
  createTTSProvider, 
  createConversationProvider,
  type TTSProvider,
  type ConversationProvider 
} from './services/providers';
import { createAudioContext } from './services/audioUtils';
import { validateConfig } from './config/providers';
import { useThemeColors } from './theme';
import { useDesignSystem } from './context/DesignSystemContext';
import { useProject } from './context/ProjectContext';
import { useAudioLibrary } from './context/AudioLibraryContext';
import { TextArea, Button, SegmentedControl, SegmentedControlItem } from '@marcelinodzn/ds-react';

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
  const { activeProject, updateProjectConfig, updateProjectVoiceGender } = useProject();
  const { saveAudio } = useAudioLibrary();
  
  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('tts');
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [error, setError] = useState<AppError | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<AudioBuffer | null>(null);
  const [lastGeneratedVoice, setLastGeneratedVoice] = useState<string>('');

  // Conversation State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscript] = useState('');

  // Refs for audio handling
  const ttsProviderRef = useRef<TTSProvider | null>(null);
  const conversationProviderRef = useRef<ConversationProvider | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Inject CSS variables for local tokens
  useEffect(() => {
    document.documentElement.style.setProperty('--local-white', theme.local.white);
  }, [theme.local.white]);

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

  // Handle save audio to library
  const handleSaveAudio = (name: string) => {
    if (!generatedAudio || !activeProject) return;

    try {
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
      setShowSaveModal(false);
      // Don't clear the generated audio so user can still play it
    } catch (err) {
      console.error('Error saving audio:', err);
      setError({
        code: 'SAVE_ERROR',
        message: 'Failed to save audio to library',
      });
    }
  };

  // Handle microphone access and start conversation
  const handleStartConversation = async () => {
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
            if (isFinal) {
              console.log('Final transcript:', text);
            }
          },
          onResponse: (text) => {
            console.log('AI response:', text);
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
      setError({
        code: 'START_ERROR',
        message: err instanceof Error ? err.message : 'Failed to start conversation',
      });
    }
  };

  // Handle stop conversation
  const handleStopConversation = () => {
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

    setAppState(AppState.IDLE);
    setTranscript('');
  };

  // Toggle conversation
  const handleToggleConversation = () => {
    if (appState === AppState.IDLE || appState === AppState.ERROR) {
      handleStartConversation();
    } else {
      handleStopConversation();
    }
  };

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
        <ProjectSidebar />
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
          disabled={appState !== AppState.IDLE}
        />
      </div>
    );
  }

  // Render main view
  const ConfigPanelComponent = designSystem === 'jio' ? ConfigPanel : TwConfigPanel;
  const ButtonComponent = designSystem === 'jio' ? Button : TwButton;
  const TextAreaComponent = designSystem === 'jio' ? TextArea : TwTextArea;
  const SegmentedControlComponent = designSystem === 'jio' ? SegmentedControl : TwSegmentedControl;
  const SegmentedControlItemComponent = designSystem === 'jio' ? SegmentedControlItem : TwSegmentedControlItem;
  const AudioPlayerComponent = designSystem === 'jio' ? AudioPlayer : TwAudioPlayer;
  
  return (
    <div 
      className="flex h-screen"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Left Sidebar - Projects */}
      <ProjectSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex items-center justify-center p-3">
          <SegmentedControlComponent
            value={activeTab}
            onChange={(value) => setActiveTab(value as ActiveTab)}
            size="S"
            aria-label="Mode selection"
          >
            <SegmentedControlItemComponent value="tts">Text-to-Speech</SegmentedControlItemComponent>
            <SegmentedControlItemComponent value="talk">Tap-to-Talk</SegmentedControlItemComponent>
          </SegmentedControlComponent>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto">
            {activeTab === 'tts' ? (
              /* TTS Mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px' }}>
                  <h2 
                    style={{ 
                      color: theme.text.high,
                      fontSize: '16px',
                      fontWeight: 600,
                      lineHeight: '24px',
                      marginBottom: '12px'
                    }}
                  >
                    Generate Speech
                  </h2>
                  
                  {/* Text input */}
                  <div className={designSystem === 'jio' ? 'scaled-textarea-wrapper' : ''}>
                    <TextAreaComponent
                      value={ttsText}
                      onChange={(value: string) => setTtsText(value)}
                      placeholder="Enter text to convert to speech..."
                      rows={3}
                      size="S"
                    />
                  </div>

                  {/* Generate button */}
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <ButtonComponent
                      onPress={handleGenerateTTS}
                      isDisabled={isTtsLoading || !ttsText.trim()}
                      appearance="primary"
                      size="S"
                      aria-label="Generate speech from text"
                    >
                      {isTtsLoading ? 'Generating...' : 'Generate'}
                    </ButtonComponent>
                  </div>
                </div>

                {/* Audio Player */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h2 
                      style={{ 
                        color: theme.text.high,
                        fontSize: '16px',
                        fontWeight: 600,
                        lineHeight: '24px',
                      }}
                    >
                      Audio Output
                    </h2>
                    {generatedAudio && (
                      <button
                        onClick={() => setShowSaveModal(true)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: '#f97316',
                          color: 'white',
                        }}
                      >
                        Save to Library
                      </button>
                    )}
                  </div>
                  <AudioPlayerComponent audioBuffer={generatedAudio} />
                </div>
              </div>
            ) : (
              /* Talk Mode */
              <div className="space-y-4">
                <div 
                  className="rounded-xl p-4"
                  style={{ 
                    backgroundColor: theme.isLight ? '#f5f5f5' : '#18181b',
                    border: `1px solid ${theme.stroke.low}`
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 
                      className="text-base font-semibold"
                      style={{ color: theme.text.high }}
                    >
                      Voice Conversation
                    </h2>
                    <StatusIndicator state={appState} />
                  </div>

                  {/* Microphone button */}
                  <div className="flex flex-col items-center py-6">
                    <button
                      onClick={handleToggleConversation}
                      className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform"
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
                          ? '4px solid #fdba74'
                          : appState === AppState.SPEAKING
                          ? '4px solid #fed7aa'
                          : '4px solid #93c5fd',
                        transform: appState === AppState.LISTENING ? 'scale(1.1)' : 'scale(1)',
                        ...(appState === AppState.ERROR && { borderColor: '#ef4444' })
                      }}
                    >
                      {appState === AppState.CONNECTING ? (
                        <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : appState === AppState.IDLE || appState === AppState.ERROR ? (
                        <svg 
                          className="w-8 h-8" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          style={{ color: appState === AppState.ERROR ? '#ef4444' : theme.text.medium }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      )}
                    </button>

                    {/* Sound wave animation */}
                    <div className="mt-4 h-8">
                      <SoundWave state={appState} />
                    </div>

                    {/* Instructions */}
                    <p 
                      className="mt-3 text-xs text-center"
                      style={{ color: theme.text.low }}
                    >
                      {appState === AppState.IDLE
                        ? 'Tap the microphone to start a conversation'
                        : appState === AppState.CONNECTING
                        ? 'Connecting...'
                        : appState === AppState.LISTENING
                        ? 'Listening... speak now'
                        : appState === AppState.SPEAKING
                        ? 'AI is responding...'
                        : 'An error occurred. Tap to retry.'}
                    </p>
                  </div>

                  {/* Transcript */}
                  {transcript && (
                    <div 
                      className="mt-3 p-3 rounded-lg"
                      style={{ backgroundColor: theme.isLight ? '#ffffff' : '#09090b' }}
                    >
                      <p 
                        className="text-xs mb-1"
                        style={{ color: theme.text.low }}
                      >
                        You said:
                      </p>
                      <p 
                        className="text-sm"
                        style={{ color: theme.text.high }}
                      >
                        {transcript}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
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
        disabled={appState !== AppState.IDLE && activeTab === 'talk'}
      />

      {/* Save Audio Modal */}
      <SaveAudioModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveAudio}
        defaultName={ttsText.slice(0, 30) + (ttsText.length > 30 ? '...' : '')}
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
