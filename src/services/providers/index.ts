import type { TTSProvider, ConversationProvider, ProviderType } from './types';
import { createCosyVoiceTTSProvider, createAlibabaConversationProvider } from './alibaba';
import { createGeminiTTSProvider, createGeminiLiveProvider } from './gemini';
import { createElevenLabsTTSProvider } from './elevenlabs';
import { createBrowserConversationProvider, isWebSpeechSupported } from './browser';
import { getTTSProviderType, getConversationProviderType, isProduction } from '../../config/providers';

// Re-export types
export * from './types';

// Re-export browser provider utilities
export { isWebSpeechSupported } from './browser';

/**
 * Create a TTS provider instance based on type
 */
export function createTTSProvider(type?: ProviderType): TTSProvider {
  const providerType = type || getTTSProviderType();

  switch (providerType) {
    case 'alibaba':
      return createCosyVoiceTTSProvider();
    
    case 'gemini':
      return createGeminiTTSProvider();
    
    case 'elevenlabs':
      return createElevenLabsTTSProvider();
    
    default:
      throw new Error(`Unknown TTS provider type: ${providerType}`);
  }
}

/**
 * Create a Conversation provider instance based on type
 * 
 * In production (Vercel), automatically uses the browser-based provider
 * since WebSocket connections are not supported on serverless platforms.
 * The browser provider uses Web Speech API for ASR + HTTP-based LLM and TTS.
 */
export function createConversationProvider(type?: ProviderType): ConversationProvider {
  // In production (Vercel), use browser provider since WebSocket doesn't work
  // Both Alibaba and Gemini conversation providers use WebSocket
  if (isProduction()) {
    if (!isWebSpeechSupported()) {
      throw new Error(
        'Voice conversation requires Chrome, Edge, or Safari. ' +
        'Firefox users: enable "media.webspeech.recognition.enable" in about:config.'
      );
    }
    console.log('[Provider] Production detected - using browser speech recognition');
    return createBrowserConversationProvider();
  }

  // Development - use configured provider (WebSocket-based)
  const providerType = type || getConversationProviderType();
  console.log(`[Provider] Development mode - using ${providerType} provider`);

  switch (providerType) {
    case 'alibaba':
      return createAlibabaConversationProvider();
    
    case 'gemini':
      return createGeminiLiveProvider();
    
    default:
      throw new Error(`Unknown Conversation provider type: ${providerType}`);
  }
}

/**
 * Get the current TTS provider type from config
 */
export function getCurrentTTSProviderType(): ProviderType {
  return getTTSProviderType();
}

/**
 * Get the current Conversation provider type from config
 */
export function getCurrentConversationProviderType(): ProviderType {
  return getConversationProviderType();
}
