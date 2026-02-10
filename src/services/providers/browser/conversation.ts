/**
 * Browser Conversation Provider
 * Combines Web Speech API (ASR) + Any LLM (HTTP) + Any TTS (HTTP)
 * Works on Vercel without WebSocket support
 */

import type {
  ConversationProvider,
  ConversationState,
  ConversationCallbacks,
  ConversationSessionConfig,
  TTSProvider,
} from '../types';
import type { Voice } from '../../../types';
import { VoiceGender } from '../../../types';
import { ELEVENLABS_VOICES, getElevenLabsVoiceByGender, RESPONSE_LENGTH_WORDS } from '../../../constants';
import { WebSpeechASRClient, isWebSpeechSupported } from './webSpeechASR';
import { createTTSProvider } from '../index';
import { createLLMProvider, getDefaultLLMProviderType } from '../llm';
import type { LLMProvider } from '../llm/types';
import { createAudioContext } from '../../audioUtils';

/**
 * Browser Conversation Provider
 * Uses browser-native speech recognition + HTTP-based LLM and TTS
 */
export class BrowserConversationProvider implements ConversationProvider {
  readonly name = 'browser';
  readonly displayName = 'Browser (Web Speech API)';

  private _state: ConversationState = 'idle';
  private callbacks: ConversationCallbacks = {};
  private sessionConfig: ConversationSessionConfig | null = null;

  // Components
  private asrClient: WebSpeechASRClient | null = null;
  private ttsProvider: TTSProvider | null = null;
  private llmProvider: LLMProvider | null = null;
  private audioContext: AudioContext | null = null;

  // Conversation state
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private isProcessing = false;
  private abortController: AbortController | null = null;

  get state(): ConversationState {
    return this._state;
  }

  private setState(state: ConversationState): void {
    this._state = state;
    this.callbacks.onStateChange?.(state);
  }

  /**
   * Check if browser supports Web Speech API
   */
  isReady(): boolean {
    return isWebSpeechSupported();
  }

  /**
   * Connect and initialize the conversation session
   */
  async connect(
    sessionConfig: ConversationSessionConfig,
    callbacks: ConversationCallbacks
  ): Promise<void> {
    if (!this.isReady()) {
      throw new Error(
        'Speech recognition is not supported in this browser. ' +
        'Please use Chrome, Edge, or Safari.'
      );
    }

    this.sessionConfig = sessionConfig;
    this.callbacks = callbacks;
    this.conversationHistory = [];

    this.setState('connecting');

    try {
      // Initialize audio context for TTS playback
      this.audioContext = createAudioContext(24000);

      // Initialize TTS provider (uses configured provider from env)
      this.ttsProvider = createTTSProvider();

      // Initialize LLM provider (uses configured provider from env)
      const llmType = getDefaultLLMProviderType();
      this.llmProvider = createLLMProvider(llmType);
      console.log(`[BrowserConversation] Using LLM provider: ${llmType}`);

      // Initialize ASR client with callbacks
      this.asrClient = new WebSpeechASRClient({
        onTranscript: (text, isFinal) => this.handleTranscript(text, isFinal),
        onError: (error) => this.handleError(error),
        onStateChange: (state) => {
          if (state === 'listening') {
            this.setState('listening');
          } else if (state === 'error') {
            this.setState('error');
          }
        },
      });

      // Connect to ASR service (Web Speech API)
      await this.asrClient.connect();

      // Play greeting if configured
      if (sessionConfig.greeting) {
        await this.speakResponse(sessionConfig.greeting);
      }

      this.setState('listening');
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  /**
   * Send audio data - NO-OP for browser provider
   * Web Speech API captures audio directly from the microphone
   */
  sendAudio(_audioData: Float32Array): void {
    // No-op: Web Speech API handles audio capture internally
    // This method exists for interface compatibility
  }

  /**
   * Send text directly (for testing without audio)
   */
  async sendText(text: string): Promise<void> {
    if (this._state === 'idle' || this._state === 'error') {
      return;
    }

    this.callbacks.onTranscript?.(text, true);
    await this.processUserInput(text);
  }

  /**
   * Interrupt the current AI response
   */
  interrupt(): void {
    // Abort any ongoing LLM request
    this.abortController?.abort();
    this.abortController = null;

    // Stop any ongoing TTS playback
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = createAudioContext(24000);
    }

    this.isProcessing = false;
    this.setState('listening');
  }

  /**
   * Handle transcription results from ASR
   */
  private async handleTranscript(text: string, isFinal: boolean): Promise<void> {
    this.callbacks.onTranscript?.(text, isFinal);

    if (isFinal && text.trim().length > 0) {
      await this.processUserInput(text);
    }
  }

  /**
   * Process user input and generate response
   */
  private async processUserInput(text: string): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.setState('processing');

    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: text });

      // Generate response using LLM
      const response = await this.generateResponse(text);

      // Add assistant response to history
      this.conversationHistory.push({ role: 'assistant', content: response });

      // Notify callback
      this.callbacks.onResponse?.(response);

      // Speak the response
      await this.speakResponse(response);

      // Back to listening
      this.setState('listening');
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[BrowserConversation] Request aborted');
        this.setState('listening');
        return;
      }
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate response using configured LLM provider
   */
  private async generateResponse(_userMessage: string): Promise<string> {
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }

    // Cancel any in-flight request
    this.abortController?.abort();
    this.abortController = new AbortController();

    const maxWords = this.sessionConfig
      ? RESPONSE_LENGTH_WORDS[this.sessionConfig.maxResponseLength]
      : 30;

    const systemPrompt =
      this.sessionConfig?.systemPrompt ||
      `You are a friendly, knowledgeable voice assistant. You can discuss any topic. When asked about Jio services, be helpful and informed. Keep responses concise (max ${maxWords} words). Use natural Indian English.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.conversationHistory.slice(-10), // Keep last 10 messages for context
    ];

    try {
      console.log('[BrowserConversation] Generating response with LLM...');
      
      const result = await this.llmProvider.generate({
        messages,
        maxTokens: maxWords * 5,
        temperature: 0.7,
        signal: this.abortController.signal,
      });

      console.log('[BrowserConversation] LLM response received');
      return result.content || 'I apologize, I could not generate a response.';
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
      console.error('[BrowserConversation] LLM error:', error);
      throw error;
    }
  }

  /**
   * Speak the response using configured TTS provider
   */
  private async speakResponse(text: string): Promise<void> {
    if (!this.ttsProvider || !this.audioContext) {
      return;
    }

    this.setState('speaking');

    try {
      // Use the session voice or TTS provider's default
      const voice =
        this.sessionConfig?.voice ||
        this.ttsProvider.getDefaultVoice('female');

      console.log('[BrowserConversation] Synthesizing speech...');
      
      const audioBuffer = await this.ttsProvider.synthesize(text, {
        voice,
        format: 'mp3',
        sampleRate: 22050,
      });

      // Play the audio
      await this.playAudio(audioBuffer);

      // Notify callback
      this.callbacks.onAudioReceived?.(audioBuffer);
      
      console.log('[BrowserConversation] Speech playback complete');
    } catch (error) {
      console.error('[BrowserConversation] TTS error:', error);
      // Don't throw, just continue - we still want to return to listening
    }
  }

  /**
   * Play audio buffer through speakers
   */
  private playAudio(buffer: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioContext) {
        resolve();
        return;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      source.onended = () => {
        resolve();
      };

      source.start();
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('[BrowserConversation] Error:', error);
    this.setState('error');
    this.callbacks.onError?.(error);
  }

  /**
   * Get supported voices (delegates to TTS provider)
   */
  getSupportedVoices(): Voice[] {
    return this.ttsProvider?.getSupportedVoices() || ELEVENLABS_VOICES;
  }

  /**
   * Get default voice for a gender (delegates to TTS provider)
   */
  getDefaultVoice(gender: 'male' | 'female'): string {
    return (
      this.ttsProvider?.getDefaultVoice(gender) ||
      getElevenLabsVoiceByGender(gender === 'female' ? VoiceGender.FEMALE : VoiceGender.MALE)
    );
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    console.log('[BrowserConversation] Disconnecting...');

    // Abort any in-flight LLM requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Disconnect ASR
    if (this.asrClient) {
      this.asrClient.disconnect();
      this.asrClient = null;
    }

    // Disconnect TTS
    if (this.ttsProvider) {
      this.ttsProvider.disconnect();
      this.ttsProvider = null;
    }

    // Clear LLM provider
    this.llmProvider = null;

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear state
    this.conversationHistory = [];
    this.isProcessing = false;
    this.sessionConfig = null;
    this.callbacks = {};

    this.setState('idle');
    console.log('[BrowserConversation] Disconnected');
  }
}

/**
 * Create a new Browser conversation provider
 */
export function createBrowserConversationProvider(): ConversationProvider {
  return new BrowserConversationProvider();
}
