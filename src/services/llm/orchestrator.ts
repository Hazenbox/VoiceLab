/**
 * LLM Orchestrator
 * Main integration point coordinating all LLM operations with reliability, monitoring, and caching
 */

import { RetryManager } from '../reliability/retryManager';
import { FallbackManager } from '../reliability/fallbackManager';
import { CostTracker } from '../monitoring/costTracker';
import { PromptRegistry, type PromptVersion } from '../monitoring/promptRegistry';
import { ResponseCache } from '../caching/responseCache';
import type { 
  LLMProvider, 
  LLMProviderType, 
  LLMGenerateOptions, 
  LLMGenerateResult,
  LLMUsageMetrics
} from '../providers/llm/types';

export interface OrchestratorConfig {
  enableRetry: boolean;
  enableFallback: boolean;
  enableCaching: boolean;
  enableCostTracking: boolean;
  fallbackChain: LLMProviderType[];
  cacheConfig?: {
    maxSize?: number;
    ttlMs?: number;
  };
}

export class LLMOrchestrator {
  private retryManager: RetryManager;
  private fallbackManager: FallbackManager;
  private costTracker: CostTracker;
  private responseCache: ResponseCache;
  private promptRegistry: PromptRegistry;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    
    this.retryManager = new RetryManager({
      onRetry: (attempt, error) => {
        console.log(`[Orchestrator] Retry attempt ${attempt} after ${error.code}`);
      },
    });
    
    this.fallbackManager = new FallbackManager({
      fallbackChain: config.fallbackChain,
      enableAutoFallback: config.enableFallback,
      onFallback: (from, to, reason) => {
        console.warn(`[Orchestrator] Fallback: ${from} -> ${to} (${reason})`);
      },
    });
    
    this.costTracker = new CostTracker();
    
    this.responseCache = new ResponseCache({
      enabled: config.enableCaching,
      maxSize: config.cacheConfig?.maxSize,
      ttlMs: config.cacheConfig?.ttlMs,
    });
    
    this.promptRegistry = new PromptRegistry();
  }

  /**
   * Generate text with full orchestration (retry, fallback, caching, monitoring)
   */
  async generate(
    providerType: LLMProviderType,
    options: LLMGenerateOptions,
    createProvider: (type: LLMProviderType) => LLMProvider
  ): Promise<LLMGenerateResult & { cached: boolean }> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Check cache first
    if (this.config.enableCaching && !options.stream) {
      const cacheKey = this.responseCache.generateKey(options.messages, options);
      const cached = this.responseCache.get(cacheKey);
      
      if (cached) {
        console.log('[Orchestrator] Returning cached response');
        return { ...cached, cached: true };
      }
    }

    // Define the operation
    const operation = async (provider: LLMProviderType): Promise<LLMGenerateResult> => {
      const providerInstance = createProvider(provider);
      
      if (!providerInstance.isReady()) {
        throw new Error(`Provider ${provider} is not configured`);
      }
      
      return await providerInstance.generate(options);
    };

    let result: LLMGenerateResult;
    let usedProvider = providerType;

    try {
      // Execute with fallback and retry
      if (this.config.enableFallback) {
        result = await this.fallbackManager.executeWithFallback(
          providerType,
          async (fallbackProvider) => {
            usedProvider = fallbackProvider;
            
            if (this.config.enableRetry) {
              return await this.retryManager.executeWithRetry(
                () => operation(fallbackProvider),
                `LLM request to ${fallbackProvider}`
              );
            } else {
              return await operation(fallbackProvider);
            }
          }
        );
      } else if (this.config.enableRetry) {
        result = await this.retryManager.executeWithRetry(
          () => operation(providerType),
          `LLM request to ${providerType}`
        );
      } else {
        result = await operation(providerType);
      }

      // Track cost and usage
      if (this.config.enableCostTracking) {
        this.costTracker.track(result.usage, {
          requestId,
          success: true,
        });
      }

      // Cache response
      if (this.config.enableCaching) {
        const cacheKey = this.responseCache.generateKey(options.messages, options);
        this.responseCache.set(cacheKey, result);
      }

      const totalLatency = Date.now() - startTime;
      console.log(
        `[Orchestrator] Success with ${usedProvider} ` +
        `(${totalLatency}ms, ${result.usage.totalTokens} tokens, ` +
        `$${result.usage.estimatedCost.toFixed(6)})`
      );

      return { ...result, cached: false };

    } catch (error) {
      const totalLatency = Date.now() - startTime;
      
      // Track failed request
      if (this.config.enableCostTracking) {
        const errorUsage: LLMUsageMetrics = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          latencyMs: totalLatency,
          model: '',
          provider: usedProvider,
          timestamp: Date.now(),
        };
        
        this.costTracker.track(errorUsage, {
          requestId,
          success: false,
          errorCode: (error as any).code || 'UNKNOWN',
        });
      }

      console.error(`[Orchestrator] All attempts failed after ${totalLatency}ms`);
      throw error;
    }
  }

  /**
   * Generate text with streaming
   */
  async generateStream(
    providerType: LLMProviderType,
    options: LLMGenerateOptions,
    createProvider: (type: LLMProviderType) => LLMProvider,
    onChunk: (text: string) => void
  ): Promise<LLMGenerateResult> {
    const provider = createProvider(providerType);

    if (!provider.isReady()) {
      throw new Error(`Provider ${providerType} is not configured`);
    }

    if (!provider.supportsStreaming || !provider.generateStream) {
      throw new Error(`Provider ${providerType} does not support streaming`);
    }

    let usage: LLMUsageMetrics | undefined;
    const startTime = Date.now();

    try {
      const content = await provider.generateStream(
        options,
        onChunk,
        (u) => { usage = u; }
      );

      // If usage wasn't provided, estimate it
      if (!usage) {
        const latency = Date.now() - startTime;
        usage = {
          promptTokens: 0,
          completionTokens: content.length / 4, // Rough estimate
          totalTokens: content.length / 4,
          estimatedCost: 0,
          latencyMs: latency,
          model: provider.name,
          provider: provider.name,
          timestamp: Date.now(),
        };
      }

      // Track usage
      if (this.config.enableCostTracking) {
        this.costTracker.track(usage, { success: true });
      }

      console.log(
        `[Orchestrator] Stream completed with ${providerType} ` +
        `(${usage.latencyMs}ms, ${usage.totalTokens} tokens)`
      );

      return { content, usage };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      // Track failed stream
      if (this.config.enableCostTracking) {
        const errorUsage: LLMUsageMetrics = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          latencyMs: latency,
          model: provider.name,
          provider: provider.name,
          timestamp: Date.now(),
        };
        
        this.costTracker.track(errorUsage, {
          success: false,
          errorCode: (error as any).code || 'UNKNOWN',
        });
      }

      throw error;
    }
  }

  /**
   * Get cost and usage statistics
   */
  getCostStats(timeRangeMs?: number) {
    return this.costTracker.getStats(timeRangeMs);
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates() {
    return this.fallbackManager.getCircuitBreakerStates();
  }

  /**
   * Get circuit states with full stats (for component compatibility)
   */
  getCircuitStates() {
    // Return the stats format which includes state property
    return this.fallbackManager.getCircuitBreakerStats();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.responseCache.getStats();
  }

  /**
   * Register a new prompt version
   */
  registerPromptVersion(prompt: Omit<PromptVersion, 'id' | 'createdAt'>): string {
    return this.promptRegistry.register(prompt);
  }

  /**
   * Get active prompt version
   */
  getActivePrompt(name: string): PromptVersion | null {
    return this.promptRegistry.getActive(name);
  }

  /**
   * Export usage records
   */
  exportUsageRecords(format: 'json' | 'csv' = 'json'): string {
    return this.costTracker.exportRecords(format);
  }

  /**
   * Reset circuit breaker for a provider
   */
  resetCircuitBreaker(provider: LLMProviderType): void {
    this.fallbackManager.resetCircuitBreaker(provider);
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Update orchestrator configuration
   */
  updateConfig(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.enableCaching !== undefined) {
      this.responseCache.setEnabled(config.enableCaching);
    }
    
    if (config.fallbackChain) {
      this.fallbackManager.setFallbackChain(config.fallbackChain);
    }
  }

  /**
   * Get full orchestrator statistics
   */
  getFullStats() {
    return {
      cost: this.getCostStats(),
      cache: this.getCacheStats(),
      circuitBreakers: this.fallbackManager.getCircuitBreakerStats(),
      prompts: this.promptRegistry.getStats(),
      config: this.config,
    };
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let orchestratorInstance: LLMOrchestrator | null = null;

export function getOrchestratorInstance(): LLMOrchestrator {
  if (!orchestratorInstance) {
    // Get config from environment or defaults
    const enableRetry = import.meta.env.VITE_ENABLE_RETRY !== 'false';
    const enableFallback = import.meta.env.VITE_ENABLE_FALLBACK !== 'false';
    const enableCaching = import.meta.env.VITE_ENABLE_CACHING !== 'false';
    
    const fallbackChain = import.meta.env.VITE_LLM_FALLBACK_CHAIN
      ? import.meta.env.VITE_LLM_FALLBACK_CHAIN.split(',').map((s: string) => s.trim())
      : ['qwen-text', 'huggingface']; // Default with qwen (DashScope) as primary

    orchestratorInstance = new LLMOrchestrator({
      enableRetry,
      enableFallback,
      enableCaching,
      enableCostTracking: true,
      fallbackChain,
      cacheConfig: {
        maxSize: parseInt(import.meta.env.VITE_CACHE_MAX_SIZE || '100'),
        ttlMs: parseInt(import.meta.env.VITE_CACHE_TTL_MS || '3600000'),
      },
    });
  }
  
  return orchestratorInstance;
}

export function resetOrchestratorInstance(): void {
  orchestratorInstance = null;
}
