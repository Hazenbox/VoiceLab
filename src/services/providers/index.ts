import type { TTSProvider, ConversationProvider, ProviderType } from './types';
import { createCosyVoiceTTSProvider, createAlibabaConversationProvider } from './alibaba';
import { createGeminiTTSProvider, createGeminiLiveProvider } from './gemini';
import { getTTSProviderType, getConversationProviderType } from '../../config/providers';

// Re-export types
export * from './types';

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
    
    default:
      throw new Error(`Unknown TTS provider type: ${providerType}`);
  }
}

/**
 * Create a Conversation provider instance based on type
 */
export function createConversationProvider(type?: ProviderType): ConversationProvider {
  const providerType = type || getConversationProviderType();

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
