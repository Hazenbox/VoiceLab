import type { TTSProvider, VoiceConfig } from '../types';
import type { Voice } from '../../../types';
import { VoiceGender } from '../../../types';
import { getElevenLabsConfig, isElevenLabsConfigured } from '../../../config/providers';
import { createAudioContext, decodeMP3 } from '../../audioUtils';

/**
 * ElevenLabs voice definitions with Indian accent support
 */
const ELEVENLABS_VOICES: Voice[] = [
  // Custom Jio voices (primary)
  {
    id: 'xMagNCpMgZ83QOEsHNre',
    name: 'Jio Male',
    gender: VoiceGender.MALE,
    language: 'Indian English',
    description: 'Custom Jio Male Voice'
  },
  {
    id: '90ipbRoKi4CpHXvKVtl0',
    name: 'Jio Female',
    gender: VoiceGender.FEMALE,
    language: 'Indian English',
    description: 'Custom Jio Female Voice'
  },
  // Standard ElevenLabs voices (fallback)
  {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam
    name: 'Adam',
    gender: VoiceGender.MALE,
    language: 'English',
    description: 'Deep, Natural Male Voice'
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL', // Bella
    name: 'Bella',
    gender: VoiceGender.FEMALE,
    language: 'English',
    description: 'Soft, Expressive Female Voice'
  },
  {
    id: 'ThT5KcBeYPX3keUQqHPh', // Dorothy
    name: 'Dorothy',
    gender: VoiceGender.FEMALE,
    language: 'English',
    description: 'Pleasant, Natural Female Voice'
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX', // Josh
    name: 'Josh',
    gender: VoiceGender.MALE,
    language: 'English',
    description: 'Young, Professional Male Voice'
  }
];

/**
 * ElevenLabs TTS Provider Implementation
 * Uses ElevenLabs API for high-quality text-to-speech synthesis
 * Supports Hindi and Indian English accents
 */
export class ElevenLabsTTSProvider implements TTSProvider {
  readonly name = 'elevenlabs';
  readonly displayName = 'ElevenLabs';

  private config = getElevenLabsConfig();
  private audioContext: AudioContext | null = null;
  private readonly apiBaseUrl = 'https://api.elevenlabs.io/v1';

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
   * Synthesize text to audio using ElevenLabs API
   * @param text Text to synthesize
   * @param voiceConfig Voice configuration
   * @param signal Optional AbortSignal for cancellation
   */
  async synthesize(text: string, voiceConfig: VoiceConfig, signal?: AbortSignal): Promise<AudioBuffer> {
    if (!this.isReady()) {
      throw new Error('ElevenLabs provider is not configured. Please set VITE_ELEVENLABS_API_KEY.');
    }

    // Check if already aborted
    if (signal?.aborted) {
      throw new DOMException('TTS request aborted', 'AbortError');
    }

    // Use REST API for synthesis (more reliable for standard TTS)
    return this.synthesizeViaREST(text, voiceConfig, signal);
  }

  /**
   * Synthesize text to audio using ElevenLabs REST API
   */
  private async synthesizeViaREST(text: string, voiceConfig: VoiceConfig, signal?: AbortSignal): Promise<AudioBuffer> {
    const voiceId = voiceConfig.voice || this.config.defaultVoiceId;
    const url = `${this.apiBaseUrl}/text-to-speech/${voiceId}`;

    console.log('[ElevenLabs] Synthesizing text:', text.substring(0, 50) + '...');
    console.log('[ElevenLabs] Voice ID:', voiceId);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true
          }
        }),
        signal, // Pass AbortSignal to fetch
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ElevenLabs] API Error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      // Check if aborted before processing response
      if (signal?.aborted) {
        throw new DOMException('TTS request aborted', 'AbortError');
      }

      // Get audio data as ArrayBuffer
      const audioData = await response.arrayBuffer();
      console.log('[ElevenLabs] Received audio data:', audioData.byteLength, 'bytes');

      // Decode MP3 to AudioBuffer
      const audioContext = this.getAudioContext();
      const audioBuffer = await decodeMP3(audioData, audioContext);

      console.log('[ElevenLabs] Audio decoded successfully:', audioBuffer.duration.toFixed(2), 'seconds');
      return audioBuffer;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[ElevenLabs] Request aborted');
        throw error;
      }
      console.error('[ElevenLabs] Synthesis error:', error);
      throw error;
    }
  }

  /**
   * Synthesize text to audio using ElevenLabs WebSocket API
   * This is for streaming/real-time synthesis (future enhancement)
   * Currently unused - kept for future implementation
   */
  /* private async _synthesizeViaWebSocket(text: string, voiceConfig: VoiceConfig): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const voiceId = voiceConfig.voice || this.config.defaultVoiceId;
      const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_multilingual_v2`;

      console.log('[ElevenLabs] Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      const audioChunks: ArrayBuffer[] = [];
      let isComplete = false;

      // Set up timeout
      const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        reject(new Error('ElevenLabs WebSocket request timed out'));
      }, 30000);

      ws.onopen = () => {
        console.log('[ElevenLabs] WebSocket connected');

        // Send initial configuration
        const config = {
          text: ' ',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          xi_api_key: this.config.apiKey,
        };
        ws.send(JSON.stringify(config));

        // Send the text
        ws.send(JSON.stringify({ text, try_trigger_generation: true }));

        // Send EOS (End of Stream)
        ws.send(JSON.stringify({ text: '' }));
      };

      ws.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data);

          if (response.audio) {
            // Audio chunk received (base64 encoded)
            const audioData = Uint8Array.from(atob(response.audio), c => c.charCodeAt(0));
            audioChunks.push(audioData.buffer);
          }

          if (response.isFinal) {
            isComplete = true;
            ws.close();
          }

          if (response.error) {
            console.error('[ElevenLabs] WebSocket error:', response.error);
            clearTimeout(timeout);
            ws.close();
            reject(new Error(`ElevenLabs error: ${response.error}`));
          }
        } catch (error) {
          console.error('[ElevenLabs] Message parsing error:', error);
        }
      };

      ws.onclose = async () => {
        clearTimeout(timeout);
        console.log('[ElevenLabs] WebSocket closed');

        if (isComplete && audioChunks.length > 0) {
          try {
            // Concatenate all audio chunks
            const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
            const combinedAudio = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of audioChunks) {
              combinedAudio.set(new Uint8Array(chunk), offset);
              offset += chunk.byteLength;
            }

            console.log('[ElevenLabs] Combined audio:', combinedAudio.byteLength, 'bytes');

            // Decode MP3 to AudioBuffer
            const audioContext = this.getAudioContext();
            const audioBuffer = await decodeMP3(combinedAudio.buffer, audioContext);

            console.log('[ElevenLabs] Audio decoded successfully:', audioBuffer.duration.toFixed(2), 'seconds');
            resolve(audioBuffer);
          } catch (error) {
            console.error('[ElevenLabs] Audio decoding error:', error);
            reject(error);
          }
        } else if (!isComplete) {
          reject(new Error('ElevenLabs WebSocket closed before completion'));
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[ElevenLabs] WebSocket error:', error);
        reject(new Error('ElevenLabs WebSocket connection failed'));
      };
    });
  } */

  /**
   * Get list of supported voices
   */
  getSupportedVoices(): Voice[] {
    return ELEVENLABS_VOICES;
  }

  /**
   * Get default voice for a gender
   * Returns custom Jio voices as default
   */
  getDefaultVoice(gender: 'male' | 'female'): string {
    // Custom Jio voices
    if (gender === 'male') {
      return 'xMagNCpMgZ83QOEsHNre'; // Jio Male
    }
    return '90ipbRoKi4CpHXvKVtl0'; // Jio Female
  }

  /**
   * Check if provider is ready (API key configured)
   */
  isReady(): boolean {
    return isElevenLabsConfigured();
  }

  /**
   * Clean up resources
   */
  disconnect(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
