import type { 
  ConversationProvider, 
  ConversationState, 
  ConversationCallbacks, 
  ConversationSessionConfig 
} from '../types';
import type { Voice } from '../../../types';
import { VoiceGender } from '../../../types';
import { GEMINI_VOICES, getGeminiVoiceByGender, AUDIO_CONFIG } from '../../../constants';
import { getGeminiConfig, isGeminiConfigured } from '../../../config/providers';
import { createAudioContext, decodeAudioData, decode, encode } from '../../audioUtils';

/**
 * Gemini Live API Conversation Provider
 * Uses WebSocket for real-time bidirectional audio conversation
 */
export class GeminiLiveProvider implements ConversationProvider {
  readonly name = 'gemini';
  readonly displayName = 'Google Gemini Live';

  private _state: ConversationState = 'idle';
  private config = getGeminiConfig();
  private callbacks: ConversationCallbacks = {};
  private sessionConfig: ConversationSessionConfig | null = null;

  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private nextStartTime = 0;
  private isPlaying = false;

  get state(): ConversationState {
    return this._state;
  }

  private setState(state: ConversationState): void {
    this._state = state;
    this.callbacks.onStateChange?.(state);
  }

  /**
   * Connect to Gemini Live API via WebSocket
   */
  async connect(
    sessionConfig: ConversationSessionConfig,
    callbacks: ConversationCallbacks
  ): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Gemini provider is not configured. Please set VITE_GEMINI_API_KEY.');
    }

    this.sessionConfig = sessionConfig;
    this.callbacks = callbacks;
    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Initialize audio context for playback
        this.audioContext = createAudioContext(AUDIO_CONFIG.outputSampleRate);

        // Connect to Gemini Live API
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.config.apiKey}`;
        
        this.ws = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          // Send setup message
          this.sendSetupMessage();
          this.setState('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('Gemini Live WebSocket error:', error);
          this.setState('error');
          this.callbacks.onError?.(new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          if (event.code !== 1000) {
            this.callbacks.onError?.(new Error(`Connection closed: ${event.reason}`));
          }
          this.setState('idle');
        };

      } catch (error) {
        this.setState('error');
        reject(error);
      }
    });
  }

  /**
   * Send setup message to configure the session
   */
  private sendSetupMessage(): void {
    if (!this.ws || !this.sessionConfig) return;

    const setupMessage = {
      setup: {
        model: `models/${this.config.liveModel}`,
        generation_config: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.sessionConfig.voice,
              },
            },
          },
        },
        system_instruction: {
          parts: [{ text: this.sessionConfig.systemPrompt }],
        },
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const data = JSON.parse(event.data);

      // Handle setup complete
      if (data.setupComplete) {
        this.setState('listening');
        
        // Send greeting if configured
        if (this.sessionConfig?.greeting) {
          this.sendTextMessage(this.sessionConfig.greeting);
        }
        return;
      }

      // Handle server content (audio response)
      if (data.serverContent) {
        const content = data.serverContent;

        // Check if model is done speaking
        if (content.turnComplete) {
          this.setState('listening');
          return;
        }

        // Process audio parts
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              await this.handleAudioData(part.inlineData.data);
            }
            if (part.text) {
              this.callbacks.onResponse?.(part.text);
            }
          }
        }
      }

      // Handle tool calls (if any)
      if (data.toolCall) {
        console.log('Tool call received:', data.toolCall);
      }

    } catch (error) {
      console.error('Failed to handle Gemini Live message:', error);
    }
  }

  /**
   * Handle audio data from the server
   */
  private async handleAudioData(base64Data: string): Promise<void> {
    if (!this.audioContext) return;

    this.setState('speaking');

    // Decode base64 to PCM
    const pcmData = decode(base64Data);
    const audioBuffer = decodeAudioData(
      pcmData,
      this.audioContext,
      AUDIO_CONFIG.outputSampleRate,
      1
    );

    // Add to queue and play
    this.audioQueue.push(audioBuffer);
    this.callbacks.onAudioReceived?.(audioBuffer);
    
    if (!this.isPlaying) {
      this.playNextInQueue();
    }
  }

  /**
   * Play next audio buffer in queue
   */
  private playNextInQueue(): void {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // Schedule playback
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;

    source.onended = () => {
      this.playNextInQueue();
    };
  }

  /**
   * Send audio data for recognition
   */
  sendAudio(audioData: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Convert to PCM16 and encode as base64
    const pcm16 = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const base64Data = encode(new Uint8Array(pcm16.buffer));

    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: `audio/pcm;rate=${AUDIO_CONFIG.inputSampleRate}`,
          data: base64Data,
        }],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send text message
   */
  private sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }],
        }],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send text directly (for testing)
   */
  sendText(text: string): void {
    this.callbacks.onTranscript?.(text, true);
    this.sendTextMessage(text);
  }

  /**
   * Interrupt the current response
   */
  interrupt(): void {
    // Clear audio queue
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;

    // Reset audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = createAudioContext(AUDIO_CONFIG.outputSampleRate);
    }

    this.setState('listening');
  }

  getSupportedVoices(): Voice[] {
    return GEMINI_VOICES;
  }

  getDefaultVoice(gender: 'male' | 'female'): string {
    return getGeminiVoiceByGender(gender === 'female' ? VoiceGender.FEMALE : VoiceGender.MALE);
  }

  isReady(): boolean {
    return isGeminiConfigured();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    // Close WebSocket
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Normal closure');
      }
      this.ws = null;
    }

    // Clear audio
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextStartTime = 0;

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear state
    this.sessionConfig = null;
    this.callbacks = {};
    this.setState('idle');
  }
}

/**
 * Create a new Gemini Live conversation provider
 */
export function createGeminiLiveProvider(): ConversationProvider {
  return new GeminiLiveProvider();
}
