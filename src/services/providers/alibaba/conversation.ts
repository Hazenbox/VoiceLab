import type { 
  ConversationProvider, 
  ConversationState, 
  ConversationCallbacks, 
  ConversationSessionConfig,
  TTSProvider 
} from '../types';
import type { Voice } from '../../../types';
import { VoiceGender } from '../../../types';
import { ALIBABA_VOICES, getAlibabaVoiceByGender, RESPONSE_LENGTH_WORDS } from '../../../constants';
import { getAlibabaConfig, isAlibabaConfigured, getProxyConfig } from '../../../config/providers';
import { QwenASRClient } from './qwenASR';
import { createTTSProvider } from '../index';
import { createAudioContext, decodeAudioData } from '../../audioUtils';

/**
 * Alibaba Conversation Provider
 * Combines Qwen ASR for speech recognition, Qwen LLM for conversation,
 * and CosyVoice TTS for speech synthesis
 */
export class AlibabaConversationProvider implements ConversationProvider {
  readonly name = 'alibaba';
  readonly displayName = 'Alibaba DashScope';

  private _state: ConversationState = 'idle';
  private config = getAlibabaConfig();
  private proxyConfig = getProxyConfig();
  private callbacks: ConversationCallbacks = {};
  private sessionConfig: ConversationSessionConfig | null = null;

  // Components
  private asrClient: QwenASRClient | null = null;
  private ttsProvider: TTSProvider | null = null;
  private audioContext: AudioContext | null = null;

  // Conversation state
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private currentTranscript = '';
  private isProcessing = false;

  get state(): ConversationState {
    return this._state;
  }

  private setState(state: ConversationState): void {
    this._state = state;
    this.callbacks.onStateChange?.(state);
  }

  /**
   * Connect and initialize the conversation session
   */
  async connect(
    sessionConfig: ConversationSessionConfig,
    callbacks: ConversationCallbacks
  ): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Alibaba provider is not configured. Please set VITE_DASHSCOPE_API_KEY.');
    }

    this.sessionConfig = sessionConfig;
    this.callbacks = callbacks;
    this.conversationHistory = [];
    this.currentTranscript = '';

    this.setState('connecting');

    try {
      // Initialize audio context
      this.audioContext = createAudioContext(24000);

      // Initialize TTS provider (uses configured provider from env)
      this.ttsProvider = createTTSProvider();

      // Initialize ASR client with callbacks
      this.asrClient = new QwenASRClient({
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

      // Connect to ASR service
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
   * Send audio data for recognition
   */
  sendAudio(audioData: Float32Array): void {
    if (this._state !== 'listening' || !this.asrClient) {
      return;
    }

    this.asrClient.sendAudio(audioData);
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
  private async handleTranscript(text: string, isFinal: boolean): void {
    this.currentTranscript = text;
    this.callbacks.onTranscript?.(text, isFinal);

    if (isFinal && text.trim().length > 0) {
      // Process the user's input
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

      // Generate response using Qwen LLM
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
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate response using Qwen LLM via HTTP API
   */
  private async generateResponse(userMessage: string): Promise<string> {
    const maxWords = this.sessionConfig 
      ? RESPONSE_LENGTH_WORDS[this.sessionConfig.maxResponseLength]
      : 30;

    const systemPrompt = this.sessionConfig?.systemPrompt || 
      `You are a helpful Jio voice assistant. Keep responses concise (max ${maxWords} words).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory.slice(-10), // Keep last 10 messages for context
    ];

    // Use proxy for LLM API call to avoid CORS
    const proxyUrl = `${this.proxyConfig.httpProxyUrl}/api/llm`;
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.llmModel,
        messages,
        maxTokens: maxWords * 5,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM request failed: ${error}`);
    }

    const data = await response.json();
    return data.output?.text || data.output?.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.';
  }

  /**
   * Speak the response using CosyVoice TTS
   */
  private async speakResponse(text: string): Promise<void> {
    if (!this.ttsProvider || !this.audioContext) {
      return;
    }

    this.setState('speaking');

    try {
      const voice = this.sessionConfig?.voice || this.getDefaultVoice('female');
      
      const audioBuffer = await this.ttsProvider.synthesize(text, {
        voice,
        format: 'mp3',
        sampleRate: 22050,
      });

      // Play the audio
      await this.playAudio(audioBuffer);

      // Notify callback
      this.callbacks.onAudioReceived?.(audioBuffer);
    } catch (error) {
      console.error('TTS error:', error);
      // Don't throw, just continue
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
    console.error('Conversation error:', error);
    this.setState('error');
    this.callbacks.onError?.(error);
  }

  getSupportedVoices(): Voice[] {
    return ALIBABA_VOICES;
  }

  getDefaultVoice(gender: 'male' | 'female'): string {
    return getAlibabaVoiceByGender(gender === 'female' ? VoiceGender.FEMALE : VoiceGender.MALE);
  }

  isReady(): boolean {
    return isAlibabaConfigured();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
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

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear state
    this.conversationHistory = [];
    this.currentTranscript = '';
    this.isProcessing = false;
    this.sessionConfig = null;
    this.callbacks = {};

    this.setState('idle');
  }
}

/**
 * Create a new Alibaba conversation provider
 */
export function createAlibabaConversationProvider(): ConversationProvider {
  return new AlibabaConversationProvider();
}
