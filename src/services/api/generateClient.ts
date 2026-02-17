/**
 * Generate API Client
 * 
 * Frontend client for calling the /api/generate endpoint.
 * Supports both streaming (SSE) and non-streaming modes.
 * 
 * Phase 6C: Frontend integration for server-side pipeline.
 */

import { getApiBaseUrl, getInternalApiKey } from '../../config/providers';
import type { 
  ServerPipelineInput, 
  ServerPipelineResult,
  SSEEvent,
  SSEChunkEvent,
  SSEValidationEvent,
  SSECompleteEvent,
  SSEErrorEvent,
} from '../pipeline/shared/types';

export interface GenerateAPICallbacks {
  /** Called with accumulated text during streaming */
  onChunk?: (accumulatedText: string) => void;
  /** Called when validation results are available */
  onValidation?: (result: { passed: boolean; score: number | null; issueCount: number }) => void;
  /** Called on error (streaming mode only) */
  onError?: (error: { message: string; code: string; retryable: boolean }) => void;
  /** Called when generation completes */
  onComplete?: (result: ServerPipelineResult) => void;
}

export interface GenerateAPIOptions {
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
  /** Enable streaming mode (default: true) */
  stream?: boolean;
}

/**
 * Call the /api/generate endpoint.
 * 
 * @param input - Pipeline input configuration
 * @param callbacks - Streaming callbacks
 * @param options - Request options
 * @returns Pipeline result
 */
export async function generateViaAPI(
  input: ServerPipelineInput,
  callbacks?: GenerateAPICallbacks,
  options?: GenerateAPIOptions
): Promise<ServerPipelineResult> {
  const baseUrl = getApiBaseUrl();
  const apiKey = getInternalApiKey();
  const stream = options?.stream ?? true;
  
  const url = `${baseUrl}/api/generate${stream ? '?stream=true' : ''}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({ input }),
    signal: options?.signal,
  });
  
  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new GenerateAPIError(error.error, error.code, error.retryable);
  }
  
  if (stream) {
    return handleStreamingResponse(response, callbacks);
  } else {
    return handleNonStreamingResponse(response, callbacks);
  }
}

/**
 * Handle streaming SSE response.
 */
async function handleStreamingResponse(
  response: Response,
  callbacks?: GenerateAPICallbacks
): Promise<ServerPipelineResult> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new GenerateAPIError('No response body', 'NO_BODY', false);
  }
  
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: ServerPipelineResult | null = null;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        
        const data = trimmed.slice(5).trim();
        
        // Handle done marker
        if (data === '[DONE]') {
          continue;
        }
        
        try {
          const event = JSON.parse(data) as SSEEvent;
          finalResult = processSSEEvent(event, callbacks, finalResult);
        } catch {
          // Skip malformed JSON
          console.warn('[GenerateClient] Malformed SSE data:', data);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  if (!finalResult) {
    throw new GenerateAPIError('No result received from stream', 'NO_RESULT', false);
  }
  
  return finalResult;
}

/**
 * Process a single SSE event.
 */
function processSSEEvent(
  event: SSEEvent,
  callbacks?: GenerateAPICallbacks,
  currentResult: ServerPipelineResult | null = null
): ServerPipelineResult | null {
  switch (event.type) {
    case 'chunk': {
      const chunkEvent = event as SSEChunkEvent;
      callbacks?.onChunk?.(chunkEvent.content);
      return currentResult;
    }
    
    case 'validation': {
      const validationEvent = event as SSEValidationEvent;
      callbacks?.onValidation?.({
        passed: validationEvent.passed,
        score: validationEvent.score,
        issueCount: validationEvent.issueCount,
      });
      return currentResult;
    }
    
    case 'complete': {
      const completeEvent = event as SSECompleteEvent;
      callbacks?.onComplete?.(completeEvent.result);
      return completeEvent.result;
    }
    
    case 'error': {
      const errorEvent = event as SSEErrorEvent;
      callbacks?.onError?.({
        message: errorEvent.message,
        code: errorEvent.code,
        retryable: errorEvent.retryable,
      });
      throw new GenerateAPIError(errorEvent.message, errorEvent.code, errorEvent.retryable);
    }
    
    default:
      return currentResult;
  }
}

/**
 * Handle non-streaming response.
 */
async function handleNonStreamingResponse(
  response: Response,
  callbacks?: GenerateAPICallbacks
): Promise<ServerPipelineResult> {
  const data = await response.json();
  
  if (!data.result) {
    throw new GenerateAPIError('No result in response', 'NO_RESULT', false);
  }
  
  callbacks?.onComplete?.(data.result);
  return data.result;
}

/**
 * Parse error response from API.
 */
async function parseErrorResponse(response: Response): Promise<{
  error: string;
  code: string;
  retryable: boolean;
}> {
  try {
    const data = await response.json();
    return {
      error: data.error || `HTTP ${response.status}`,
      code: data.code || `HTTP_${response.status}`,
      retryable: data.retryable ?? false,
    };
  } catch {
    return {
      error: `HTTP ${response.status}: ${response.statusText}`,
      code: `HTTP_${response.status}`,
      retryable: response.status >= 500,
    };
  }
}

/**
 * Custom error class for Generate API errors.
 */
export class GenerateAPIError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  
  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = 'GenerateAPIError';
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Helper to convert client PipelineInput to ServerPipelineInput.
 * Use this when transitioning from client-side to server-side pipeline.
 */
export function convertToServerInput(
  clientInput: {
    message: string;
    ecosystem: string;
    contentChannel: string;
    trustSettings: unknown;
    temperature: number;
    maxTokens: number;
    stream: boolean;
    llmProvider: string;
    userProfile?: { role?: string; name?: string; userId?: string; deviceId?: string };
    conversationHistory: Array<{ role: string; content: string }>;
    featureFlags: Record<string, boolean>;
  }
): ServerPipelineInput {
  return {
    message: clientInput.message,
    ecosystem: clientInput.ecosystem as ServerPipelineInput['ecosystem'],
    contentChannel: clientInput.contentChannel as ServerPipelineInput['contentChannel'],
    trustSettings: clientInput.trustSettings as ServerPipelineInput['trustSettings'],
    temperature: clientInput.temperature,
    maxTokens: clientInput.maxTokens,
    stream: clientInput.stream,
    llmProvider: clientInput.llmProvider as ServerPipelineInput['llmProvider'],
    userProfile: clientInput.userProfile,
    conversationHistory: clientInput.conversationHistory,
    featureFlags: clientInput.featureFlags as ServerPipelineInput['featureFlags'],
    timeoutMs: 55000, // Default timeout
  };
}

export default generateViaAPI;
