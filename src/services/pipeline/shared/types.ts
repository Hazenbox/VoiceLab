/**
 * Shared Pipeline Types
 * 
 * Types that work on both client (browser) and server (Vercel serverless).
 * These types are designed to be serializable for API communication.
 * 
 * Phase 6A: Enables the same pipeline code to run client-side or server-side.
 */

import type {
  EcosystemType,
  ContentChannelType,
  TrustSettings,
  TrustScore,
  GenerationEvidence,
  AutoFixPreview,
} from '../../../types';
import type { LLMProviderType } from '../../providers/llm';
import type { PipelineValidationResult } from '../../validation/types';

// ── Server Pipeline Input ──────────────────────────────────────────────────

/**
 * Input for server-side pipeline execution.
 * 
 * Key differences from client PipelineInput:
 * - No AbortSignal (uses timeoutMs instead)
 * - No callbacks (uses SSE streaming instead)
 * - No createLLMProvider factory (server creates providers internally)
 * - requestId for tracing across services
 */
export interface ServerPipelineInput {
  /** The user's message */
  message: string;

  /** Content trust configuration */
  ecosystem: EcosystemType;
  contentChannel: ContentChannelType;
  trustSettings: TrustSettings;

  /** Generation parameters */
  temperature: number;
  maxTokens: number;
  stream: boolean;
  llmProvider: LLMProviderType;

  /** User context */
  userProfile?: {
    role?: string;
    name?: string;
    userId?: string;
    deviceId?: string;
  };

  /** Conversation context (text messages only, last N) */
  conversationHistory: Array<{ role: string; content: string }>;

  /** Feature flags snapshot (immutable for the run) */
  featureFlags: ServerPipelineFeatureFlags;

  // ── Server-specific fields ───────────────────────────────────────────

  /** Request ID for distributed tracing */
  requestId?: string;

  /** Timeout in milliseconds (replaces AbortSignal) */
  timeoutMs?: number;
}

/**
 * Feature flags for server pipeline.
 * Same as client PipelineFeatureFlags.
 */
export interface ServerPipelineFeatureFlags {
  conversationalMode: boolean;
  safetyGate: boolean;
  constitutionalWrapper: boolean;
  knowledgeBase: boolean;
  learning: boolean;
  persona: boolean;
  ragQueryExpansion: boolean;
  ragResultRanking: boolean;
  conversationState: boolean;
  validateConversational: boolean;
  sessionAnalytics: boolean;
  responseTimeTracking: boolean;
}

/**
 * External data that server fetches from Convex.
 * Matches the client's PipelineExternalData but without function references.
 */
export interface ServerExternalData {
  knowledge?: {
    avoidWords?: string[];
    preferredWords?: string[];
    autoFixRules?: Array<{ content: string; metadata?: { suggestion?: string } }>;
    approvedExamples?: unknown[];
  };
  corrections?: unknown[];
  trainingExamples?: Array<{
    inputContext: string;
    outputContent: string;
    ecosystem?: string;
    channel?: string;
  }>;
  directiveOverrides?: Array<{
    directiveType: string;
    directiveKey: string;
    ecosystem?: string;
    channel?: string;
    overrideAction: string;
    overrideValue?: string;
    priority: number;
    reason?: string;
    isActive: boolean;
  }>;
  tokenEnforcementRules?: unknown[];
  userLearningProfile?: {
    userId: string;
    deviceId: string;
    avoidPatterns?: string[];
    preferredWarmth?: string;
    preferredDetail?: string;
    preferredLanguage?: string;
    traitPreferences?: string[];
    correctionCount?: number;
    lastCorrectionAt?: number;
  };
  // Note: runSemanticSearch is a function, not serializable
  // Server will inject this internally
}

// ── Server Pipeline Result ─────────────────────────────────────────────────

/**
 * Result from server pipeline execution.
 * Designed to be JSON-serializable for API responses.
 */
export interface ServerPipelineResult {
  /** Whether the pipeline succeeded */
  success: boolean;

  /** The generated content (post-finishing, post-privacy-masking) */
  output: string;

  /** Which pipeline path was taken */
  pipelinePath: 'content_generation' | 'general_chat' | 'jio_inquiry' | 'safety_blocked' | 'emergency_response';

  /** Validation results */
  validation: PipelineValidationResult | null;

  /** Trust score */
  trustScore: TrustScore | null;

  /** Generation evidence for transparency */
  evidence: GenerationEvidence | null;

  /** Auto-fix preview (if fixes were applied) */
  autoFixPreview: AutoFixPreview | null;

  /** Validation summary */
  validationSummary: {
    passedCount: number;
    warningCount: number;
    errorCount: number;
    autoFixesApplied: number;
  } | null;

  /** How many times the pipeline retried generation */
  retryCount: number;

  /** Pipeline metadata for observability */
  metadata: ServerPipelineMetadata;

  /** Classified intent */
  intent: string | null;

  /** Error if pipeline failed */
  error?: string;

  /** Error code for HTTP status mapping */
  errorCode?: string;
}

/**
 * Pipeline metadata optimized for server-side metrics.
 */
export interface ServerPipelineMetadata {
  /** Request ID for tracing */
  requestId: string;

  /** Which LLM model was used */
  model: string;

  /** Total pipeline latency in milliseconds */
  latencyMs: number;

  /** Number of knowledge documents retrieved */
  retrievalCount: number;

  /** Token usage */
  tokensUsed: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  /** Effective ecosystem/channel */
  effectiveEcosystem: EcosystemType;
  effectiveChannel: ContentChannelType;

  /** Timestamps */
  startedAt: number;
  completedAt: number;

  /** Step-level timings for profiling */
  stepTimings?: {
    classify?: number;
    safety?: number;
    retrieve?: number;
    assemble?: number;
    generate?: number;
    validate?: number;
    finalize?: number;
  };
}

// ── SSE Event Types ────────────────────────────────────────────────────────

/**
 * Server-Sent Event types for streaming responses.
 */
export type SSEEventType = 'chunk' | 'validation' | 'complete' | 'error';

export interface SSEChunkEvent {
  type: 'chunk';
  /** Accumulated content so far */
  content: string;
}

export interface SSEValidationEvent {
  type: 'validation';
  /** Whether validation passed */
  passed: boolean;
  /** Overall trust score (0-100) */
  score: number | null;
  /** Number of issues found */
  issueCount: number;
}

export interface SSECompleteEvent {
  type: 'complete';
  /** Full pipeline result */
  result: ServerPipelineResult;
}

export interface SSEErrorEvent {
  type: 'error';
  /** Error message */
  message: string;
  /** Error code for client handling */
  code: string;
  /** Whether the error is retryable */
  retryable: boolean;
}

export type SSEEvent = SSEChunkEvent | SSEValidationEvent | SSECompleteEvent | SSEErrorEvent;

// ── API Request/Response Types ─────────────────────────────────────────────

/**
 * Request body for POST /api/generate
 */
export interface GenerateAPIRequest {
  input: ServerPipelineInput;
}

/**
 * Response for non-streaming POST /api/generate
 */
export interface GenerateAPIResponse {
  result: ServerPipelineResult;
}

/**
 * Error response structure
 */
export interface APIErrorResponse {
  error: string;
  code: string;
  retryable?: boolean;
}

// ── Utility Types ──────────────────────────────────────────────────────────

/**
 * Convert client PipelineInput to ServerPipelineInput.
 * Used by frontend when calling the API.
 */
export function toServerInput(
  clientInput: {
    message: string;
    ecosystem: EcosystemType;
    contentChannel: ContentChannelType;
    trustSettings: TrustSettings;
    temperature: number;
    maxTokens: number;
    stream: boolean;
    llmProvider: LLMProviderType;
    userProfile?: { role?: string; name?: string; userId?: string; deviceId?: string };
    conversationHistory: Array<{ role: string; content: string }>;
    featureFlags: ServerPipelineFeatureFlags;
  },
  requestId?: string
): ServerPipelineInput {
  return {
    message: clientInput.message,
    ecosystem: clientInput.ecosystem,
    contentChannel: clientInput.contentChannel,
    trustSettings: clientInput.trustSettings,
    temperature: clientInput.temperature,
    maxTokens: clientInput.maxTokens,
    stream: clientInput.stream,
    llmProvider: clientInput.llmProvider,
    userProfile: clientInput.userProfile,
    conversationHistory: clientInput.conversationHistory,
    featureFlags: clientInput.featureFlags,
    requestId,
    timeoutMs: 55000, // Default 55s, leaving buffer for Vercel's 60s limit
  };
}
