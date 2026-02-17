import type { ProviderType } from '../services/providers/types';
import { isProduction as envIsProduction, getEnv } from '../services/env';

/**
 * Provider-specific configuration
 */
export interface AlibabaConfig {
  apiKey: string;
  ttsModel: string;
  asrModel: string;
  llmModel: string;
  ttsEndpoint: string;
  asrEndpoint: string;
  region: 'beijing' | 'singapore';
}

/**
 * Proxy server configuration for WebSocket and HTTP connections
 * Browser WebSockets cannot send custom headers, and HTTP requests are blocked by CORS
 */
export interface ProxyConfig {
  wsProxyUrl: string;
  httpProxyUrl: string;
  wsProxyPort: number;
}

export interface GeminiConfig {
  apiKey: string;
  ttsModel: string;
  liveModel: string;
}

export interface ElevenLabsConfig {
  apiKey: string;
  defaultVoiceId: string;
  hindiVoiceId: string;
}

/**
 * Full provider configuration
 */
export interface ProviderConfig {
  tts: {
    provider: ProviderType;
    alibaba: AlibabaConfig;
    gemini: GeminiConfig;
    elevenlabs: ElevenLabsConfig;
  };
  conversation: {
    provider: ProviderType;
    alibaba: AlibabaConfig;
    gemini: GeminiConfig;
  };
}

// getEnv is now imported from '../services/env' for isomorphic env access

/**
 * Get the configured TTS provider type
 */
export function getTTSProviderType(): ProviderType {
  const provider = getEnv('VITE_TTS_PROVIDER', 'elevenlabs');
  if (provider === 'elevenlabs') return 'elevenlabs';
  return provider === 'gemini' ? 'gemini' : 'alibaba';
}

/**
 * Get the configured conversation provider type
 */
export function getConversationProviderType(): ProviderType {
  const provider = getEnv('VITE_CONVERSATION_PROVIDER', 'alibaba');
  return provider === 'gemini' ? 'gemini' : 'alibaba';
}

/**
 * Get Alibaba DashScope API key
 * NOTE: In production, keys are server-side only. This returns empty string
 * but isAlibabaConfigured() returns true in production.
 */
export function getDashScopeApiKey(): string {
  // API keys are now server-side only - return empty for client
  return '';
}

/**
 * Get Google Gemini API key
 * NOTE: In production, keys are server-side only.
 */
export function getGeminiApiKey(): string {
  // API keys are now server-side only - return empty for client
  return '';
}

/**
 * Get ElevenLabs API key
 * NOTE: In production, keys are server-side only.
 */
export function getElevenLabsApiKey(): string {
  // API keys are now server-side only - return empty for client
  return '';
}

/**
 * Check if Alibaba provider is configured
 * In production: always true (server has keys)
 * In development: check if proxy is running
 */
export function isAlibabaConfigured(): boolean {
  // In production, server-side keys are configured via Vercel env vars
  if (isProduction()) return true;
  // In development, assume configured if proxy is set up
  return getEnv('VITE_WS_PROXY_PORT', '').length > 0;
}

/**
 * Check if Gemini provider is configured
 */
export function isGeminiConfigured(): boolean {
  // In production, server-side keys are configured via Vercel env vars
  if (isProduction()) return true;
  // In development, assume configured if proxy is set up
  return getEnv('VITE_WS_PROXY_PORT', '').length > 0;
}

/**
 * Check if ElevenLabs provider is configured
 */
export function isElevenLabsConfigured(): boolean {
  // In production, server-side keys are configured via Vercel env vars
  if (isProduction()) return true;
  // In development, assume configured if proxy is set up
  return getEnv('VITE_WS_PROXY_PORT', '').length > 0;
}

/**
 * Get Alibaba configuration
 */
export function getAlibabaConfig(): AlibabaConfig {
  return {
    apiKey: getDashScopeApiKey(),
    ttsModel: 'cosyvoice-v3-flash',
    asrModel: 'qwen3-asr-flash-realtime',
    llmModel: 'qwen-turbo',
    ttsEndpoint: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/',
    asrEndpoint: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
    region: 'singapore', // Using international endpoint
  };
}

/**
 * Check if running in production (Vercel) environment
 * 
 * @deprecated Use `isProduction` from '../services/env' instead.
 * This wrapper exists for backward compatibility.
 */
export function isProduction(): boolean {
  // Use the unified env module that works on both client and server
  return envIsProduction();
}

/**
 * Get the base URL for API calls
 * In production (Vercel): use same-origin /api routes
 * In development: use local proxy server
 */
export function getApiBaseUrl(): string {
  if (isProduction()) {
    return ''; // Same-origin API routes on Vercel
  }
  const port = parseInt(getEnv('VITE_WS_PROXY_PORT', '3001'), 10);
  const host = getEnv('VITE_WS_PROXY_HOST', 'localhost');
  return `http://${host}:${port}`;
}

/**
 * Get internal API key for authenticated requests
 * This is bundled into the client - acceptable for internal tools only
 */
export function getInternalApiKey(): string {
  return getEnv('VITE_INTERNAL_API_KEY', '');
}

/**
 * Get default headers for API calls including authentication
 */
export function getApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const apiKey = getInternalApiKey();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  
  return headers;
}

/**
 * Get proxy server configuration
 * The proxy is needed because:
 * - Browser WebSockets cannot send custom Authorization headers
 * - Browser fetch requests are blocked by CORS policy
 */
export function getProxyConfig(): ProxyConfig {
  if (isProduction()) {
    // In production, use same-origin API routes
    return {
      wsProxyUrl: '', // WebSocket not supported on Vercel
      httpProxyUrl: '', // Same origin, no prefix needed
      wsProxyPort: 0,
    };
  }
  // Local development
  const port = parseInt(getEnv('VITE_WS_PROXY_PORT', '3001'), 10);
  const host = getEnv('VITE_WS_PROXY_HOST', 'localhost');
  return {
    wsProxyUrl: `ws://${host}:${port}`,
    httpProxyUrl: `http://${host}:${port}`,
    wsProxyPort: port,
  };
}

/**
 * Get Gemini configuration
 */
export function getGeminiConfig(): GeminiConfig {
  return {
    apiKey: getGeminiApiKey(),
    ttsModel: 'gemini-2.0-flash',
    liveModel: 'gemini-2.0-flash',
  };
}

/**
 * Get ElevenLabs configuration
 */
export function getElevenLabsConfig(): ElevenLabsConfig {
  return {
    apiKey: getElevenLabsApiKey(),
    defaultVoiceId: getEnv('VITE_ELEVENLABS_DEFAULT_VOICE', 'pNInz6obpgDQGcFmaJgB'), // Adam - natural male voice
    hindiVoiceId: getEnv('VITE_ELEVENLABS_HINDI_VOICE', 'pNInz6obpgDQGcFmaJgB'),
  };
}

/**
 * Get the full provider configuration
 */
export function getProviderConfig(): ProviderConfig {
  const alibabaConfig = getAlibabaConfig();
  const geminiConfig = getGeminiConfig();
  const elevenLabsConfig = getElevenLabsConfig();

  return {
    tts: {
      provider: getTTSProviderType(),
      alibaba: alibabaConfig,
      gemini: geminiConfig,
      elevenlabs: elevenLabsConfig,
    },
    conversation: {
      provider: getConversationProviderType(),
      alibaba: alibabaConfig,
      gemini: geminiConfig,
    },
  };
}

/**
 * Validate provider configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ttsProvider = getTTSProviderType();
  const convProvider = getConversationProviderType();

  if (ttsProvider === 'alibaba' && !isAlibabaConfigured()) {
    errors.push('Alibaba DashScope API key is required for TTS');
  }

  if (convProvider === 'alibaba' && !isAlibabaConfigured()) {
    errors.push('Alibaba DashScope API key is required for conversation');
  }

  if (ttsProvider === 'gemini' && !isGeminiConfigured()) {
    errors.push('Google Gemini API key is required for TTS');
  }

  if (convProvider === 'gemini' && !isGeminiConfigured()) {
    errors.push('Google Gemini API key is required for conversation');
  }

  if (ttsProvider === 'elevenlabs' && !isElevenLabsConfigured()) {
    errors.push('ElevenLabs API key is required for TTS');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get a human-readable provider name
 */
export function getProviderDisplayName(provider: ProviderType): string {
  switch (provider) {
    case 'alibaba':
      return 'Alibaba CosyVoice';
    case 'gemini':
      return 'Google Gemini';
    case 'elevenlabs':
      return 'ElevenLabs';
    default:
      return provider;
  }
}
