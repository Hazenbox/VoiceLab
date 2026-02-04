/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by temporarily blocking requests to failing providers
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Open circuit after N failures
  successThreshold: number;      // Close circuit after N successes in half-open
  timeout: number;               // Time before attempting half-open (ms)
  monitoringWindow: number;      // Track failures in this window (ms)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = []; // Timestamps of failures
  private consecutiveSuccesses = 0;
  private openedAt?: number;
  private config: CircuitBreakerConfig;

  constructor(
    private providerName: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      timeout: config?.timeout ?? 60000, // 1 minute
      monitoringWindow: config?.monitoringWindow ?? 120000, // 2 minutes
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition to half-open
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.transitionToHalfOpen();
    }

    // Reject immediately if circuit is open
    if (this.state === 'OPEN') {
      const waitTime = Math.ceil((this.config.timeout - (Date.now() - (this.openedAt || 0))) / 1000);
      throw new Error(
        `Circuit breaker is OPEN for ${this.providerName}. ` +
        `Provider is temporarily unavailable. Retry in ${waitTime}s.`
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.consecutiveSuccesses++;

    if (this.state === 'HALF_OPEN') {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      // Reset on success in closed state
      this.consecutiveSuccesses = 0;
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.consecutiveSuccesses = 0;
    
    // Add failure timestamp
    this.failures.push(now);
    
    // Remove old failures outside monitoring window
    this.failures = this.failures.filter(
      timestamp => now - timestamp < this.config.monitoringWindow
    );

    // Open circuit if threshold exceeded
    if (this.state !== 'OPEN' && this.failures.length >= this.config.failureThreshold) {
      this.transitionToOpen();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt >= this.config.timeout;
  }

  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = 'OPEN';
    this.openedAt = Date.now();
    console.error(
      `[CircuitBreaker] ${this.providerName}: ${previousState} -> OPEN ` +
      `(${this.failures.length} failures in ${this.config.monitoringWindow}ms window)`
    );
  }

  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.consecutiveSuccesses = 0;
    console.log(`[CircuitBreaker] ${this.providerName}: OPEN -> HALF_OPEN (attempting reset)`);
  }

  private transitionToClosed(): void {
    this.state = 'CLOSED';
    this.failures = [];
    this.consecutiveSuccesses = 0;
    this.openedAt = undefined;
    console.log(
      `[CircuitBreaker] ${this.providerName}: HALF_OPEN -> CLOSED ` +
      `(${this.config.successThreshold} consecutive successes)`
    );
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): {
    state: CircuitState;
    failures: number;
    consecutiveSuccesses: number;
    openedAt?: number;
  } {
    return {
      state: this.state,
      failures: this.failures.length,
      consecutiveSuccesses: this.consecutiveSuccesses,
      openedAt: this.openedAt,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = [];
    this.consecutiveSuccesses = 0;
    this.openedAt = undefined;
    console.log(`[CircuitBreaker] ${this.providerName}: Manual reset to CLOSED`);
  }

  forceOpen(): void {
    this.transitionToOpen();
  }

  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
