/**
 * Pipeline Contract Types
 *
 * Strict interfaces for the generation pipeline.
 * No loose objects -- strong contracts prevent future entropy.
 */

import type {
  EcosystemType,
  ContentChannelType,
  TrustSettings,
  TrustScore,
  GenerationEvidence,
} from '../../types';
import type { LLMProviderType } from '../providers/llm';
import type { SafetyGateResult } from '../safety';
import type { RetrievedKnowledge } from '../knowledge';
import type { PipelineValidationResult } from '../validation/types';

// ── Pipeline Input ──────────────────────────────────────────────────────

export interface PipelineInput {
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
    deviceId?: string;
  };

  /** Conversation context */
  conversationHistory: Array<{ role: string; content: string }>;

  /** Feature flags snapshot (immutable for the run) */
  featureFlags: {
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
  };

  /** External data (from Convex queries, resolved before pipeline runs) */
  externalData?: {
    knowledgeItems?: unknown[];
    corrections?: unknown[];
    trainingExamples?: unknown[];
    directiveOverrides?: unknown[];
    tokenEnforcementRules?: unknown[];
  };

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

// ── Pipeline Result ─────────────────────────────────────────────────────

export interface PipelineResult {
  /** Whether the pipeline succeeded */
  success: boolean;

  /** The generated content */
  output: string;

  /** Which pipeline path was taken */
  pipelinePath: 'content_generation' | 'general_chat' | 'jio_inquiry' | 'safety_blocked' | 'emergency_response';

  /** Validation results */
  validation: PipelineValidationResult | null;

  /** Trust score */
  trustScore: TrustScore | null;

  /** Generation evidence for transparency */
  evidence: GenerationEvidence | null;

  /** How many times the pipeline retried generation */
  retryCount: number;

  /** Pipeline metadata for observability */
  metadata: PipelineMetadata;

  /** Safety gate result if applicable */
  safetyResult: SafetyGateResult | null;

  /** Classified intent */
  intent: string | null;

  /** Error if pipeline failed */
  error?: string;
}

// ── Pipeline Metadata ───────────────────────────────────────────────────

export interface PipelineMetadata {
  /** Which LLM model was used */
  model: string;

  /** Total pipeline latency in milliseconds */
  latencyMs: number;

  /** Number of knowledge documents retrieved */
  retrievalCount: number;

  /** Token snapshot (immutable per run) */
  tokensUsed: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  /** Which ecosystem/channel was effective (may differ from input if auto-detected) */
  effectiveEcosystem: EcosystemType;
  effectiveChannel: ContentChannelType;

  /** Timestamp */
  startedAt: number;
  completedAt: number;
}

// ── Step-level types ────────────────────────────────────────────────────

export interface ClassifyResult {
  intent: 'content_generation' | 'general_chat' | 'jio_inquiry';
  detectedEcosystem?: EcosystemType;
  detectedChannel?: ContentChannelType;
  confidence: number;
}

export interface RetrieveResult {
  knowledge: RetrievedKnowledge | null;
  semanticResults?: unknown[];
  retrievalCount: number;
}

export interface AssembleResult {
  systemPrompt: string;
  tokenSnapshot: Record<string, unknown>;
}

export interface GenerateResult {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ValidateResult {
  passed: boolean;
  validation: PipelineValidationResult | null;
  trustScore: TrustScore | null;
}
