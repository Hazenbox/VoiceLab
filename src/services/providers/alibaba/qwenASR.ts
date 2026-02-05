import { generateUUID, float32ToPCM16Base64 } from '../../audioUtils';
import { getAlibabaConfig, getProxyConfig } from '../../../config/providers';

/**
 * ASR event callbacks
 */
export interface ASRCallbacks {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'listening' | 'error') => void;
}

/**
 * Qwen ASR Realtime WebSocket Message Types (New API format)
 */
interface ASRSessionConfig {
  modalities: string[];
  input_audio_format: string;
  sample_rate: number;
  input_audio_transcription?: {
    language?: string;
  };
  turn_detection?: {
    type: 'server_vad';
    threshold: number;
    silence_duration_ms: number;
  } | null;
}

interface ASRServerEvent {
  type: string;
  event_id?: string;
  session?: {
    id: string;
  };
  transcript?: string;
  text?: string;
  stash?: string;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Qwen ASR Realtime Client
 * Handles real-time speech recognition using Alibaba's Qwen ASR service
 * Uses WebSocket proxy to handle authentication (browser WebSockets can't send custom headers)
 */
export class QwenASRClient {
  private config = getAlibabaConfig();
  private proxyConfig = getProxyConfig();
  private ws: WebSocket | null = null;
  private sessionId: string = '';
  private callbacks: ASRCallbacks = {};
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private enableServerVad = true; // Use server-side VAD by default
  
  // Heartbeat state
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPongTime: number = Date.now();
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT_MS = 10000; // 10 seconds to receive pong

  constructor(callbacks: ASRCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPongTime = Date.now();
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.stopHeartbeat();
        return;
      }
      
      // Check if we received a pong recently
      const timeSinceLastPong = Date.now() - this.lastPongTime;
      if (timeSinceLastPong > this.HEARTBEAT_INTERVAL_MS + this.HEARTBEAT_TIMEOUT_MS) {
        console.warn('[QwenASR] Heartbeat timeout - connection may be dead');
        this.handleZombieConnection();
        return;
      }
      
      // Send a proper session.update as keepalive instead of empty audio commit
      // Empty input_audio_buffer.commit causes "Error committing input audio buffer" on the server
      try {
        const pingEvent = {
          event_id: `ping_${generateUUID()}`,
          type: 'session.update',
          session: {
            // Empty session update acts as a keepalive without modifying settings
          },
        };
        this.ws.send(JSON.stringify(pingEvent));
        console.debug('[QwenASR] Heartbeat sent');
      } catch (error) {
        console.error('[QwenASR] Failed to send heartbeat:', error);
      }
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
   * Handle zombie connection (no response to heartbeat)
   */
  private handleZombieConnection(): void {
    console.warn('[QwenASR] Detected zombie connection, reconnecting...');
    this.stopHeartbeat();
    
    // Force close the WebSocket
    if (this.ws) {
      this.ws.close(4000, 'Heartbeat timeout');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.handleReconnect();
  }

  /**
   * Update last pong time (called when any message is received)
   */
  private updateLastPong(): void {
    this.lastPongTime = Date.now();
  }

  /**
   * Connect to Qwen ASR service through proxy
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    this.callbacks.onStateChange?.('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Connect through the proxy server
        // The proxy adds the required Authorization header
        const proxyUrl = `${this.proxyConfig.wsProxyUrl}?service=asr&model=${encodeURIComponent(this.config.asrModel)}`;
        console.log('[QwenASR] Connecting to proxy:', proxyUrl);
        
        this.ws = new WebSocket(proxyUrl);

        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            this.callbacks.onStateChange?.('error');
            reject(new Error('Connection timeout'));
          }
        }, 15000);

        this.ws.onopen = () => {
          console.log('[QwenASR] WebSocket connected, sending session.update');
          clearTimeout(timeout);
          this.sendSessionUpdate();
        };

        this.ws.onmessage = (event) => {
          // Update heartbeat - any message counts as a "pong"
          this.updateLastPong();
          
          this.handleMessage(event.data);
          
          // Resolve on first successful message (session.created)
          if (!this.isConnected) {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'session.created') {
                this.isConnected = true;
                this.sessionId = data.session?.id || '';
                this.reconnectAttempts = 0;
                this.callbacks.onStateChange?.('listening');
                console.log('[QwenASR] Session created:', this.sessionId);
                
                // Start heartbeat once connected
                this.startHeartbeat();
                
                resolve();
              }
            } catch {
              // Not JSON, ignore
            }
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('[QwenASR] WebSocket error:', error);
          this.callbacks.onStateChange?.('error');
          this.callbacks.onError?.(new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.isConnected = false;
          console.log(`[QwenASR] WebSocket closed: ${event.code} - ${event.reason}`);
          
          if (event.code !== 1000 && event.code !== 1005) {
            // Abnormal close, try to reconnect
            this.handleReconnect();
          } else {
            this.callbacks.onStateChange?.('idle');
          }
        };
      } catch (error) {
        this.callbacks.onStateChange?.('error');
        reject(error);
      }
    });
  }

  /**
   * Send session.update to configure the ASR session
   */
  private sendSessionUpdate(): void {
    const sessionConfig: ASRSessionConfig = {
      modalities: ['text'],
      input_audio_format: 'pcm',
      sample_rate: 16000,
      input_audio_transcription: {
        language: 'en', // English
      },
    };

    // Add VAD configuration if enabled
    if (this.enableServerVad) {
      sessionConfig.turn_detection = {
        type: 'server_vad',
        threshold: 0.0,
        silence_duration_ms: 400,
      };
    } else {
      sessionConfig.turn_detection = null;
    }

    const event = {
      event_id: `event_${generateUUID()}`,
      type: 'session.update',
      session: sessionConfig,
    };

    console.log('[QwenASR] Sending session.update:', JSON.stringify(event, null, 2));
    this.ws?.send(JSON.stringify(event));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const event: ASRServerEvent = JSON.parse(data);
      const eventType = event.type;

      console.log('[QwenASR] Received event:', eventType);

      switch (eventType) {
        case 'session.created':
          console.log('[QwenASR] Session created');
          break;

        case 'session.updated':
          console.log('[QwenASR] Session updated');
          break;

        case 'input_audio_buffer.speech_started':
          console.log('[QwenASR] Speech started (VAD)');
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('[QwenASR] Speech stopped (VAD)');
          break;

        case 'input_audio_buffer.committed':
          console.log('[QwenASR] Audio buffer committed');
          break;

        case 'conversation.item.created':
          console.log('[QwenASR] Conversation item created');
          break;

        case 'conversation.item.input_audio_transcription.text':
          // Partial/interim transcription result
          if (event.text || event.stash) {
            const text = event.text || event.stash || '';
            this.callbacks.onTranscript?.(text, false);
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // Final transcription result
          if (event.transcript) {
            this.callbacks.onTranscript?.(event.transcript, true);
          }
          break;

        case 'session.finished':
          console.log('[QwenASR] Session finished');
          this.disconnect();
          break;

        case 'error':
          const errorMsg = event.error?.message || 'Unknown ASR error';
          console.error('[QwenASR] Error:', errorMsg);
          this.callbacks.onError?.(new Error(errorMsg));
          this.callbacks.onStateChange?.('error');
          break;

        default:
          // Unknown event type
          console.log('[QwenASR] Unknown event type:', eventType);
          break;
      }
    } catch (error) {
      console.error('[QwenASR] Failed to parse message:', error);
    }
  }

  /**
   * Send audio data for recognition
   * @param audioData PCM audio data as Float32Array (16kHz, mono)
   */
  sendAudio(audioData: Float32Array): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Convert Float32Array to PCM16 Base64
    const base64Audio = float32ToPCM16Base64(audioData);

    const event = {
      event_id: `event_${Date.now()}`,
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    };

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Commit the audio buffer (for manual mode without VAD)
   */
  commitAudio(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const event = {
      event_id: `event_${generateUUID()}`,
      type: 'input_audio_buffer.commit',
    };

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Finish the ASR session (call when done with recognition)
   */
  finishSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const event = {
      event_id: `event_${generateUUID()}`,
      type: 'session.finish',
    };

    console.log('[QwenASR] Sending session.finish');
    this.ws.send(JSON.stringify(event));
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[QwenASR] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[QwenASR] Reconnection failed:', error);
        });
      }, 1000 * this.reconnectAttempts);
    } else {
      this.callbacks.onStateChange?.('error');
      this.callbacks.onError?.(new Error('Max reconnection attempts reached'));
    }
  }

  /**
   * Disconnect from ASR service
   */
  disconnect(): void {
    // Stop heartbeat first
    this.stopHeartbeat();
    
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.finishSession();
        this.ws.close(1000, 'Normal closure');
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.sessionId = '';
    this.callbacks.onStateChange?.('idle');
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

/**
 * Create a new Qwen ASR client
 */
export function createQwenASRClient(callbacks: ASRCallbacks = {}): QwenASRClient {
  return new QwenASRClient(callbacks);
}
