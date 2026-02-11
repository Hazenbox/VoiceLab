import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from './circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  
  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new CircuitBreaker('test-provider', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      monitoringWindow: 120000, // 2 minutes
    });
  });

  describe('CLOSED state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should allow operations in CLOSED state', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await breaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should track failures but stay CLOSED below threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Fail twice (below threshold of 3)
      await expect(breaker.execute(operation)).rejects.toThrow('failure');
      await expect(breaker.execute(operation)).rejects.toThrow('failure');
      
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN after reaching failure threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Fail 3 times (meets threshold)
      await expect(breaker.execute(operation)).rejects.toThrow('failure');
      await expect(breaker.execute(operation)).rejects.toThrow('failure');
      await expect(breaker.execute(operation)).rejects.toThrow('failure');
      
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should remove old failures outside monitoring window', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // First failure
      await expect(breaker.execute(operation)).rejects.toThrow('failure');
      
      // Advance time beyond monitoring window
      vi.advanceTimersByTime(130000); // 2 minutes 10 seconds
      
      // Two more failures (should not open circuit since first is old)
      await expect(breaker.execute(operation)).rejects.toThrow('failure');
      await expect(breaker.execute(operation)).rejects.toThrow('failure');
      
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Open the circuit by failing 3 times
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      await expect(breaker.execute(operation)).rejects.toThrow();
      
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should reject requests immediately when OPEN', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      await expect(breaker.execute(operation)).rejects.toThrow(
        'Circuit breaker is OPEN'
      );
      
      // Operation should not have been called
      expect(operation).not.toHaveBeenCalled();
    });

    it('should include provider name and wait time in error', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      await expect(breaker.execute(operation)).rejects.toThrow(
        /test-provider/
      );
      await expect(breaker.execute(operation)).rejects.toThrow(
        /Retry in \d+s/
      );
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Advance time to exceed timeout
      vi.advanceTimersByTime(61000); // 1 minute 1 second
      
      const operation = vi.fn().mockResolvedValue('success');
      
      // This should trigger transition to HALF_OPEN and execute
      await breaker.execute(operation);
      
      expect(breaker.getState()).toBe('HALF_OPEN');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not transition before timeout expires', async () => {
      // Advance time but not enough
      vi.advanceTimersByTime(30000); // 30 seconds
      
      const operation = vi.fn().mockResolvedValue('success');
      
      await expect(breaker.execute(operation)).rejects.toThrow(
        'Circuit breaker is OPEN'
      );
      
      expect(breaker.getState()).toBe('OPEN');
      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Open circuit
      const failOp = vi.fn().mockRejectedValue(new Error('failure'));
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      
      // Wait for timeout to transition to HALF_OPEN
      vi.advanceTimersByTime(61000);
    });

    it('should allow test requests in HALF_OPEN state', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      await breaker.execute(operation);
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe('HALF_OPEN');
    });

    it('should transition to CLOSED after success threshold', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      // Need 2 successes (success threshold)
      await breaker.execute(operation);
      expect(breaker.getState()).toBe('HALF_OPEN');
      
      await breaker.execute(operation);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should transition back to OPEN on failure', async () => {
      const successOp = vi.fn().mockResolvedValue('success');
      const failOp = vi.fn().mockRejectedValue(new Error('failure'));
      
      // One success
      await breaker.execute(successOp);
      expect(breaker.getState()).toBe('HALF_OPEN');
      
      // Then a failure - should reopen
      await expect(breaker.execute(failOp)).rejects.toThrow('failure');
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should reset consecutive successes on failure', async () => {
      const successOp = vi.fn().mockResolvedValue('success');
      const failOp = vi.fn().mockRejectedValue(new Error('failure'));
      
      // One success
      await breaker.execute(successOp);
      
      // Failure resets counter and reopens
      await expect(breaker.execute(failOp)).rejects.toThrow();
      expect(breaker.getState()).toBe('OPEN');
      
      // Wait and try again - need 2 successes again
      vi.advanceTimersByTime(61000);
      await breaker.execute(successOp);
      expect(breaker.getState()).toBe('HALF_OPEN');
      
      await breaker.execute(successOp);
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('manual control', () => {
    it('should allow manual reset', () => {
      breaker.forceOpen();
      expect(breaker.getState()).toBe('OPEN');
      
      breaker.reset();
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should allow force open', () => {
      expect(breaker.getState()).toBe('CLOSED');
      
      breaker.forceOpen();
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should reset failures and successes on manual reset', async () => {
      const failOp = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Add some failures
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      
      breaker.reset();
      
      expect(breaker.getState()).toBe('CLOSED');
      
      // Should need full threshold again
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      expect(breaker.getState()).toBe('CLOSED');
      
      await expect(breaker.execute(failOp)).rejects.toThrow();
      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('getStats', () => {
    it('should return circuit statistics', async () => {
      const failOp = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Add failures
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      
      const stats = breaker.getStats();
      
      expect(stats).toMatchObject({
        state: 'CLOSED',
        failures: 2,
        consecutiveSuccesses: 0,
      });
    });

    it('should include openedAt when circuit is open', async () => {
      const failOp = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Open circuit
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      await expect(breaker.execute(failOp)).rejects.toThrow();
      
      const stats = breaker.getStats();
      
      expect(stats.state).toBe('OPEN');
      expect(stats.openedAt).toBeDefined();
      expect(typeof stats.openedAt).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle successful operation after circuit is closed', async () => {
      const successOp = vi.fn().mockResolvedValue('result');
      
      const result = await breaker.execute(successOp);
      
      expect(result).toBe('result');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should handle multiple rapid failures', async () => {
      const failOp = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Rapid failures
      const promises = [
        breaker.execute(failOp).catch(() => {}),
        breaker.execute(failOp).catch(() => {}),
        breaker.execute(failOp).catch(() => {}),
        breaker.execute(failOp).catch(() => {}),
        breaker.execute(failOp).catch(() => {}),
      ];
      
      await Promise.all(promises);
      
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should handle async operation errors', async () => {
      const asyncFailOp = vi.fn().mockRejectedValue(new Error('async failure'));
      
      await expect(breaker.execute(asyncFailOp)).rejects.toThrow('async failure');
      
      expect(breaker.getState()).toBe('CLOSED');
    });
  });
});
