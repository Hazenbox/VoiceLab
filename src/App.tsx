import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { 
  ConversationConfig, 
  ActiveView, 
  ActiveTab, 
  ColorMode,
  AppError 
} from './types';
import { VoiceGender, AppState } from './types';
import { DEFAULT_CONFIG, getSystemInstruction, AUDIO_CONFIG } from './constants';
import { 
  ConfigPanel, 
  AudioPlayer, 
  StatusIndicator, 
  DocumentationPanel,
  SoundWave 
} from './components';
import { 
  createTTSProvider, 
  createConversationProvider,
  type TTSProvider,
  type ConversationProvider 
} from './services/providers';
import { createAudioContext, createBlob } from './services/audioUtils';
import { validateConfig, getTTSProviderType, getConversationProviderType } from './config/providers';

function App() {
  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('tts');
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [colorMode, setColorMode] = useState<ColorMode>('Light');
  const [error, setError] = useState<AppError | null>(null);

  // Configuration State
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(VoiceGender.FEMALE);
  const [config, setConfig] = useState<ConversationConfig>(DEFAULT_CONFIG);

  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<AudioBuffer | null>(null);

  // Conversation State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscript] = useState('');

  // Refs for audio handling
  const ttsProviderRef = useRef<TTSProvider | null>(null);
  const conversationProviderRef = useRef<ConversationProvider | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Apply theme
  useEffect(() => {
    if (colorMode === 'Dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [colorMode]);

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
      const voice = provider.getDefaultVoice(voiceGender === VoiceGender.FEMALE ? 'female' : 'male');
      
      const audioBuffer = await provider.synthesize(ttsText, {
        voice,
        format: 'mp3',
        sampleRate: AUDIO_CONFIG.alibabaOutputSampleRate,
      });

      setGeneratedAudio(audioBuffer);
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
      const voice = ttsProvider.getDefaultVoice(voiceGender === VoiceGender.FEMALE ? 'female' : 'male');
      const systemPrompt = getSystemInstruction(config);

      // Connect to conversation service
      await provider.connect(
        {
          voice,
          systemPrompt,
          persona: config.persona,
          greeting: config.greeting,
          maxResponseLength: config.maxResponseLength,
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

  // Render documentation view
  if (activeView === 'docs') {
    return (
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
        <ConfigPanel
          voiceGender={voiceGender}
          onVoiceGenderChange={setVoiceGender}
          config={config}
          onConfigChange={setConfig}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          onShowDocs={() => setActiveView('docs')}
          disabled={appState !== AppState.IDLE}
        />
        <main className="flex-1 overflow-hidden">
          <DocumentationPanel onBack={() => setActiveView('main')} />
        </main>
      </div>
    );
  }

  // Render main view
  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Config Panel */}
      <ConfigPanel
        voiceGender={voiceGender}
        onVoiceGenderChange={setVoiceGender}
        config={config}
        onConfigChange={setConfig}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        onShowDocs={() => setActiveView('docs')}
        disabled={appState !== AppState.IDLE && activeTab === 'talk'}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex items-center justify-center p-3">
          <div className="inline-flex bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5">
            <button
              onClick={() => setActiveTab('tts')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'tts'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Text-to-Speech
            </button>
            <button
              onClick={() => setActiveTab('talk')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === 'talk'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Tap-to-Talk
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto">
            {activeTab === 'tts' ? (
              /* TTS Mode */
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
                    Generate Speech
                  </h2>
                  
                  {/* Text input */}
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Enter text to convert to speech..."
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  {/* Generate button */}
                  <button
                    onClick={handleGenerateTTS}
                    disabled={isTtsLoading || !ttsText.trim()}
                    className="mt-3 w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-2"
                  >
                    {isTtsLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        Generate
                      </>
                    )}
                  </button>
                </div>

                {/* Audio Player */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">
                    Audio Output
                  </h2>
                  <AudioPlayer audioBuffer={generatedAudio} />
                </div>
              </div>
            ) : (
              /* Talk Mode */
              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                      Voice Conversation
                    </h2>
                    <StatusIndicator state={appState} />
                  </div>

                  {/* Microphone button */}
                  <div className="flex flex-col items-center py-6">
                    <button
                      onClick={handleToggleConversation}
                      className={`
                        w-20 h-20 rounded-full flex items-center justify-center
                        transition-all duration-300 transform
                        ${appState === AppState.IDLE || appState === AppState.ERROR
                          ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-2 border-zinc-300 dark:border-zinc-600'
                          : appState === AppState.LISTENING
                          ? 'bg-orange-500 scale-110 border-4 border-orange-300'
                          : appState === AppState.SPEAKING
                          ? 'bg-orange-400 border-4 border-orange-200 animate-pulse'
                          : 'bg-blue-500 border-4 border-blue-300'
                        }
                        ${appState === AppState.ERROR ? 'border-red-500' : ''}
                      `}
                    >
                      {appState === AppState.CONNECTING ? (
                        <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : appState === AppState.IDLE || appState === AppState.ERROR ? (
                        <svg className={`w-8 h-8 ${appState === AppState.ERROR ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 text-center">
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
                    <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        You said:
                      </p>
                      <p className="text-sm text-zinc-900 dark:text-white">
                        {transcript}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Provider Info */}
        <div className="bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-end px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Provider:</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {activeTab === 'tts' ? getTTSProviderType() : getConversationProviderType()}
              </span>
            </div>
          </div>
        </div>
      </main>

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
