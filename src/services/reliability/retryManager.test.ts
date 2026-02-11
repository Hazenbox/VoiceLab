import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RetryManager } from './retryManager';
import { ERROR_CODES } from '../providers/llm/types';

describe('RetryManager', () => {
  let manager: RetryManager;
  
  beforeEach(() => {
    manager = new RetryManager({
      maxRetries: 2,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      exponentialBase: 2,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful operations', () => {
    it('should execute operation once if successful', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await manager.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return the operation result', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result = await manager.executeWithRetry(operation);
      
      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('retryable errors', () => {
    it('should retry on RATE_LIMIT error', async () => {
      const error = new Error('Rate limit exceeded') as any;
      error.code = ERROR_CODES.RATE_LIMIT;
      error.retryable = true;
      error.provider = 'test';
      
      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await manager.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on TIMEOUT error', async () => {
      const error = new Error('Request timeout') as any;
      error.code = ERROR_CODES.TIMEOUT;
      error.retryable = true;
      error.provider = 'test';
      
      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await manager.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on SERVER_ERROR', async () => {
      const error = new Error('500 Internal Server Error') as any;
      error.code = ERROR_CODES.SERVER_ERROR;
      error.retryable = true;
      error.provider = 'test';
      
      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      expect(await manager.executeWithRetry(operation)).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('non-retryable errors', () => {
    it('should not retry on INVALID_REQUEST', async () => {
      const error = new Error('Invalid request') as any;
      error.code = ERROR_CODES.INVALID_REQUEST;
      error.retryable = false;
      error.provider = 'test';
      
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(manager.executeWithRetry(operation)).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_REQUEST,
      });
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on AUTHENTICATION_ERROR', async () => {
      const error = new Error('Invalid API key') as any;
      error.code = ERROR_CODES.AUTHENTICATION_ERROR;
      error.retryable = false;
      error.provider = 'test';
      
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(manager.executeWithRetry(operation)).rejects.toMatchObject({
        code: ERROR_CODES.AUTHENTICATION_ERROR,
      });
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('max retries', () => {
    it('should fail after max retries exceeded', async () => {
      const error = new Error('Rate limit') as any;
      error.code = ERROR_CODES.RATE_LIMIT;
      error.retryable = true;
      error.provider = 'test';
      
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(manager.executeWithRetry(operation)).rejects.toMatchObject({
        code: ERROR_CODES.RATE_LIMIT,
      });
      
      // Initial + 2 retries = 3 total calls
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should respect custom maxRetries', async () => {
      const customManager = new RetryManager({ 
        maxRetries: 1,
        baseDelayMs: 10,
      });
      
      const error = new Error('Timeout') as any;
      error.code = ERROR_CODES.TIMEOUT;
      error.retryable = true;
      error.provider = 'test';
      
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(customManager.executeWithRetry(operation)).rejects.toMatchObject({
        code: ERROR_CODES.TIMEOUT,
      });
      
      // Initial + 1 retry = 2 total calls
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('onRetry callback', () => {
    it('should call onRetry callback on each retry', async () => {
      const onRetry = vi.fn();
      const managerWithCallback = new RetryManager({
        maxRetries: 2,
        baseDelayMs: 10,
        onRetry,
      });
      
      const operation = vi.fn()
        .mockRejectedValueOnce({ 
          code: ERROR_CODES.RATE_LIMIT, 
          retryable: true,
          message: 'Rate limit',
        })
        .mockRejectedValueOnce({ 
          code: ERROR_CODES.RATE_LIMIT, 
          retryable: true,
          message: 'Rate limit',
        })
        .mockResolvedValue('success');
      
      await managerWithCallback.executeWithRetry(operation);
      
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({
        code: ERROR_CODES.RATE_LIMIT,
      }));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({
        code: ERROR_CODES.RATE_LIMIT,
      }));
    });

    it('should not call onRetry on success', async () => {
      const onRetry = vi.fn();
      const managerWithCallback = new RetryManager({ 
        baseDelayMs: 10,
        onRetry,
      });
      
      const operation = vi.fn().mockResolvedValue('success');
      
      await managerWithCallback.executeWithRetry(operation);
      
      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('error normalization', () => {
    it('should handle string errors', async () => {
      const operation = vi.fn().mockRejectedValue('Simple error string');
      
      await expect(manager.executeWithRetry(operation)).rejects.toMatchObject({
        code: ERROR_CODES.SERVER_ERROR,
        retryable: true,
      });
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries for retryable error
    });

    it('should handle Error objects', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Standard error'));
      
      await expect(manager.executeWithRetry(operation)).rejects.toMatchObject({
        code: ERROR_CODES.SERVER_ERROR,
        retryable: true,
      });
      
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('context parameter', () => {
    it('should use context in log messages', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const operation = vi.fn()
        .mockRejectedValueOnce({ 
          code: ERROR_CODES.TIMEOUT, 
          retryable: true,
          message: 'Timeout',
        })
        .mockResolvedValue('success');
      
      await manager.executeWithRetry(operation, 'LLM generation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LLM generation')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Retry-After header', () => {
    it('should respect Retry-After header from error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce({ 
          code: ERROR_CODES.RATE_LIMIT, 
          retryable: true,
          message: 'Rate limit',
          retryAfter: 2, // 2 seconds
        })
        .mockResolvedValue('success');
      
      const result = await manager.executeWithRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
