import type { TTSProvider, VoiceConfig } from '../types';
import type { Voice } from '../../../types';
import { VoiceGender } from '../../../types';
import { ALIBABA_VOICES, getAlibabaVoiceByGender } from '../../../constants';
import { getAlibabaConfig, isAlibabaConfigured } from '../../../config/providers';
import { generateUUID, createAudioContext, decodeMP3 } from '../../audioUtils';

/**
 * WebSocket message types for CosyVoice
 */
interface CosyVoiceHeader {
  action?: string;
  event?: string;
  task_id: string;
  streaming: string;
  error_code?: string;
  error_message?: string;
}

interface CosyVoicePayload {
  task_group?: string;
  task?: string;
  function?: string;
  model?: string;
  parameters?: Record<string, unknown>;
  input?: Record<string, unknown>;
  output?: {
    type?: string;
    original_text?: string;
  };
  usage?: {
    characters: number;
  };
}

interface CosyVoiceMessage {
  header: CosyVoiceHeader;
  payload: CosyVoicePayload;
}

/**
 * CosyVoice TTS Provider Implementation
 * Uses Alibaba DashScope WebSocket API for text-to-speech synthesis
 */
export class CosyVoiceTTSProvider implements TTSProvider {
  readonly name = 'alibaba';
  readonly displayName = 'Alibaba CosyVoice';

  private config = getAlibabaConfig();
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize audio context lazily
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = createAudioContext();
    }
    return this.audioContext;
  }

  /**
   * Synthesize text to audio using CosyVoice WebSocket API
   */
  async synthesize(text: string, voiceConfig: VoiceConfig): Promise<AudioBuffer> {
    if (!this.isReady()) {
      throw new Error('CosyVoice provider is not configured. Please set VITE_DASHSCOPE_API_KEY.');
    }

    // Since browser WebSocket doesn't support custom headers for Authorization,
    // we'll use the HTTP API approach which is more reliable for TTS
    return this.synthesizeViaHTTP(text, voiceConfig);
  }

  /**
   * Synthesize text to audio using CosyVoice WebSocket API (for reference)
   * Note: This requires a proxy server to add auth headers
   */
  async synthesizeViaWebSocket(text: string, voiceConfig: VoiceConfig): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const taskId = generateUUID();
      const audioChunks: Uint8Array[] = [];
      let ws: WebSocket | null = null;
      let taskStarted = false;

      // Create WebSocket connection
      // Note: Browser WebSocket doesn't support custom headers
      // You would need a proxy server or use the subprotocol approach
      ws = new WebSocket(this.config.ttsEndpoint);

      // Set up timeout
      const timeout = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        reject(new Error('TTS request timed out'));
      }, 30000);

      ws.onopen = () => {
        // Send run-task instruction
        const runTaskMessage: CosyVoiceMessage = {
          header: {
            action: 'run-task',
            task_id: taskId,
            streaming: 'duplex',
          },
          payload: {
            task_group: 'audio',
            task: 'tts',
            function: 'SpeechSynthesizer',
            model: this.config.ttsModel,
            parameters: {
              text_type: 'PlainText',
              voice: voiceConfig.voice,
              format: voiceConfig.format || 'mp3',
              sample_rate: voiceConfig.sampleRate || 22050,
              volume: voiceConfig.volume || 50,
              rate: voiceConfig.rate || 1,
              pitch: voiceConfig.pitch || 1,
            },
            input: {},
          },
        };

        // Add authorization header
        // Note: WebSocket API requires auth in the header, so we need to add it manually
        ws!.send(JSON.stringify(runTaskMessage));
      };

      ws.onmessage = async (event) => {
        // Check if it's binary data (audio)
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          audioChunks.push(new Uint8Array(arrayBuffer));
          return;
        }

        // Parse JSON message
        try {
          const message: CosyVoiceMessage = JSON.parse(event.data);
          const eventType = message.header.event;

          switch (eventType) {
            case 'task-started':
              taskStarted = true;
              // Send continue-task with the text
              const continueTaskMessage: CosyVoiceMessage = {
                header: {
                  action: 'continue-task',
                  task_id: taskId,
                  streaming: 'duplex',
                },
                payload: {
                  input: {
                    text: text,
                  },
                },
              };
              ws!.send(JSON.stringify(continueTaskMessage));

              // Send finish-task to indicate no more text
              setTimeout(() => {
                const finishTaskMessage: CosyVoiceMessage = {
                  header: {
                    action: 'finish-task',
                    task_id: taskId,
                    streaming: 'duplex',
                  },
                  payload: {
                    input: {},
                  },
                };
                ws!.send(JSON.stringify(finishTaskMessage));
              }, 100);
              break;

            case 'task-finished':
              clearTimeout(timeout);
              ws!.close();

              // Combine audio chunks and decode
              if (audioChunks.length > 0) {
                const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
                const combinedAudio = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of audioChunks) {
                  combinedAudio.set(chunk, offset);
                  offset += chunk.length;
                }

                try {
                  const audioBuffer = await decodeMP3(
                    combinedAudio.buffer,
                    this.getAudioContext()
                  );
                  resolve(audioBuffer);
                } catch (decodeError) {
                  reject(new Error(`Failed to decode audio: ${decodeError}`));
                }
              } else {
                reject(new Error('No audio data received'));
              }
              break;

            case 'task-failed':
              clearTimeout(timeout);
              ws!.close();
              reject(new Error(message.header.error_message || 'TTS task failed'));
              break;

            case 'result-generated':
              // Audio is being generated, continue receiving
              break;

            default:
              // Unknown event, ignore
              break;
          }
        } catch {
          // Not JSON, might be additional binary data
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error}`));
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (!taskStarted && event.code !== 1000) {
          reject(new Error(`WebSocket closed unexpectedly: ${event.reason || 'Unknown reason'}`));
        }
      };
    });
  }

  /**
   * Create a WebSocket with authorization header
   * Note: Standard WebSocket API doesn't support custom headers,
   * so we need to pass the API key in the URL or use a different approach
   */
  private createAuthorizedWebSocket(): WebSocket {
    // For DashScope, we need to add Authorization header
    // Since browser WebSocket doesn't support custom headers directly,
    // we'll need to include auth in the connection process
    const ws = new WebSocket(this.config.ttsEndpoint, [
      `bearer-${this.config.apiKey}`,
    ]);
    return ws;
  }

  /**
   * Use HTTP/REST API for TTS synthesis
   * This is more reliable from browser as it supports proper auth headers
   */
  private async synthesizeViaHTTP(text: string, voiceConfig: VoiceConfig): Promise<AudioBuffer> {
    // Use DashScope's HTTP API for TTS
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audio/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-DashScope-DataInspection': 'enable',
      },
      body: JSON.stringify({
        model: this.config.ttsModel,
        input: {
          text: text,
        },
        parameters: {
          voice: voiceConfig.voice,
          format: voiceConfig.format || 'mp3',
          sample_rate: voiceConfig.sampleRate || 22050,
          volume: voiceConfig.volume || 50,
          rate: voiceConfig.rate || 1,
          pitch: voiceConfig.pitch || 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `TTS request failed with status ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Check content type - could be JSON with audio URL or direct audio
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Response contains JSON with audio URL
      const json = await response.json();
      if (json.output?.audio) {
        // Fetch the audio from the URL
        const audioResponse = await fetch(json.output.audio);
        const audioData = await audioResponse.arrayBuffer();
        return await decodeMP3(audioData, this.getAudioContext());
      }
      throw new Error('No audio in response');
    } else {
      // Direct audio response
      const audioData = await response.arrayBuffer();
      return await decodeMP3(audioData, this.getAudioContext());
    }
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

  disconnect(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Create a new CosyVoice TTS provider instance
 */
export function createCosyVoiceTTSProvider(): TTSProvider {
  return new CosyVoiceTTSProvider();
}
