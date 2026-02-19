import type { 
  ConversationProvider, 
  ConversationState, 
  ConversationCallbacks, 
  ConversationSessionConfig,
  TTSProvider 
} from '../types';
import type { Voice } from '../../../types';
import { VoiceGender } from '../../../types';
import { ALIBABA_VOICES, getAlibabaVoiceByGender, RESPONSE_LENGTH_WORDS, MAX_VOICE_CONVERSATION_HISTORY } from '../../../constants';
import { getAlibabaConfig, isAlibabaConfigured, getProxyConfig } from '../../../config/providers';
import { QwenASRClient } from './qwenASR';
import { createTTSProvider } from '../index';
import { createAudioContext } from '../../audioUtils';

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
  // private _currentTranscript = '';
  private isProcessing = false;
  
  // AbortController for cancelling in-flight LLM requests
  private abortController: AbortController | null = null;

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
      throw new Error('Alibaba provider is not configured. Please ensure the server has DASHSCOPE_API_KEY.');
    }

    this.sessionConfig = sessionConfig;
    this.callbacks = callbacks;
    this.conversationHistory = [];
    // this._currentTranscript = '';

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
  private async handleTranscript(text: string, isFinal: boolean): Promise<void> {
    // this._currentTranscript = text;
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
      
      // Truncate history to prevent unbounded memory growth
      // Keep 2x the used context to have some buffer
      const maxHistorySize = MAX_VOICE_CONVERSATION_HISTORY * 2;
      if (this.conversationHistory.length > maxHistorySize) {
        this.conversationHistory = this.conversationHistory.slice(-maxHistorySize);
      }

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
  private async generateResponse(_userMessage: string): Promise<string> {
    // Cancel any in-flight request
    this.abortController?.abort();
    this.abortController = new AbortController();

    const maxWords = this.sessionConfig 
      ? RESPONSE_LENGTH_WORDS[this.sessionConfig.maxResponseLength]
      : 30;

    const systemPrompt = this.sessionConfig?.systemPrompt || 
      `You are a helpful Jio voice assistant. Keep responses concise (max ${maxWords} words).
When users ask to "write", "compose", or "draft" content, generate that content FOR them. "Write message: [topic]" means create a message about that topic.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory.slice(-MAX_VOICE_CONVERSATION_HISTORY), // Keep messages for context
    ];

    // Use proxy for LLM API call to avoid CORS
    const proxyUrl = `${this.proxyConfig.httpProxyUrl}/api/llm`;
    
    try {
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
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM request failed: ${error}`);
      }

      const data = await response.json();
      return data.output?.text || data.output?.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.';
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[AlibabaConversation] LLM request aborted');
        throw error;
      }
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
      // Use the TTS provider's default voice if none configured
      const voice = this.sessionConfig?.voice || this.ttsProvider.getDefaultVoice('female');
      
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
    // Return voices from the configured TTS provider
    return this.ttsProvider?.getSupportedVoices() || ALIBABA_VOICES;
  }

  getDefaultVoice(gender: 'male' | 'female'): string {
    // Delegate to the configured TTS provider
    return this.ttsProvider?.getDefaultVoice(gender) || 
           getAlibabaVoiceByGender(gender === 'female' ? VoiceGender.FEMALE : VoiceGender.MALE);
  }

  isReady(): boolean {
    return isAlibabaConfigured();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
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

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear state
    this.conversationHistory = [];
    // this._currentTranscript = '';
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
