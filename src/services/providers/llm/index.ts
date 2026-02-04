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

// Re-export types and utilities
export * from './types';
export { createOpenAIProvider } from './openai';
export { createClaudeProvider } from './claude';
export { createGeminiTextProvider } from './gemini';
export { createQwenTextProvider } from './qwen';
export { createInworldLLMProvider } from './inworldLLM';

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
    
    default:
      throw new Error(`Unknown LLM provider type: ${type}`);
  }
}

/**
 * Get available LLM providers with configuration status
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
    checkEnvKey: string;
    supportsStreaming: boolean;
  }> = [
    { 
      type: 'openai', 
      name: 'openai', 
      displayName: 'OpenAI (ChatGPT)', 
      checkEnvKey: 'VITE_OPENAI_API_KEY',
      supportsStreaming: true,
    },
    { 
      type: 'claude', 
      name: 'claude', 
      displayName: 'Anthropic (Claude)', 
      checkEnvKey: 'VITE_CLAUDE_API_KEY',
      supportsStreaming: true,
    },
    { 
      type: 'gemini-text', 
      name: 'gemini-text', 
      displayName: 'Google Gemini', 
      checkEnvKey: 'VITE_GEMINI_API_KEY',
      supportsStreaming: true,
    },
    { 
      type: 'qwen-text', 
      name: 'qwen-text', 
      displayName: 'Alibaba Qwen', 
      checkEnvKey: 'VITE_DASHSCOPE_API_KEY',
      supportsStreaming: false,
    },
    { 
      type: 'inworld', 
      name: 'inworld', 
      displayName: 'Inworld AI', 
      checkEnvKey: 'VITE_INWORLD_API_KEY',
      supportsStreaming: false,
    },
  ];

  return providers.map(p => ({
    type: p.type,
    name: p.name,
    displayName: p.displayName,
    isConfigured: Boolean(import.meta.env[p.checkEnvKey]),
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
  
  // Prefer in order: openai, claude, gemini, qwen, inworld
  const preferenceOrder: LLMProviderType[] = [
    'openai', 'claude', 'gemini-text', 'qwen-text', 'inworld'
  ];
  
  for (const type of preferenceOrder) {
    if (configured.some(p => p.type === type)) {
      return type;
    }
  }
  
  // Fallback to first configured or openai
  return configured[0]?.type || 'openai';
}

/**
 * Check if a specific LLM provider is configured
 */
export function isLLMProviderConfigured(type: LLMProviderType): boolean {
  return getAvailableLLMProviders()
    .find(p => p.type === type)
    ?.isConfigured ?? false;
}
