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
  AutoFixPreview,
} from '../../types';
import type { LLMProviderType, LLMProvider } from '../providers/llm';
import type { SafetyGateResult } from '../safety';
import type { RetrievedKnowledge } from '../knowledge';
import type { PipelineValidationResult } from '../validation/types';
import type { ConstitutionalContext, GenerationRequest } from '../generation/constitutionalWrapper';

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
    userId?: string;
    deviceId?: string;
  };

  /** Conversation context (text messages only, last N) */
  conversationHistory: Array<{ role: string; content: string }>;

  /** Feature flags snapshot (immutable for the run) */
  featureFlags: PipelineFeatureFlags;

  /** External data (from Convex queries, resolved before pipeline runs) */
  externalData?: PipelineExternalData;

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;

  /** Streaming callbacks (React state updates) */
  callbacks?: PipelineCallbacks;

  /** LLM provider factory (passed from React layer) */
  createLLMProvider?: (type: LLMProviderType) => LLMProvider;
}

export interface PipelineFeatureFlags {
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

export interface PipelineExternalData {
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
  /** Semantic search function (injected from Convex) */
  runSemanticSearch?: (...args: unknown[]) => Promise<unknown>;
}

/** Callbacks for pipeline → React communication */
export interface PipelineCallbacks {
  /** Called with accumulated text during streaming */
  onStreamChunk?: (accumulatedText: string) => void;
  /** Called when streaming finishes (to clear streaming state) */
  onStreamEnd?: () => void;
}

// ── Pipeline Result ─────────────────────────────────────────────────────

export interface PipelineResult {
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

  /** Generation context from the assemble step (for UI transparency) */
  generationContext: unknown;

  /** How many times the pipeline retried generation */
  retryCount: number;

  /** Pipeline metadata for observability */
  metadata: PipelineMetadata;

  /** Safety gate result if applicable */
  safetyResult: SafetyGateResult | null;

  /** Classified intent */
  intent: 'content_generation' | 'general_chat' | 'jio_inquiry' | null;

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
  retrievalCount: number;
  /** Evidence metadata for transparency */
  evidenceMetadata?: {
    avoidWordsCount: number;
    preferredWordsCount: number;
    autoFixRulesCount: number;
    source: 'convex' | 'code_defaults' | 'convex_with_rag';
  };
}

export interface AssembleResult {
  /** Final enhanced system prompt with all injections */
  systemPrompt: string;
  /** The generation context object for validation */
  generationContext: unknown;
  /** Token snapshot for observability */
  tokenSnapshot: Record<string, unknown>;
  /** Constitutional context (if enabled) */
  constitutionalContext: ConstitutionalContext | null;
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
  content: string;
  validation: PipelineValidationResult | null;
  trustScore: TrustScore | null;
  autoFixPreview: AutoFixPreview | null;
  validationSummary: {
    passedCount: number;
    warningCount: number;
    errorCount: number;
    autoFixesApplied: number;
  } | null;
  /** Evidence of auto-fixes applied for transparency */
  autoFixEvidence?: {
    applied: Array<{ from: string; to: string }>;
    totalCount: number;
  };
}

export interface FinalizeResult {
  content: string;
  wasPrivacyMasked: boolean;
}
