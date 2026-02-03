import type { TTSProvider, VoiceConfig } from '../types';
import type { Voice } from '../../../types';
import { VoiceGender } from '../../../types';
import { GEMINI_VOICES, getGeminiVoiceByGender, getTTSInstruction } from '../../../constants';
import { getGeminiConfig, isGeminiConfigured } from '../../../config/providers';
import { createAudioContext, decodeAudioData, decode } from '../../audioUtils';

/**
 * Gemini TTS Provider Implementation
 * Uses Google Generative AI API for text-to-speech synthesis
 */
export class GeminiTTSProvider implements TTSProvider {
  readonly name = 'gemini';
  readonly displayName = 'Google Gemini';

  private config = getGeminiConfig();
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = createAudioContext(24000);
    }
    return this.audioContext;
  }

  /**
   * Synthesize text to audio using Gemini API
   */
  async synthesize(text: string, voiceConfig: VoiceConfig): Promise<AudioBuffer> {
    if (!this.isReady()) {
      throw new Error('Gemini provider is not configured. Please set VITE_GEMINI_API_KEY.');
    }

    const systemInstruction = getTTSInstruction();
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.ttsModel}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text }],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceConfig.voice,
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini TTS request failed: ${error}`);
    }

    const data = await response.json();

    // Extract audio data from response
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      throw new Error('No audio data in Gemini response');
    }

    // Decode base64 audio data (PCM16)
    const pcmData = decode(audioData);
    const audioBuffer = decodeAudioData(
      pcmData,
      this.getAudioContext(),
      voiceConfig.sampleRate || 24000,
      1
    );

    return audioBuffer;
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

  disconnect(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Create a new Gemini TTS provider instance
 */
export function createGeminiTTSProvider(): TTSProvider {
  return new GeminiTTSProvider();
}
