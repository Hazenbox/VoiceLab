import type { TTSProvider } from '../types';
import { ElevenLabsTTSProvider } from './tts';

/**
 * Create an ElevenLabs TTS provider instance
 */
export function createElevenLabsTTSProvider(): TTSProvider {
  return new ElevenLabsTTSProvider();
}

// Re-export the provider class
export { ElevenLabsTTSProvider };
