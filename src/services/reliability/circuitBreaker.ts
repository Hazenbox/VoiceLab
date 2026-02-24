/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by temporarily blocking requests to failing providers
 * 
 * PHASE 4 Enhancements:
 * - Per-domain circuit breakers (separate breakers for analytics, sync, LLM, etc.)
 * - Circuit breaker manager for centralized control
 * - Event callbacks for monitoring
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** PHASE 4: Domain types for per-domain circuit breakers */
export type CircuitDomain = 
  | 'llm'           // LLM API calls
  | 'analytics'     // Analytics mutations  
  | 'sync'          // Convex sync operations
  | 'knowledge'     // Knowledge base queries
  | 'embeddings'    // Vector search
  | 'default';      // Fallback for unspecified domains

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Open circuit after N failures
  successThreshold: number;      // Close circuit after N successes in half-open
  timeout: number;               // Time before attempting half-open (ms)
  monitoringWindow: number;      // Track failures in this window (ms)
  /** PHASE 4: Callback when circuit state changes */
  onStateChange?: (state: CircuitState, previousState: CircuitState) => void;
}

/** PHASE 4: Default configs per domain */
export const DOMAIN_CONFIGS: Record<CircuitDomain, Partial<CircuitBreakerConfig>> = {
  llm: {
    failureThreshold: 3,        // LLM failures are expensive, trip faster
    successThreshold: 2,
    timeout: 30000,             // 30 seconds - LLM providers recover quickly
    monitoringWindow: 60000,
  },
  analytics: {
    failureThreshold: 10,       // Analytics can tolerate more failures
    successThreshold: 3,
    timeout: 120000,            // 2 minutes - analytics not time-critical
    monitoringWindow: 300000,   // 5 minute window
  },
  sync: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    monitoringWindow: 120000,
  },
  knowledge: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 45000,
    monitoringWindow: 90000,
  },
  embeddings: {
    failureThreshold: 3,        // Embedding failures affect generation quality
    successThreshold: 2,
    timeout: 30000,
    monitoringWindow: 60000,
  },
  default: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    monitoringWindow: 120000,
  },
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = []; // Timestamps of failures
  private consecutiveSuccesses = 0;
  private openedAt?: number;
  private config: CircuitBreakerConfig;

  private providerName: string;

  constructor(
    providerName: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.providerName = providerName;
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
    // PHASE 4: Notify callback
    this.config.onStateChange?.('OPEN', previousState);
  }

  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = 'HALF_OPEN';
    this.consecutiveSuccesses = 0;
    console.log(`[CircuitBreaker] ${this.providerName}: OPEN -> HALF_OPEN (attempting reset)`);
    // PHASE 4: Notify callback
    this.config.onStateChange?.('HALF_OPEN', previousState);
  }

  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = 'CLOSED';
    this.failures = [];
    this.consecutiveSuccesses = 0;
    this.openedAt = undefined;
    console.log(
      `[CircuitBreaker] ${this.providerName}: HALF_OPEN -> CLOSED ` +
      `(${this.config.successThreshold} consecutive successes)`
    );
    // PHASE 4: Notify callback
    this.config.onStateChange?.('CLOSED', previousState);
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

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: PER-DOMAIN CIRCUIT BREAKER MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manages multiple circuit breakers, one per domain.
 * Allows independent failure tracking for different services.
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private globalStateChangeCallback?: (domain: string, state: CircuitState, previousState: CircuitState) => void;

  constructor(options?: {
    onStateChange?: (domain: string, state: CircuitState, previousState: CircuitState) => void;
  }) {
    this.globalStateChangeCallback = options?.onStateChange;
  }

  /**
   * Get or create a circuit breaker for a domain
   */
  getBreaker(domain: CircuitDomain, providerName?: string): CircuitBreaker {
    const key = providerName ? `${domain}:${providerName}` : domain;
    
    if (!this.breakers.has(key)) {
      const domainConfig = DOMAIN_CONFIGS[domain] || DOMAIN_CONFIGS.default;
      const breaker = new CircuitBreaker(key, {
        ...domainConfig,
        onStateChange: (state, previousState) => {
          this.globalStateChangeCallback?.(key, state, previousState);
        },
      });
      this.breakers.set(key, breaker);
    }
    
    return this.breakers.get(key)!;
  }

  /**
   * Execute operation with domain-specific circuit breaker
   */
  async execute<T>(
    domain: CircuitDomain,
    operation: () => Promise<T>,
    providerName?: string
  ): Promise<T> {
    const breaker = this.getBreaker(domain, providerName);
    return breaker.execute(operation);
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStats(): Record<string, {
    state: CircuitState;
    failures: number;
    consecutiveSuccesses: number;
    openedAt?: number;
  }> {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    for (const [key, breaker] of this.breakers.entries()) {
      stats[key] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Get count of open circuits
   */
  getOpenCircuitCount(): number {
    let count = 0;
    for (const breaker of this.breakers.values()) {
      if (breaker.getState() === 'OPEN') count++;
    }
    return count;
  }

  /**
   * Check if a specific domain is available
   */
  isAvailable(domain: CircuitDomain, providerName?: string): boolean {
    const key = providerName ? `${domain}:${providerName}` : domain;
    const breaker = this.breakers.get(key);
    if (!breaker) return true; // No breaker means no failures yet
    return breaker.getState() !== 'OPEN';
  }

  /**
   * Reset a specific domain's circuit breaker
   */
  reset(domain: CircuitDomain, providerName?: string): void {
    const key = providerName ? `${domain}:${providerName}` : domain;
    const breaker = this.breakers.get(key);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    console.log('[CircuitBreakerManager] All circuits reset');
  }

  /**
   * Get domains that are currently open
   */
  getOpenDomains(): string[] {
    const openDomains: string[] = [];
    for (const [key, breaker] of this.breakers.entries()) {
      if (breaker.getState() === 'OPEN') {
        openDomains.push(key);
      }
    }
    return openDomains;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let managerInstance: CircuitBreakerManager | null = null;

/**
 * Get the global circuit breaker manager instance
 */
export function getCircuitBreakerManager(): CircuitBreakerManager {
  if (!managerInstance) {
    managerInstance = new CircuitBreakerManager({
      onStateChange: (domain, state, previousState) => {
        console.log(`[CircuitBreakerManager] ${domain}: ${previousState} -> ${state}`);
        
        // Could emit events for monitoring here
        if (state === 'OPEN') {
          console.warn(`[CircuitBreakerManager] Domain ${domain} is now OPEN - requests will be rejected`);
        }
      },
    });
  }
  return managerInstance;
}

/**
 * Convenience function to execute with per-domain circuit breaker
 */
export async function executeWithCircuitBreaker<T>(
  domain: CircuitDomain,
  operation: () => Promise<T>,
  providerName?: string
): Promise<T> {
  return getCircuitBreakerManager().execute(domain, operation, providerName);
}
