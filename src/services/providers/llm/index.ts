/**
 * LLM Provider Factory
 * Creates and manages LLM provider instances
 */

import type { LLMProvider, LLMProviderType } from './types';
import { createOpenAIProvider } from './openai';
import { createClaudeProvider } from './claude';
import { createGeminiTextProvider } from './gemini';
import { createQwenTextProvider } from './qwen';
import { createInworldLLMProvider } from './inworldLLM';
import { createHuggingFaceProvider } from './huggingface';
import { getEnv, isServer, isProduction as checkIsProduction } from '../../env';

// Re-export types and utilities
export * from './types';
export { createOpenAIProvider } from './openai';
export { createClaudeProvider } from './claude';
export { createGeminiTextProvider } from './gemini';
export { createQwenTextProvider } from './qwen';
export { createInworldLLMProvider } from './inworldLLM';
export { createHuggingFaceProvider, HF_MODELS, type HFModelKey } from './huggingface';

/**
 * Create an LLM provider by type
 */
export function createLLMProvider(type: LLMProviderType): LLMProvider {
  switch (type) {
    case 'openai':
      return createOpenAIProvider();
    
    case 'claude':
      return createClaudeProvider();
    
    case 'gemini-text':
      return createGeminiTextProvider();
    
    case 'qwen-text':
      return createQwenTextProvider();
    
    case 'inworld':
      return createInworldLLMProvider();
    
    case 'huggingface':
      return createHuggingFaceProvider();
    
    default:
      throw new Error(`Unknown LLM provider type: ${type}`);
  }
}

/**
 * Check if running in production (isomorphic)
 */
function isProductionEnv(): boolean {
  // Use isomorphic check from env.ts
  return checkIsProduction();
}

/**
 * Get available LLM providers with configuration status
 * In production: all providers are considered configured (server has keys)
 * In development: all providers are configured if proxy is set up
 */
export function getAvailableLLMProviders(): Array<{
  type: LLMProviderType;
  name: string;
  displayName: string;
  isConfigured: boolean;
  supportsStreaming: boolean;
}> {
  const providers: Array<{
    type: LLMProviderType;
    name: string;
    displayName: string;
    supportsStreaming: boolean;
  }> = [
    { 
      type: 'openai', 
      name: 'openai', 
      displayName: 'OpenAI (ChatGPT)', 
      supportsStreaming: true,
    },
    { 
      type: 'claude', 
      name: 'claude', 
      displayName: 'Anthropic (Claude)', 
      supportsStreaming: true,
    },
    { 
      type: 'gemini-text', 
      name: 'gemini-text', 
      displayName: 'Google Gemini', 
      supportsStreaming: true,
    },
    { 
      type: 'qwen-text', 
      name: 'qwen-text', 
      displayName: 'Alibaba Qwen', 
      supportsStreaming: false,
    },
    { 
      type: 'inworld', 
      name: 'inworld', 
      displayName: 'Inworld AI', 
      supportsStreaming: false,
    },
    { 
      type: 'huggingface', 
      name: 'huggingface', 
      displayName: 'Hugging Face', 
      supportsStreaming: true,
    },
  ];

  // On server, always consider configured (server has API keys)
  // In production client, server-side keys are configured via Vercel env vars
  // In development client, assume configured if proxy port is set
  const isConfigured = isServer || isProductionEnv() || Boolean(getEnv('WS_PROXY_PORT'));

  return providers.map(p => ({
    type: p.type,
    name: p.name,
    displayName: p.displayName,
    isConfigured,
    supportsStreaming: p.supportsStreaming,
  }));
}

/**
 * Get configured LLM providers only
 */
export function getConfiguredLLMProviders(): Array<{
  type: LLMProviderType;
  name: string;
  displayName: string;
  supportsStreaming: boolean;
}> {
  return getAvailableLLMProviders()
    .filter(p => p.isConfigured)
    .map(({ type, name, displayName, supportsStreaming }) => ({ 
      type, name, displayName, supportsStreaming 
    }));
}

/**
 * Get the default LLM provider type based on configuration
 */
export function getDefaultLLMProviderType(): LLMProviderType {
  const configured = getConfiguredLLMProviders();
  
  // Prefer in order: qwen (DashScope), huggingface (free), gemini, inworld
  // Note: OpenAI and Claude removed - requires separate API keys
  const preferenceOrder: LLMProviderType[] = [
    'qwen-text', 'huggingface', 'gemini-text', 'inworld'
  ];
  
  for (const type of preferenceOrder) {
    if (configured.some(p => p.type === type)) {
      return type;
    }
  }
  
  // Fallback to first configured or qwen-text
  return configured[0]?.type || 'qwen-text';
}

/**
 * Check if a specific LLM provider is configured
 */
export function isLLMProviderConfigured(type: LLMProviderType): boolean {
  return getAvailableLLMProviders()
    .find(p => p.type === type)
    ?.isConfigured ?? false;
}
