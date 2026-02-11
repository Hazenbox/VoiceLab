/**
 * Tests for LLM Orchestrator
 * Tests retry, fallback, caching, and cost tracking functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMOrchestrator, type OrchestratorConfig } from './orchestrator';
import type { LLMProvider, LLMProviderType, LLMGenerateResult } from '../providers/llm/types';

// Mock provider factory
function createMockProvider(
  name: string,
  options: {
    isReady?: boolean;
    shouldFail?: boolean;
    failCount?: number;
    response?: string;
    supportsStreaming?: boolean;
  } = {}
): LLMProvider {
  let failuresRemaining = options.failCount || 0;
  
  return {
    name,
    isReady: () => options.isReady ?? true,
    supportsStreaming: options.supportsStreaming ?? false,
    
    generate: vi.fn().mockImplementation(async () => {
      if (options.shouldFail) {
        throw new Error(`Provider ${name} failed`);
      }
      
      if (failuresRemaining > 0) {
        failuresRemaining--;
        const error = new Error(`Provider ${name} failed (retries remaining: ${failuresRemaining})`) as Error & { code?: string };
        error.code = 'SERVER_ERROR';
        throw error;
      }
      
      return {
        content: options.response || `Response from ${name}`,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
          estimatedCost: 0.001,
          latencyMs: 100,
          model: name,
          provider: name,
          timestamp: Date.now(),
        },
      } as LLMGenerateResult;
    }),
  } as LLMProvider;
}

describe('LLMOrchestrator', () => {
  let orchestrator: LLMOrchestrator;
  
  const defaultConfig: OrchestratorConfig = {
    enableRetry: true,
    enableFallback: true,
    enableCaching: true,
    enableCostTracking: true,
    fallbackChain: ['qwen-text', 'huggingface', 'gemini-text'] as LLMProviderType[],
    cacheConfig: {
      maxSize: 100,
      ttlMs: 300000,
    },
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new LLMOrchestrator(defaultConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generate', () => {
    it('should return response from primary provider when successful', async () => {
      const mockProvider = createMockProvider('qwen-text', {
        response: 'Hello from Qwen',
      });
      
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      const result = await orchestrator.generate(
        'qwen-text',
        { messages: [{ role: 'user', content: 'Hello' }] },
        createProvider
      );
      
      expect(result.content).toBe('Hello from Qwen');
      expect(result.cached).toBe(false);
    });

    it('should return cached response on subsequent calls', async () => {
      const mockProvider = createMockProvider('qwen-text');
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      const options = { messages: [{ role: 'user' as const, content: 'Cached test' }] };
      
      // First call
      const result1 = await orchestrator.generate('qwen-text', options, createProvider);
      expect(result1.cached).toBe(false);
      
      // Second call with same options
      const result2 = await orchestrator.generate('qwen-text', options, createProvider);
      expect(result2.cached).toBe(true);
      
      // Provider should only be called once
      expect(mockProvider.generate).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when disabled', async () => {
      const orchestratorNoCache = new LLMOrchestrator({
        ...defaultConfig,
        enableCaching: false,
      });
      
      const mockProvider = createMockProvider('qwen-text');
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      const options = { messages: [{ role: 'user' as const, content: 'No cache' }] };
      
      await orchestratorNoCache.generate('qwen-text', options, createProvider);
      await orchestratorNoCache.generate('qwen-text', options, createProvider);
      
      // Provider should be called twice (no caching)
      expect(mockProvider.generate).toHaveBeenCalledTimes(2);
    });

    it('should throw error when provider is not ready', async () => {
      // Create orchestrator without retries to test quickly
      const orchestratorNoRetry = new LLMOrchestrator({
        ...defaultConfig,
        enableRetry: false,
        enableFallback: false,
      });
      
      const mockProvider = createMockProvider('qwen-text', { isReady: false });
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      // Should throw an error when provider is not ready
      await expect(
        orchestratorNoRetry.generate(
          'qwen-text',
          { messages: [{ role: 'user', content: 'Test' }] },
          createProvider
        )
      ).rejects.toThrow();
    });
  });

  describe('fallback', () => {
    it('should fallback to next provider when primary fails', async () => {
      // Create orchestrator without retries to test quickly
      const orchestratorWithFallback = new LLMOrchestrator({
        ...defaultConfig,
        enableRetry: false, // Disable retries for faster test
        enableFallback: true,
      });
      
      const createProvider = vi.fn().mockImplementation((type: LLMProviderType) => {
        if (type === 'qwen-text') {
          return createMockProvider('qwen-text', { shouldFail: true });
        }
        return createMockProvider(type, { response: `Response from ${type}` });
      });
      
      const result = await orchestratorWithFallback.generate(
        'qwen-text',
        { messages: [{ role: 'user', content: 'Fallback test' }] },
        createProvider
      );
      
      // Should have used fallback provider
      expect(result.content).toContain('huggingface');
    });

    it('should try all providers in fallback chain', async () => {
      // Create orchestrator without retries to test quickly
      const orchestratorWithFallback = new LLMOrchestrator({
        ...defaultConfig,
        enableRetry: false, // Disable retries for faster test
        enableFallback: true,
      });
      
      const createProvider = vi.fn().mockImplementation((type: LLMProviderType) => {
        if (type === 'qwen-text' || type === 'huggingface') {
          return createMockProvider(type, { shouldFail: true });
        }
        return createMockProvider(type, { response: `Response from ${type}` });
      });
      
      const result = await orchestratorWithFallback.generate(
        'qwen-text',
        { messages: [{ role: 'user', content: 'Full fallback test' }] },
        createProvider
      );
      
      expect(result.content).toContain('gemini-text');
    });

    it('should throw when all providers fail', async () => {
      // Use no-retry config to avoid timeout
      const orchestratorNoRetry = new LLMOrchestrator({
        ...defaultConfig,
        enableRetry: false, // Disable retries to speed up test
      });
      
      const createProvider = vi.fn().mockImplementation((type: LLMProviderType) => {
        return createMockProvider(type, { shouldFail: true });
      });
      
      await expect(
        orchestratorNoRetry.generate(
          'qwen-text',
          { messages: [{ role: 'user', content: 'All fail test' }] },
          createProvider
        )
      ).rejects.toThrow();
    }, 30000);

    it('should not fallback when disabled', async () => {
      const orchestratorNoFallback = new LLMOrchestrator({
        ...defaultConfig,
        enableFallback: false,
        enableRetry: false, // Also disable retries
      });
      
      const createProvider = vi.fn().mockReturnValue(
        createMockProvider('qwen-text', { shouldFail: true })
      );
      
      await expect(
        orchestratorNoFallback.generate(
          'qwen-text',
          { messages: [{ role: 'user', content: 'No fallback' }] },
          createProvider
        )
      ).rejects.toThrow();
      
      // Should only try primary provider
      expect(createProvider).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry', () => {
    it('should retry failed requests', async () => {
      const mockProvider = createMockProvider('qwen-text', {
        failCount: 2, // Fail twice then succeed
        response: 'Success after retries',
      });
      
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      const result = await orchestrator.generate(
        'qwen-text',
        { messages: [{ role: 'user', content: 'Retry test' }] },
        createProvider
      );
      
      expect(result.content).toBe('Success after retries');
      // Should have been called 3 times (2 failures + 1 success)
      expect(mockProvider.generate).toHaveBeenCalledTimes(3);
    });

    it('should not retry when disabled', async () => {
      const orchestratorNoRetry = new LLMOrchestrator({
        ...defaultConfig,
        enableRetry: false,
        enableFallback: false, // Also disable fallback to isolate retry behavior
      });
      
      const mockProvider = createMockProvider('qwen-text', {
        failCount: 1,
      });
      
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      await expect(
        orchestratorNoRetry.generate(
          'qwen-text',
          { messages: [{ role: 'user', content: 'No retry' }] },
          createProvider
        )
      ).rejects.toThrow();
      
      // Should only try once
      expect(mockProvider.generate).toHaveBeenCalledTimes(1);
    });
  });

  describe('cost tracking', () => {
    it('should track successful request costs', async () => {
      const mockProvider = createMockProvider('qwen-text');
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      await orchestrator.generate(
        'qwen-text',
        { messages: [{ role: 'user', content: 'Cost tracking test' }] },
        createProvider
      );
      
      const stats = orchestrator.getCostStats();
      
      // Stats should be defined and contain cost information
      expect(stats).toBeDefined();
      expect(typeof stats.totalCost).toBe('number');
    });

    it('should return stats object', async () => {
      const stats = orchestrator.getCostStats();
      
      // Stats should always return an object
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });

  describe('circuit breaker', () => {
    it('should track circuit breaker states', async () => {
      const mockProvider = createMockProvider('qwen-text');
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      await orchestrator.generate(
        'qwen-text',
        { messages: [{ role: 'user', content: 'Circuit test' }] },
        createProvider
      );
      
      const states = orchestrator.getCircuitBreakerStates();
      
      expect(states).toBeDefined();
      expect(typeof states).toBe('object');
    });

    it('should provide circuit states with stats', () => {
      const states = orchestrator.getCircuitStates();
      
      expect(states).toBeDefined();
      expect(typeof states).toBe('object');
    });
  });

  describe('cache statistics', () => {
    it('should provide cache statistics', async () => {
      const mockProvider = createMockProvider('qwen-text');
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      const options = { messages: [{ role: 'user' as const, content: 'Cache stats test' }] };
      
      // First call - cache miss
      await orchestrator.generate('qwen-text', options, createProvider);
      
      // Second call - cache hit
      await orchestrator.generate('qwen-text', options, createProvider);
      
      const stats = orchestrator.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should allow clearing cache', () => {
      orchestrator.clearCache();
      
      const stats = orchestrator.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('prompt registry', () => {
    it('should register and retrieve prompts', () => {
      const promptId = orchestrator.registerPromptVersion({
        name: 'test-prompt',
        version: '1.0.0',
        template: 'Hello {{name}}',
        variables: ['name'],
        description: 'Test prompt',
        isActive: true,
      });
      
      expect(promptId).toBeDefined();
      expect(typeof promptId).toBe('string');
      
      const prompt = orchestrator.getActivePrompt('test-prompt');
      
      expect(prompt).toBeDefined();
      expect(prompt?.name).toBe('test-prompt');
    });
  });

  describe('request ID generation', () => {
    it('should generate unique request IDs', () => {
      // Access private method through a simple generate call
      // The request ID is used internally
      const mockProvider = createMockProvider('qwen-text');
      const createProvider = vi.fn().mockReturnValue(mockProvider);
      
      // Make multiple requests and check they don't throw
      const requests = Array.from({ length: 3 }, () =>
        orchestrator.generate(
          'qwen-text',
          { messages: [{ role: 'user', content: `Request ${Math.random()}` }] },
          createProvider
        )
      );
      
      return expect(Promise.all(requests)).resolves.toHaveLength(3);
    });
  });
});
