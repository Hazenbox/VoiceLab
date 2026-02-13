import type { TTSProvider, ConversationProvider, ProviderType, TTSConfig } from './types';
import { createCosyVoiceTTSProvider, createAlibabaConversationProvider } from './alibaba';
import { createGeminiTTSProvider, createGeminiLiveProvider } from './gemini';
import { createElevenLabsTTSProvider } from './elevenlabs';
import { createBrowserConversationProvider, isWebSpeechSupported } from './browser';
import { getTTSProviderType, getConversationProviderType, isProduction } from '../../config/providers';

// Re-export types
export * from './types';

// Re-export browser provider utilities
export { isWebSpeechSupported } from './browser';

// ── TTS Fallback Configuration ─────────────────────────────────
// Defines the fallback order when primary TTS fails
const TTS_FALLBACK_CHAIN: ProviderType[] = ['elevenlabs', 'gemini', 'alibaba'];

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
 * Create a TTS provider with fallback support (wiring orphaned pattern)
 * 
 * If the primary provider fails, automatically tries the next provider in the fallback chain.
 * Returns a wrapper that handles failover transparently.
 */
export function createTTSProviderWithFallback(
  primaryType?: ProviderType,
  customFallbackChain?: ProviderType[]
): TTSProvider {
  const primary = primaryType || getTTSProviderType();
  const fallbackChain = customFallbackChain || TTS_FALLBACK_CHAIN.filter(p => p !== primary);
  
  // Create all providers upfront
  const providers: { type: ProviderType; provider: TTSProvider | null }[] = [
    { type: primary, provider: null }, // Lazy initialize
    ...fallbackChain.map(type => ({ type, provider: null as TTSProvider | null })),
  ];
  
  // Track which providers have failed recently (simple circuit breaker)
  const failedProviders = new Set<ProviderType>();
  const failureResetTimeout = 60000; // 1 minute cooldown
  
  const getProvider = (type: ProviderType): TTSProvider | null => {
    const entry = providers.find(p => p.type === type);
    if (!entry) return null;
    
    if (!entry.provider) {
      try {
        entry.provider = createTTSProvider(type);
      } catch (e) {
        console.warn(`[TTSFallback] Failed to create ${type} provider:`, e);
        return null;
      }
    }
    return entry.provider;
  };
  
  // Return a wrapper that implements TTSProvider interface with fallback
  return {
    synthesize: async (text: string, config: TTSConfig): Promise<AudioBuffer> => {
      // Build list of providers to try (skip recently failed ones initially)
      const providersToTry = [primary, ...fallbackChain].filter(p => !failedProviders.has(p));
      
      // If all providers have failed, clear the failures and try again
      if (providersToTry.length === 0) {
        console.log('[TTSFallback] All providers previously failed, resetting and retrying');
        failedProviders.clear();
        providersToTry.push(primary, ...fallbackChain);
      }
      
      let lastError: Error | null = null;
      
      for (const providerType of providersToTry) {
        const provider = getProvider(providerType);
        if (!provider) continue;
        
        try {
          console.log(`[TTSFallback] Trying ${providerType}...`);
          const result = await provider.synthesize(text, config);
          
          // Success - clear any previous failures for this provider
          failedProviders.delete(providerType);
          
          if (providerType !== primary) {
            console.log(`[TTSFallback] Successfully used fallback: ${providerType}`);
          }
          
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`[TTSFallback] ${providerType} failed:`, lastError.message);
          
          // Mark as failed (will be retried after cooldown)
          failedProviders.add(providerType);
          
          // Schedule removal from failed set after cooldown
          setTimeout(() => {
            failedProviders.delete(providerType);
            console.log(`[TTSFallback] ${providerType} cooldown expired, eligible for retry`);
          }, failureResetTimeout);
        }
      }
      
      // All providers failed
      throw lastError || new Error('All TTS providers failed');
    },
    
    // Health check uses primary provider
    healthCheck: async (): Promise<boolean> => {
      const provider = getProvider(primary);
      return provider?.healthCheck?.() ?? Promise.resolve(true);
    },
  };
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
