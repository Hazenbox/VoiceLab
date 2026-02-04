/**
 * Provider Health Monitor Component
 * Displays health status of LLM providers with circuit breaker states
 */

import { useState, useEffect } from 'react';
import { getOrchestratorInstance } from '../services/llm/orchestrator';
import { getAvailableLLMProviders, type LLMProviderType } from '../services/providers/llm';
import type { CircuitState } from '../services/reliability/circuitBreaker';

interface ProviderHealth {
  type: LLMProviderType;
  displayName: string;
  isConfigured: boolean;
  circuitState: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
}

interface ProviderHealthMonitorProps {
  compact?: boolean;
  showUnconfigured?: boolean;
  className?: string;
}

const stateColors: Record<CircuitState, { bg: string; text: string; dot: string }> = {
  CLOSED: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    dot: 'bg-green-500',
  },
  OPEN: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  HALF_OPEN: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
};

const stateLabels: Record<CircuitState, string> = {
  CLOSED: 'Healthy',
  OPEN: 'Unavailable',
  HALF_OPEN: 'Testing',
};

export function ProviderHealthMonitor({
  compact = false,
  showUnconfigured = false,
  className = '',
}: ProviderHealthMonitorProps) {
  const [health, setHealth] = useState<ProviderHealth[]>([]);

  useEffect(() => {
    const loadHealth = () => {
      const providers = getAvailableLLMProviders();
      const orchestrator = getOrchestratorInstance();
      const circuitStates = orchestrator.getCircuitStates();

      const healthData: ProviderHealth[] = providers
        .filter(p => showUnconfigured || p.isConfigured)
        .map(p => ({
          type: p.type,
          displayName: p.displayName,
          isConfigured: p.isConfigured,
          circuitState: circuitStates[p.type]?.state || 'CLOSED',
          failureCount: circuitStates[p.type]?.failures || 0,
          successCount: circuitStates[p.type]?.consecutiveSuccesses || 0,
          lastFailure: circuitStates[p.type]?.openedAt
            ? new Date(circuitStates[p.type]!.openedAt!)
            : undefined,
        }));

      setHealth(healthData);
    };

    loadHealth();
    const interval = setInterval(loadHealth, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, [showUnconfigured]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {health.map(provider => (
          <div
            key={provider.type}
            className="flex items-center gap-1"
            title={`${provider.displayName}: ${stateLabels[provider.circuitState]}`}
          >
            <span className={`w-2 h-2 rounded-full ${stateColors[provider.circuitState].dot}`} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {provider.displayName.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-3">
        Provider Health
      </h3>

      <div className="space-y-2">
        {health.map(provider => (
          <div
            key={provider.type}
            className={`flex items-center justify-between p-2 rounded-lg ${
              provider.isConfigured
                ? stateColors[provider.circuitState].bg
                : 'bg-zinc-100 dark:bg-zinc-700/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  provider.isConfigured
                    ? stateColors[provider.circuitState].dot
                    : 'bg-zinc-400 dark:bg-zinc-500'
                }`}
              />
              <span
                className={`text-sm ${
                  provider.isConfigured
                    ? stateColors[provider.circuitState].text
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {provider.displayName}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {provider.isConfigured && (
                <>
                  {/* Status badge */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${stateColors[provider.circuitState].bg} ${stateColors[provider.circuitState].text}`}
                  >
                    {stateLabels[provider.circuitState]}
                  </span>

                  {/* Failure count if any */}
                  {provider.failureCount > 0 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {provider.failureCount} failures
                    </span>
                  )}
                </>
              )}

              {!provider.isConfigured && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Not configured
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {health.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
          No providers configured
        </p>
      )}
    </div>
  );
}

/**
 * Compact status indicator for a single provider
 */
export function ProviderStatusDot({
  provider,
  className = '',
}: {
  provider: LLMProviderType;
  className?: string;
}) {
  const [state, setState] = useState<CircuitState>('CLOSED');

  useEffect(() => {
    const checkState = () => {
      const orchestrator = getOrchestratorInstance();
      const states = orchestrator.getCircuitStates();
      setState(states[provider]?.state || 'CLOSED');
    };

    checkState();
    const interval = setInterval(checkState, 5000);
    return () => clearInterval(interval);
  }, [provider]);

  return (
    <span
      className={`w-2 h-2 rounded-full ${stateColors[state].dot} ${className}`}
      title={stateLabels[state]}
    />
  );
}

/**
 * Inline health bar for header
 */
export function ProviderHealthBar({ className = '' }: { className?: string }) {
  return <ProviderHealthMonitor compact className={className} />;
}
