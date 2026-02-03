import type { ProviderType } from '../services/providers/types';

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

/**
 * Full provider configuration
 */
export interface ProviderConfig {
  tts: {
    provider: ProviderType;
    alibaba: AlibabaConfig;
    gemini: GeminiConfig;
  };
  conversation: {
    provider: ProviderType;
    alibaba: AlibabaConfig;
    gemini: GeminiConfig;
  };
}

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, fallback: string = ''): string {
  // Access from Vite's import.meta.env
  const value = import.meta.env[key];
  return value !== undefined ? String(value) : fallback;
}

/**
 * Get the configured TTS provider type
 */
export function getTTSProviderType(): ProviderType {
  const provider = getEnv('VITE_TTS_PROVIDER', 'alibaba');
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
 */
export function getDashScopeApiKey(): string {
  return getEnv('VITE_DASHSCOPE_API_KEY', '');
}

/**
 * Get Google Gemini API key
 */
export function getGeminiApiKey(): string {
  return getEnv('VITE_GEMINI_API_KEY', '');
}

/**
 * Check if Alibaba provider is configured
 */
export function isAlibabaConfigured(): boolean {
  return getDashScopeApiKey().length > 0;
}

/**
 * Check if Gemini provider is configured
 */
export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().length > 0;
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
 * Get proxy server configuration
 * The proxy is needed because:
 * - Browser WebSockets cannot send custom Authorization headers
 * - Browser fetch requests are blocked by CORS policy
 */
export function getProxyConfig(): ProxyConfig {
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
 * Get the full provider configuration
 */
export function getProviderConfig(): ProviderConfig {
  const alibabaConfig = getAlibabaConfig();
  const geminiConfig = getGeminiConfig();

  return {
    tts: {
      provider: getTTSProviderType(),
      alibaba: alibabaConfig,
      gemini: geminiConfig,
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
    default:
      return provider;
  }
}
