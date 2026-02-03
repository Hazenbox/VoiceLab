import { generateUUID, createBlob } from '../../audioUtils';
import { getAlibabaConfig } from '../../../config/providers';

/**
 * ASR event callbacks
 */
export interface ASRCallbacks {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'listening' | 'error') => void;
}

/**
 * Qwen ASR Realtime WebSocket Message Types
 */
interface ASRHeader {
  action?: string;
  event?: string;
  task_id: string;
  streaming?: string;
  error_code?: string;
  error_message?: string;
}

interface ASRPayload {
  task_group?: string;
  task?: string;
  function?: string;
  model?: string;
  parameters?: Record<string, unknown>;
  input?: {
    audio?: string;
  };
  output?: {
    sentence?: {
      text?: string;
      end_time?: number;
    };
    transcription?: {
      text?: string;
      sentences?: Array<{
        text: string;
        begin_time: number;
        end_time: number;
      }>;
    };
  };
}

interface ASRMessage {
  header: ASRHeader;
  payload: ASRPayload;
}

/**
 * Qwen ASR Realtime Client
 * Handles real-time speech recognition using Alibaba's Qwen ASR service
 */
export class QwenASRClient {
  private config = getAlibabaConfig();
  private ws: WebSocket | null = null;
  private taskId: string = '';
  private callbacks: ASRCallbacks = {};
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(callbacks: ASRCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Connect to Qwen ASR service
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    this.callbacks.onStateChange?.('connecting');
    this.taskId = generateUUID();

    return new Promise((resolve, reject) => {
      try {
        // Note: Browser WebSocket doesn't support custom headers
        // For production, you'd need a proxy server or use a different auth method
        this.ws = new WebSocket(this.config.asrEndpoint);

        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.sendRunTask();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
          if (!this.isConnected) {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.callbacks.onStateChange?.('listening');
            resolve();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('ASR WebSocket error:', error);
          this.callbacks.onStateChange?.('error');
          this.callbacks.onError?.(new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.isConnected = false;
          
          if (event.code !== 1000) {
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
   * Send run-task instruction to start ASR
   */
  private sendRunTask(): void {
    const message: ASRMessage = {
      header: {
        action: 'run-task',
        task_id: this.taskId,
        streaming: 'duplex',
      },
      payload: {
        task_group: 'audio',
        task: 'asr',
        function: 'recognition',
        model: this.config.asrModel,
        parameters: {
          format: 'pcm',
          sample_rate: 16000,
          enable_punctuation_prediction: true,
          enable_inverse_text_normalization: true,
          language_hints: ['en'], // English
        },
        input: {},
      },
    };

    this.ws?.send(JSON.stringify(message));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: ASRMessage = JSON.parse(event.data);
      const eventType = message.header.event;

      switch (eventType) {
        case 'task-started':
          // ASR task started successfully
          console.log('ASR task started');
          break;

        case 'result-generated':
          // Handle transcription result
          if (message.payload.output?.sentence) {
            const sentence = message.payload.output.sentence;
            const isFinal = sentence.end_time !== undefined && sentence.end_time > 0;
            this.callbacks.onTranscript?.(sentence.text || '', isFinal);
          }
          break;

        case 'task-finished':
          // Task completed
          console.log('ASR task finished');
          this.disconnect();
          break;

        case 'task-failed':
          // Task failed
          const errorMsg = message.header.error_message || 'ASR task failed';
          console.error('ASR task failed:', errorMsg);
          this.callbacks.onError?.(new Error(errorMsg));
          this.callbacks.onStateChange?.('error');
          break;

        default:
          // Unknown event
          break;
      }
    } catch (error) {
      console.error('Failed to parse ASR message:', error);
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
    const base64Audio = createBlob(audioData);

    const message: ASRMessage = {
      header: {
        action: 'continue-task',
        task_id: this.taskId,
        streaming: 'duplex',
      },
      payload: {
        input: {
          audio: base64Audio,
        },
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Finish the ASR task (call when user stops speaking)
   */
  finishTask(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: ASRMessage = {
      header: {
        action: 'finish-task',
        task_id: this.taskId,
        streaming: 'duplex',
      },
      payload: {
        input: {},
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
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
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.finishTask();
        this.ws.close(1000, 'Normal closure');
      }
      this.ws = null;
    }
    this.isConnected = false;
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
