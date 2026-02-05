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

  // Heartbeat state
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastMessageTime: number = Date.now();
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT_MS = 45000; // 45 seconds without message = dead

  // Session resumption state (for handling 10-min WebSocket resets and 15-min session limits)
  private resumptionHandle: string | null = null;
  private reconnectionScheduled: boolean = false;
  private reconnectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly SESSION_WARNING_BUFFER_MS = 5000; // 5 seconds before disconnect, reconnect immediately

  get state(): ConversationState {
    return this._state;
  }

  private setState(state: ConversationState): void {
    this._state = state;
    this.callbacks.onStateChange?.(state);
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastMessageTime = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.stopHeartbeat();
        return;
      }

      const timeSinceLastMessage = Date.now() - this.lastMessageTime;
      if (timeSinceLastMessage > this.HEARTBEAT_TIMEOUT_MS) {
        console.warn('[GeminiLive] Connection appears dead, reconnecting...');
        this.handleDeadConnection();
        return;
      }

      // Gemini Live doesn't have a specific ping - we rely on message traffic
      // If no messages for a while, the connection might be dead
      console.log('[GeminiLive] Heartbeat check - connection alive');
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle dead connection
   */
  private handleDeadConnection(): void {
    console.warn('[GeminiLive] Detected dead connection');
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(4000, 'Heartbeat timeout');
      this.ws = null;
    }
    
    this.setState('error');
    this.callbacks.onError?.(new Error('Connection lost - no response from server'));
  }

  /**
   * Update last message time (called when any message is received)
   */
  private updateLastMessageTime(): void {
    this.lastMessageTime = Date.now();
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
          // Start heartbeat
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          // Update heartbeat - any message means connection is alive
          this.updateLastMessageTime();
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
          this.stopHeartbeat();
          
          console.log(`[GeminiLive] WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'none'}`);
          
          // If this is an unexpected disconnect and we have a resumption handle, attempt to reconnect
          if (event.code !== 1000 && this.resumptionHandle && this.sessionConfig && !this.reconnectionScheduled) {
            console.log('[GeminiLive] Unexpected disconnect - attempting to resume session');
            this.reconnectionScheduled = true;
            // Small delay before reconnecting to avoid rapid reconnection loops
            this.reconnectionTimeout = setTimeout(() => {
              this.reconnect();
            }, 1000);
          } else if (event.code !== 1000) {
            // No resumption handle or explicit disconnect - report error
            this.callbacks.onError?.(new Error(`Connection closed: ${event.reason || `code ${event.code}`}`));
            this.setState('idle');
          } else {
            // Normal closure (code 1000)
            this.setState('idle');
          }
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

    const setupMessage: Record<string, unknown> = {
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
        // Enable context window compression for unlimited session time (removes 15-min limit)
        context_window_compression: {
          sliding_window: {},
        },
        // Enable session resumption to maintain conversation across WebSocket resets (~10-min limit)
        session_resumption: this.resumptionHandle 
          ? { handle: this.resumptionHandle }
          : {},
      },
    };

    console.log('[GeminiLive] Sending setup message', this.resumptionHandle ? '(resuming session)' : '(new session)');
    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const data = JSON.parse(event.data);

      // Handle GoAway message (connection will terminate soon)
      if (data.goAway) {
        console.warn('[GeminiLive] GoAway message received. Time left:', data.goAway.timeLeft);
        this.handleGoAway(data.goAway);
        return;
      }

      // Handle API error responses
      if (data.error) {
        console.error('[GeminiLive] API error:', data.error);
        this.setState('error');
        this.callbacks.onError?.(new Error(data.error.message || 'Gemini API error'));
        return;
      }

      // Handle session resumption updates (save token for reconnection)
      if (data.sessionResumptionUpdate) {
        const update = data.sessionResumptionUpdate;
        if (update.resumable && update.newHandle) {
          console.log('[GeminiLive] Received new resumption token');
          this.resumptionHandle = update.newHandle;
        }
        // Don't return - there might be other content in the same message
      }

      // Handle setup complete
      if (data.setupComplete) {
        console.log('[GeminiLive] Setup complete', this.resumptionHandle ? '(session resumed)' : '(new session)');
        this.setState('listening');
        
        // Send greeting if configured (only for new sessions, not resumed ones)
        if (this.sessionConfig?.greeting && !this.resumptionHandle) {
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
        console.log('[GeminiLive] Tool call received:', data.toolCall);
      }

    } catch (error) {
      console.error('[GeminiLive] Failed to handle message:', error);
    }
  }

  /**
   * Handle GoAway message - server is about to terminate the connection
   */
  private handleGoAway(goAway: { timeLeft?: string }): void {
    if (this.reconnectionScheduled) {
      console.log('[GeminiLive] Reconnection already scheduled, ignoring GoAway');
      return;
    }

    this.reconnectionScheduled = true;
    console.log('[GeminiLive] Scheduling reconnection before connection terminates');

    // Parse timeLeft (format: "60s" or "1m" or ISO duration)
    let timeLeftMs = 60000; // Default 60 seconds
    if (goAway.timeLeft) {
      const match = goAway.timeLeft.match(/(\d+)([sm]?)/);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2] || 's';
        timeLeftMs = unit === 'm' ? value * 60000 : value * 1000;
      }
    }

    // Schedule reconnection before disconnect (with buffer)
    const reconnectDelay = Math.max(0, timeLeftMs - this.SESSION_WARNING_BUFFER_MS);
    console.log(`[GeminiLive] Will reconnect in ${reconnectDelay}ms (timeLeft: ${timeLeftMs}ms)`);
    
    this.reconnectionTimeout = setTimeout(() => {
      this.reconnect();
    }, reconnectDelay);
  }

  /**
   * Seamlessly reconnect to maintain session continuity
   */
  private async reconnect(): Promise<void> {
    if (!this.sessionConfig || !this.callbacks) {
      console.warn('[GeminiLive] Cannot reconnect - no session config');
      this.reconnectionScheduled = false;
      return;
    }

    console.log('[GeminiLive] Reconnecting to maintain session...');

    // Close current connection gracefully (don't clear resumption handle!)
    if (this.ws) {
      // Remove event handlers to prevent triggering onclose error handling
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Reconnecting');
      }
      this.ws = null;
    }

    // Stop heartbeat (will restart on new connection)
    this.stopHeartbeat();

    // Reset reconnection flag
    this.reconnectionScheduled = false;

    // Don't clear audio - we want seamless playback continuation
    // this.audioQueue = []; // Keep existing audio queue

    // Reconnect with same config (will use resumption handle if available)
    try {
      await this.connect(this.sessionConfig, this.callbacks);
      console.log('[GeminiLive] Reconnection successful');
    } catch (error) {
      console.error('[GeminiLive] Reconnection failed:', error);
      // Clear resumption handle since reconnection failed
      this.resumptionHandle = null;
      this.setState('error');
      this.callbacks.onError?.(new Error('Failed to reconnect to Gemini Live'));
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
    console.log('[GeminiLive] Disconnecting...');
    
    // Clear session resumption state (intentional disconnect = end session)
    this.resumptionHandle = null;
    this.reconnectionScheduled = false;
    
    // Clear any pending reconnection
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = null;
    }
    
    // Stop heartbeat first
    this.stopHeartbeat();
    
    // Close WebSocket
    if (this.ws) {
      // Remove event handlers to prevent triggering error callbacks
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
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
    
    console.log('[GeminiLive] Disconnected successfully');
  }
}

/**
 * Create a new Gemini Live conversation provider
 */
export function createGeminiLiveProvider(): ConversationProvider {
  return new GeminiLiveProvider();
}
