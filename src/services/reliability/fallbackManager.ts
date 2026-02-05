/**
 * Provider Fallback Manager
 * Manages automatic fallback to alternative providers with circuit breaker integration
 */

import { CircuitBreaker, type CircuitState } from './circuitBreaker';
import type { LLMProviderType } from '../providers/llm/types';

export interface FallbackConfig {
  fallbackChain: LLMProviderType[];
  enableAutoFallback: boolean;
  onFallback?: (from: string, to: string, reason: string) => void;
}

export class FallbackManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private config: FallbackConfig;

  constructor(config: FallbackConfig) {
    this.config = config;
  }

  async executeWithFallback<T>(
    primaryProvider: LLMProviderType,
    operation: (provider: LLMProviderType) => Promise<T>
  ): Promise<T> {
    const providers = [primaryProvider, ...this.config.fallbackChain];
    const errors: Array<{ provider: string; error: Error }> = [];
    let lastError: Error | undefined;

    for (let i = 0; i < providers.length; i++) {
      const providerType = providers[i];
      
      // Get or create circuit breaker for this provider
      if (!this.circuitBreakers.has(providerType)) {
        this.circuitBreakers.set(
          providerType,
          new CircuitBreaker(providerType)
        );
      }

      const circuitBreaker = this.circuitBreakers.get(providerType)!;

      // Skip if circuit is open
      if (circuitBreaker.getState() === 'OPEN') {
        const reason = 'Circuit breaker is OPEN';
        console.warn(`[FallbackManager] Skipping ${providerType} - ${reason}`);
        
        // If there's a next provider, notify about the skip
        const nextProvider = providers[i + 1];
        if (nextProvider) {
          this.config.onFallback?.(providerType, nextProvider, reason);
        }
        
        continue;
      }

      try {
        console.log(`[FallbackManager] Attempting ${providerType} (${i + 1}/${providers.length})`);
        const result = await circuitBreaker.execute(() => operation(providerType));
        
        // Success! Log if we used a fallback
        if (i > 0) {
          console.log(`[FallbackManager] Success with fallback provider: ${providerType}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        errors.push({ provider: providerType, error: lastError });
        
        // Log the failure
        console.error(
          `[FallbackManager] ${providerType} failed: ${lastError.message}`
        );
        
        // Notify about fallback to next provider
        const nextProvider = providers[i + 1];
        if (nextProvider && this.config.enableAutoFallback) {
          this.config.onFallback?.(
            providerType,
            nextProvider,
            lastError.message
          );
          console.warn(
            `[FallbackManager] Falling back from ${providerType} to ${nextProvider}`
          );
        }
      }
    }

    // All providers failed
    const errorSummary = errors
      .map(e => `${e.provider}: ${e.error.message}`)
      .join('; ');
    
    throw new Error(
      `All providers failed. Tried: ${providers.join(', ')}. ` +
      `Errors: ${errorSummary}`
    );
  }

  getCircuitBreakerStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {};
    this.circuitBreakers.forEach((breaker, provider) => {
      states[provider] = breaker.getState();
    });
    return states;
  }

  getCircuitBreakerStats(): Record<string, ReturnType<CircuitBreaker['getStats']>> {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    this.circuitBreakers.forEach((breaker, provider) => {
      stats[provider] = breaker.getStats();
    });
    return stats;
  }

  resetCircuitBreaker(provider: LLMProviderType): void {
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.reset();
      console.log(`[FallbackManager] Reset circuit breaker for ${provider}`);
    }
  }

  resetAllCircuitBreakers(): void {
    this.circuitBreakers.forEach((breaker) => {
      breaker.reset();
    });
    console.log('[FallbackManager] Reset all circuit breakers');
  }

  updateConfig(config: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getFallbackChain(): LLMProviderType[] {
    return [...this.config.fallbackChain];
  }

  setFallbackChain(chain: LLMProviderType[]): void {
    this.config.fallbackChain = chain;
  }
}
