/**
 * useVoiceConversation -- voice state, refs, and handlers
 *
 * Extracted from App.tsx. Self-contained: manages all audio refs,
 * microphone access, noise suppression, and conversation lifecycle.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, VoiceGender, createTextMessage, createAudioMessage } from '../types';
import type { AppState as AppStateType, ChatMode, AppError } from '../types';
import { getSystemInstruction, AUDIO_CONFIG } from '../constants';
import { audioBufferManager } from '../services/audioBufferManager';
import {
  createTTSProvider,
  createConversationProvider,
  type TTSProvider,
  type ConversationProvider,
} from '../services/providers';
import { createAudioContext, checkAudioSupport } from '../services/audioUtils';
import { getNoiseSuppressionService, isNoiseSuppressionSupported, type NoiseSuppressionService } from '../services/audio';
import { validateConfig } from '../config/providers';

interface UseVoiceConversationParams {
  activeProject: {
    voiceGender?: string;
    config: {
      persona: { tone: string; pace: string; confidence: string; vibe: string; language: string };
      greeting: string;
      maxResponseLength: string;
    };
  } | null;
  addMessage: (msg: ReturnType<typeof createTextMessage>) => void;
  tryAutoRenameProject: (userText: string, responseText: string) => void;
}

export function useVoiceConversation({
  activeProject,
  addMessage,
  tryAutoRenameProject,
}: UseVoiceConversationParams) {
  // ── State ────────────────────────────────────────────────────────────
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [appState, setAppState] = useState<AppStateType>(AppState.IDLE);
  const [transcript, setTranscript] = useState('');
  const [streamingAIResponse, setStreamingAIResponse] = useState('');
  const [voiceError, setVoiceError] = useState<AppError | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────
  const ttsProviderRef = useRef<TTSProvider | null>(null);
  const conversationProviderRef = useRef<ConversationProvider | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioAnalyzerRef = useRef<AnalyserNode | null>(null);
  const noiseSuppressionRef = useRef<NoiseSuppressionService | null>(null);
  const currentTurnRef = useRef<{
    userMessageId: string | null;
    userText: string;
    responseText: string;
  }>({ userMessageId: null, userText: '', responseText: '' });

  // ── Effects ───────────────────────────────────────────────────────────

  // Feature detection for voice support
  useEffect(() => {
    const support = checkAudioSupport();
    setVoiceSupported(support.supported);
    if (!support.supported) {
      console.warn('[Voice] Voice not supported:', support.message);
    }
  }, []);

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

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleStopConversation = useCallback(() => {
    if (conversationProviderRef.current) {
      conversationProviderRef.current.disconnect();
      conversationProviderRef.current = null;
    }
    if (noiseSuppressionRef.current) {
      noiseSuppressionRef.current.disconnect();
      noiseSuppressionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.disconnect();
      audioAnalyzerRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    currentTurnRef.current = { userMessageId: null, userText: '', responseText: '' };
    setAppState(AppState.IDLE);
    setTranscript('');
  }, []);

  const handleStartConversation = async () => {
    if (appState !== AppState.IDLE && appState !== AppState.ERROR) {
      return;
    }

    const configValidation = validateConfig();
    if (!configValidation.valid) {
      setVoiceError({
        code: 'CONFIG_ERROR',
        message: configValidation.errors.join('. '),
      });
      return;
    }

    setAppState(AppState.CONNECTING);
    setVoiceError(null);
    setTranscript('');

    try {
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

      inputAudioContextRef.current = createAudioContext(AUDIO_CONFIG.inputSampleRate);

      const analyzer = inputAudioContextRef.current.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;
      audioAnalyzerRef.current = analyzer;

      const analyzerSource = inputAudioContextRef.current.createMediaStreamSource(stream);
      analyzerSource.connect(analyzer);

      const provider = createConversationProvider();
      conversationProviderRef.current = provider;

      const ttsProvider = createTTSProvider();
      const voice = ttsProvider.getDefaultVoice(
        activeProject?.voiceGender === VoiceGender.FEMALE ? 'female' : 'male'
      );
      const systemPrompt = getSystemInstruction(
        activeProject?.config || {
          persona: { tone: '', pace: 'medium', confidence: 'medium', vibe: 'warm', language: 'english' },
          greeting: '',
          maxResponseLength: 'short',
        }
      );

      await provider.connect(
        {
          voice,
          systemPrompt,
          persona: activeProject?.config.persona || {
            tone: '', pace: 'medium', confidence: 'medium', vibe: 'warm', language: 'english',
          },
          greeting: activeProject?.config.greeting || '',
          maxResponseLength: activeProject?.config.maxResponseLength || 'short',
        },
        {
          onStateChange: (state) => {
            switch (state) {
              case 'listening':
                setAppState(AppState.LISTENING);
                currentTurnRef.current = { userMessageId: null, userText: '', responseText: '' };
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
              const userMessage = createTextMessage('user', text, 'voice');
              addMessage(userMessage);
              currentTurnRef.current.userMessageId = userMessage.id;
              currentTurnRef.current.userText = text;
              setTimeout(() => setTranscript(''), 500);
            }
          },
          onResponse: (text) => {
            console.log('AI response:', text);
            currentTurnRef.current.responseText = text;
            setStreamingAIResponse(text);
          },
          onAudioReceived: (audioBuffer) => {
            console.log('Audio received:', audioBuffer.duration, 'seconds');
            const base64 = audioBufferManager.toBase64(audioBuffer);
            const aiMessage = createAudioMessage(
              'assistant',
              currentTurnRef.current.responseText || '(Audio response)',
              base64,
              audioBuffer.duration,
              audioBuffer.sampleRate,
              'voice',
              currentTurnRef.current.userMessageId || undefined,
            );
            addMessage(aiMessage);

            if (currentTurnRef.current.userText && currentTurnRef.current.responseText) {
              tryAutoRenameProject(currentTurnRef.current.userText, currentTurnRef.current.responseText);
            }

            setStreamingAIResponse('');
            currentTurnRef.current = { userMessageId: null, userText: '', responseText: '' };
          },
          onError: (err) => {
            console.error('Conversation error:', err);
            setVoiceError({
              code: 'CONVERSATION_ERROR',
              message: err.message,
            });
          },
        },
      );

      const source = inputAudioContextRef.current.createMediaStreamSource(stream);
      const processor = inputAudioContextRef.current.createScriptProcessor(
        AUDIO_CONFIG.bufferSize,
        AUDIO_CONFIG.channels,
        AUDIO_CONFIG.channels,
      );
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        provider.sendAudio(inputData);
      };

      if (isNoiseSuppressionSupported()) {
        try {
          console.log('[Voice] Initializing RNNoise noise suppression...');
          const noiseSuppression = getNoiseSuppressionService();
          await noiseSuppression.initialize(inputAudioContextRef.current);
          noiseSuppressionRef.current = noiseSuppression;
          noiseSuppression.connect(source, processor);
          processor.connect(inputAudioContextRef.current.destination);
          console.log('[Voice] Noise suppression enabled');
        } catch (nsError) {
          console.warn('[Voice] Failed to initialize noise suppression:', nsError);
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

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setVoiceError({
            code: 'PERMISSION_DENIED',
            message: 'Microphone access was denied. Please allow microphone access in your browser settings and try again.',
          });
          return;
        } else if (err.name === 'NotFoundError') {
          setVoiceError({
            code: 'NO_MICROPHONE',
            message: 'No microphone found. Please connect a microphone and try again.',
          });
          return;
        }
      }

      setVoiceError({
        code: 'START_ERROR',
        message: err instanceof Error ? err.message : 'Failed to start conversation',
      });
    }
  };

  const handleToggleConversation = useCallback(() => {
    if (appState === AppState.IDLE || appState === AppState.ERROR) {
      handleStartConversation();
    } else {
      handleStopConversation();
    }
  }, [appState]);

  const handleModeChange = useCallback((newMode: ChatMode, setChatMode: (mode: ChatMode) => void) => {
    if (appState !== AppState.IDLE && appState !== AppState.ERROR) {
      handleStopConversation();
    }
    setChatMode(newMode);
    requestAnimationFrame(() => {
      if (newMode === 'voice') {
        document.querySelector<HTMLButtonElement>('[data-voice-mic-button]')?.focus();
      } else {
        document.querySelector<HTMLTextAreaElement>('[data-chat-input]')?.focus();
      }
    });
  }, [appState, handleStopConversation]);

  return {
    // state
    voiceSupported,
    appState,
    transcript,
    streamingAIResponse,
    setStreamingAIResponse,
    voiceError,
    // refs (exposed for JSX that needs them, e.g., AIOrb)
    audioAnalyzerRef,
    // handlers
    handleStartConversation,
    handleStopConversation,
    handleToggleConversation,
    handleModeChange,
  };
}
