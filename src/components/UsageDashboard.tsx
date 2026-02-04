/**
 * Usage Dashboard Component
 * Displays LLM usage statistics, costs, and performance metrics
 */

import { useState, useEffect, useMemo } from 'react';
import { getOrchestratorInstance } from '../services/llm/orchestrator';
import type { UsageStats } from '../services/monitoring/costTracker';

interface UsageDashboardProps {
  compact?: boolean;
  className?: string;
}

export function UsageDashboard({ compact = false, className = '' }: UsageDashboardProps) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'all'>('day');

  useEffect(() => {
    const loadStats = () => {
      const orchestrator = getOrchestratorInstance();
      const costStats = orchestrator.getCostStats();
      
      // Filter by time range
      const now = Date.now();
      const ranges: Record<string, number> = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        all: Infinity,
      };
      
      const since = now - ranges[timeRange];
      
      if (timeRange === 'all') {
        setStats(costStats);
      } else {
        // Re-calculate with time filter
        const filtered = orchestrator.getCostStats();
        // For now, use the full stats (would need costTracker method to filter)
        setStats(filtered);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [timeRange]);

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-4 text-xs ${className}`}>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-zinc-600 dark:text-zinc-400">
            {formatCost(stats?.totalCost || 0)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span className="text-zinc-600 dark:text-zinc-400">
            {formatTokens(stats?.totalTokens || 0)} tokens
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-zinc-600 dark:text-zinc-400">
            {stats?.averageLatency?.toFixed(0) || 0}ms avg
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Usage Statistics
        </h3>
        <div className="flex gap-1">
          {(['hour', 'day', 'week', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs rounded ${
                timeRange === range
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              {range === 'all' ? 'All' : range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Cost */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-green-700 dark:text-green-300">Total Cost</span>
          </div>
          <div className="text-lg font-bold text-green-800 dark:text-green-200">
            {formatCost(stats?.totalCost || 0)}
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="text-xs text-blue-700 dark:text-blue-300">Total Tokens</span>
          </div>
          <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
            {formatTokens(stats?.totalTokens || 0)}
          </div>
        </div>

        {/* Avg Latency */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-purple-700 dark:text-purple-300">Avg Latency</span>
          </div>
          <div className="text-lg font-bold text-purple-800 dark:text-purple-200">
            {stats?.averageLatency?.toFixed(0) || 0}ms
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-orange-700 dark:text-orange-300">Success Rate</span>
          </div>
          <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
            {stats?.successRate?.toFixed(1) || 100}%
          </div>
        </div>
      </div>

      {/* Provider Breakdown */}
      {stats?.byProvider && Object.keys(stats.byProvider).length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            By Provider
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.byProvider).map(([provider, providerStats]) => (
              <div
                key={provider}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-zinc-700 dark:text-zinc-300 capitalize">
                  {provider}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">
                    {formatTokens(providerStats.tokens)} tokens
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatCost(providerStats.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Count */}
      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between text-xs text-zinc-500">
        <span>{stats?.requestCount || 0} total requests</span>
        <span>{stats?.errorCount || 0} errors</span>
      </div>
    </div>
  );
}

/**
 * Mini stats bar for header
 */
export function UsageStatsBar({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    const loadStats = () => {
      const orchestrator = getOrchestratorInstance();
      setStats(orchestrator.getCostStats());
    };

    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats || stats.requestCount === 0) {
    return null;
  }

  return (
    <UsageDashboard compact className={className} />
  );
}
