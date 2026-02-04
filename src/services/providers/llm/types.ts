/**
 * Enhanced LLM Provider Types
 * Production-ready with error handling, usage tracking, and streaming support
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface LLMGenerateOptions {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  signal?: AbortSignal; // Request cancellation support
  stream?: boolean;      // Streaming mode
  metadata?: {           // Request metadata for tracking
    requestId?: string;
    userId?: string;
    tags?: string[];
  };
}

export interface LLMUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  model: string;
  provider: string;
  timestamp: number;
}

export interface LLMGenerateResult {
  content: string;
  usage: LLMUsageMetrics;
}

export interface LLMError extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;
  provider: string;
  details?: Record<string, unknown>;
}

export interface LLMProvider {
  readonly name: string;
  readonly displayName: string;
  readonly supportsStreaming: boolean;
  readonly maxTokens: number;
  readonly costPer1kTokens: number;
  
  generate(options: LLMGenerateOptions): Promise<LLMGenerateResult>;
  
  generateStream?(
    options: LLMGenerateOptions,
    onChunk: (text: string) => void,
    onUsage?: (usage: LLMUsageMetrics) => void
  ): Promise<string>;
  
  isReady(): boolean;
  healthCheck(): Promise<boolean>;
  disconnect(): void;
}

export type LLMProviderType = 
  | 'openai' 
  | 'claude' 
  | 'gemini-text' 
  | 'qwen-text' 
  | 'inworld'
  | 'huggingface';

// Standard error codes across all providers
export const ERROR_CODES = {
  // Rate limiting
  RATE_LIMIT: 'RATE_LIMIT',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // Authentication
  INVALID_API_KEY: 'INVALID_API_KEY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Request errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  CONTEXT_LENGTH_EXCEEDED: 'CONTEXT_LENGTH_EXCEEDED',
  CONTENT_FILTER: 'CONTENT_FILTER',
  
  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Provider-specific
  OVERLOADED: 'OVERLOADED', // Claude 529
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Helper to create standardized LLM errors
export function createLLMError(
  message: string,
  code: ErrorCode,
  provider: string,
  retryable: boolean,
  details?: Record<string, unknown>
): LLMError {
  const error = new Error(message) as LLMError;
  error.code = code;
  error.provider = provider;
  error.retryable = retryable;
  error.details = details;
  error.name = 'LLMError';
  return error;
}
