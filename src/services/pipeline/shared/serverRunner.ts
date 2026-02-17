/**
 * Server Pipeline Runner
 * 
 * Executes the generation pipeline in a server (Vercel serverless) context.
 * 
 * Key differences from client-side execution:
 * - Uses AbortController with timeout instead of client-provided signal
 * - Creates LLM providers directly instead of receiving from React
 * - Receives external data as parameter instead of React hooks
 * - Emits SSE events for streaming instead of React state callbacks
 * 
 * Phase 6A: Foundation for /api/generate endpoint.
 */

import type { 
  ServerPipelineInput, 
  ServerPipelineResult, 
  ServerPipelineMetadata,
  ServerExternalData,
  SSEEvent 
} from './types';
import type { PipelineInput, ClassifyResult } from '../types';
import type { LLMProviderType, LLMProvider } from '../../providers/llm';

import { classify } from '../steps/classify';
import { safetyCheck } from '../steps/safetyCheck';
import { retrieve } from '../steps/retrieve';
import { assemble } from '../steps/assemble';
import { generate } from '../steps/generate';
import { validate } from '../steps/validate';
import { finalize } from '../steps/finalize';
import { createLLMProvider } from '../../providers/llm';
import { createPipelineTimer } from '../observability';
import { ERROR_CODES } from '../../providers/llm/types';

const MAX_RETRIES = 1;
const DEFAULT_TIMEOUT_MS = 55000; // 55 seconds, leaving buffer for Vercel's 60s limit

/**
 * Run the pipeline server-side with full timeout and abort handling.
 */
export async function runPipelineServer(
  input: ServerPipelineInput,
  externalData: ServerExternalData,
  options?: {
    /** Callback for SSE streaming events */
    onEvent?: (event: SSEEvent) => void;
    /** External abort signal (e.g., from client disconnect) */
    abortSignal?: AbortSignal;
    /** Semantic search function injected from Convex */
    runSemanticSearch?: (...args: unknown[]) => Promise<unknown>;
  }
): Promise<ServerPipelineResult> {
  const timer = createPipelineTimer();
  const stepTimings: ServerPipelineMetadata['stepTimings'] = {};
  const startedAt = Date.now();
  const requestId = input.requestId || generateRequestId();
  let retryCount = 0;

  // Create timeout controller
  const timeoutMs = input.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error(`Pipeline timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  // Combine external abort signal with timeout
  const combinedSignal = combineAbortSignals(
    timeoutController.signal,
    options?.abortSignal
  );

  try {
    // Convert to internal PipelineInput format
    const pipelineInput = toInternalInput(input, externalData, combinedSignal, options);

    // 1. Classify intent
    const classifyStart = Date.now();
    const classification = classify(pipelineInput);
    stepTimings.classify = Date.now() - classifyStart;

    // Check for abort
    if (combinedSignal.aborted) {
      throw new AbortError('Pipeline aborted');
    }

    // 2. Safety check (hard stop)
    const safetyStart = Date.now();
    const safety = safetyCheck(pipelineInput);
    stepTimings.safety = Date.now() - safetyStart;

    if (!safety.passed) {
      clearTimeout(timeoutId);
      const metadata = buildServerMetadata(requestId, timer.stop(), startedAt, 'unknown', 0, classification, undefined, stepTimings);
      
      const result: ServerPipelineResult = {
        success: true,
        output: safety.emergencyResponse || "I'm sorry, but I'm not able to help with that request.",
        pipelinePath: safety.emergencyResponse ? 'emergency_response' : 'safety_blocked',
        validation: null,
        trustScore: null,
        evidence: null,
        autoFixPreview: null,
        validationSummary: null,
        retryCount: 0,
        metadata,
        intent: classification.intent,
      };

      options?.onEvent?.({ type: 'complete', result });
      return result;
    }

    // Check if this is general chat (skip heavy processing)
    const isGeneralChat = classification.intent === 'general_chat';

    // 3. Retrieve knowledge context (skip for general_chat - no brand rules needed)
    const retrieveStart = Date.now();
    const retrieval = isGeneralChat
      ? { knowledge: null, retrievalCount: 0 }
      : await retrieve(pipelineInput);
    stepTimings.retrieve = Date.now() - retrieveStart;

    if (combinedSignal.aborted) {
      throw new AbortError('Pipeline aborted');
    }

    // 4. Assemble prompt
    const assembleStart = Date.now();
    const assembled = assemble(pipelineInput, classification, retrieval.knowledge);
    stepTimings.assemble = Date.now() - assembleStart;

    // 5. Generate content with streaming
    const generateStart = Date.now();
    let generated = await generateWithStreaming(
      pipelineInput,
      assembled.systemPrompt,
      classification,
      combinedSignal,
      options?.onEvent
    );
    stepTimings.generate = Date.now() - generateStart;

    if (combinedSignal.aborted) {
      throw new AbortError('Pipeline aborted');
    }

    // 6. Validate (skip for general_chat - LLM already uses Jio tone via BASE_PERSONA)
    const validateStart = Date.now();
    let validation;
    if (isGeneralChat) {
      // Skip validation for general conversation
      validation = {
        content: generated.content,
        passed: true,
        validation: null,
        trustScore: null,
        autoFixPreview: null,
        validationSummary: null,
      };
      // Emit validation event for consistency (UI expects this event)
      options?.onEvent?.({
        type: 'validation',
        passed: true,
        score: null,
        issueCount: 0,
      });
    } else {
      validation = await validate(pipelineInput, generated.content, assembled);

      // Emit validation event
      options?.onEvent?.({
        type: 'validation',
        passed: validation.passed,
        score: validation.trustScore?.overall ?? null,
        issueCount: (validation.validationSummary?.warningCount ?? 0) + (validation.validationSummary?.errorCount ?? 0),
      });

      // 7. Retry if validation failed
      if (!validation.passed && retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`[ServerPipeline] Validation failed, retrying (${retryCount}/${MAX_RETRIES})`);
        
        generated = await generateWithStreaming(
          pipelineInput,
          assembled.systemPrompt,
          classification,
          combinedSignal,
          options?.onEvent
        );
        validation = await validate(pipelineInput, generated.content, assembled);
        
        options?.onEvent?.({
          type: 'validation',
          passed: validation.passed,
          score: validation.trustScore?.overall ?? null,
          issueCount: (validation.validationSummary?.warningCount ?? 0) + (validation.validationSummary?.errorCount ?? 0),
        });
      }
    }
    stepTimings.validate = Date.now() - validateStart;

    // 8. Finalize
    const finalizeStart = Date.now();
    const finalized = finalize(validation.content, pipelineInput, classification, assembled);
    stepTimings.finalize = Date.now() - finalizeStart;

    clearTimeout(timeoutId);

    const metadata = buildServerMetadata(
      requestId,
      timer.stop(),
      startedAt,
      generated.model,
      retrieval.retrievalCount,
      classification,
      generated.usage,
      stepTimings
    );

    const result: ServerPipelineResult = {
      success: true,
      output: finalized.content,
      pipelinePath: classification.intent,
      validation: validation.validation,
      trustScore: validation.trustScore,
      evidence: null,
      autoFixPreview: validation.autoFixPreview,
      validationSummary: validation.validationSummary,
      retryCount,
      metadata,
      intent: classification.intent,
    };

    options?.onEvent?.({ type: 'complete', result });
    return result;

  } catch (error) {
    clearTimeout(timeoutId);
    
    const metadata = buildServerMetadata(requestId, timer.stop(), startedAt, 'error', 0, undefined, undefined, stepTimings);
    
    // Determine error code for HTTP status mapping
    const errorCode = getErrorCode(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const result: ServerPipelineResult = {
      success: false,
      output: '',
      pipelinePath: 'content_generation',
      validation: null,
      trustScore: null,
      evidence: null,
      autoFixPreview: null,
      validationSummary: null,
      retryCount,
      metadata,
      intent: null,
      error: errorMessage,
      errorCode,
    };

    options?.onEvent?.({
      type: 'error',
      message: errorMessage,
      code: errorCode,
      retryable: isRetryableError(error),
    });

    return result;
  }
}

// ── Helper Functions ───────────────────────────────────────────────────────

/**
 * Default feature flags for server-side pipeline execution.
 */
const DEFAULT_FEATURE_FLAGS = {
  conversationalMode: false,
  safetyGate: true,
  constitutionalWrapper: true,
  knowledgeBase: true,
  tokenEnforcement: true,
  semanticSearch: true,
  persona: true,
  learning: true,
  ragRetrieval: true,
};

/**
 * Convert ServerPipelineInput to internal PipelineInput format.
 */
function toInternalInput(
  serverInput: ServerPipelineInput,
  externalData: ServerExternalData,
  abortSignal: AbortSignal,
  options?: {
    runSemanticSearch?: (...args: unknown[]) => Promise<unknown>;
  }
): PipelineInput {
  return {
    message: serverInput.message,
    ecosystem: serverInput.ecosystem,
    contentChannel: serverInput.contentChannel,
    trustSettings: serverInput.trustSettings,
    temperature: serverInput.temperature,
    maxTokens: serverInput.maxTokens,
    stream: serverInput.stream,
    // Default to qwen-text if no provider specified
    llmProvider: serverInput.llmProvider || 'qwen-text',
    userProfile: serverInput.userProfile,
    // Ensure conversationHistory is always an array
    conversationHistory: serverInput.conversationHistory || [],
    // Apply default feature flags, allowing overrides from client
    featureFlags: {
      ...DEFAULT_FEATURE_FLAGS,
      ...serverInput.featureFlags,
    },
    abortSignal,
    // External data with semantic search function injected
    externalData: {
      ...externalData,
      runSemanticSearch: options?.runSemanticSearch,
    },
    // Server creates LLM providers directly
    createLLMProvider: (type: LLMProviderType): LLMProvider => {
      return createLLMProvider(type);
    },
    // No callbacks - streaming handled via SSE events
    callbacks: undefined,
  };
}

/**
 * Generate content with SSE streaming support.
 */
async function generateWithStreaming(
  input: PipelineInput,
  systemPrompt: string,
  classification: ClassifyResult,
  abortSignal: AbortSignal,
  onEvent?: (event: SSEEvent) => void
): Promise<{ content: string; model: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }> {
  // Create streaming callbacks if onEvent is provided
  if (onEvent && input.stream) {
    input.callbacks = {
      onStreamChunk: (accumulatedText: string) => {
        onEvent({ type: 'chunk', content: accumulatedText });
      },
    };
  }

  // Pass abort signal to generate step
  const inputWithSignal: PipelineInput = {
    ...input,
    abortSignal,
  };

  return generate(inputWithSignal, systemPrompt, classification);
}

/**
 * Build server-specific metadata.
 */
function buildServerMetadata(
  requestId: string,
  latencyMs: number,
  startedAt: number,
  model: string,
  retrievalCount: number,
  classification?: ClassifyResult,
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number },
  stepTimings?: ServerPipelineMetadata['stepTimings']
): ServerPipelineMetadata {
  return {
    requestId,
    model,
    latencyMs,
    retrievalCount,
    tokensUsed: {
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      totalTokens: usage?.totalTokens,
    },
    effectiveEcosystem: classification?.detectedEcosystem || 'jio_platforms',
    effectiveChannel: classification?.detectedChannel || 'push_notification',
    startedAt,
    completedAt: Date.now(),
    stepTimings,
  };
}

/**
 * Combine multiple abort signals into one.
 */
function combineAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener('abort', () => {
      controller.abort(signal.reason);
    }, { once: true });
  }
  
  return controller.signal;
}

/**
 * Generate unique request ID.
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `srv_${timestamp}_${random}`;
}

/**
 * Extract error code from various error types.
 */
function getErrorCode(error: unknown): string {
  if (error instanceof AbortError) {
    return ERROR_CODES.TIMEOUT;
  }
  
  // Check for LLMError structure
  const llmError = error as { code?: string };
  if (llmError.code && typeof llmError.code === 'string') {
    return llmError.code;
  }
  
  // Generic error detection
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('timeout')) return ERROR_CODES.TIMEOUT;
  if (message.includes('rate limit')) return ERROR_CODES.RATE_LIMIT;
  if (message.includes('unauthorized') || message.includes('api key')) return ERROR_CODES.INVALID_API_KEY;
  if (message.includes('context') && message.includes('length')) return ERROR_CODES.CONTEXT_LENGTH_EXCEEDED;
  
  return ERROR_CODES.SERVER_ERROR;
}

/**
 * Check if error is retryable.
 */
function isRetryableError(error: unknown): boolean {
  const llmError = error as { retryable?: boolean };
  if (typeof llmError.retryable === 'boolean') {
    return llmError.retryable;
  }
  
  const code = getErrorCode(error);
  const retryableCodes = [
    ERROR_CODES.RATE_LIMIT,
    ERROR_CODES.TIMEOUT,
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    ERROR_CODES.OVERLOADED,
  ];
  
  return retryableCodes.includes(code);
}

/**
 * Custom abort error for cleaner handling.
 */
class AbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AbortError';
  }
}

export { AbortError };
