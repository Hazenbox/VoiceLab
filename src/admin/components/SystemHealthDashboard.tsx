/**
 * System Health Dashboard Component
 * 
 * PHASE 6: Monitoring and observability dashboard for admin panel.
 * Displays:
 * - Queue health (depth, oldest event age)
 * - Circuit breaker states per domain
 * - Cache statistics
 * - Recent sync errors
 */

import { useState, useEffect } from 'react';
import { useThemeColors } from '../../theme/useColors';
import { Text } from '@marcelinodzn/ds-react';
import { useSystemHealth, type SystemHealth } from '../../hooks/useSystemHealth';

interface HealthStatusBadgeProps {
  status: 'healthy' | 'degraded' | 'critical';
}

function HealthStatusBadge({ status }: HealthStatusBadgeProps) {
  const theme = useThemeColors();
  
  const colors = {
    healthy: { bg: '#10b98120', text: '#10b981' },
    degraded: { bg: '#f59e0b20', text: '#f59e0b' },
    critical: { bg: '#ef444420', text: '#ef4444' },
  };
  
  const { bg, text } = colors[status];
  
  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {status}
    </span>
  );
}

interface CircuitBreakerCardProps {
  domain: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  consecutiveSuccesses: number;
}

function CircuitBreakerCard({ domain, state, failures, consecutiveSuccesses }: CircuitBreakerCardProps) {
  const theme = useThemeColors();
  
  const stateColors = {
    CLOSED: { bg: '#10b98120', text: '#10b981', label: 'closed' },
    OPEN: { bg: '#ef444420', text: '#ef4444', label: 'open' },
    HALF_OPEN: { bg: '#f59e0b20', text: '#f59e0b', label: 'half-open' },
  };
  
  const { bg, text, label } = stateColors[state];
  
  return (
    <div
      className="p-3 rounded-lg"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <Text size="S" weight="semibold" color="high">{domain}</Text>
        <span
          className="px-2 py-0.5 rounded text-xs"
          style={{ backgroundColor: bg, color: text }}
        >
          {label}
        </span>
      </div>
      <div className="flex gap-4 text-xs" style={{ color: theme.text.low }}>
        <span>failures: {failures}</span>
        <span>successes: {consecutiveSuccesses}</span>
      </div>
    </div>
  );
}

interface QueueHealthCardProps {
  depth: number;
  oldestEventAge: number | null;
  maxQueueSize: number;
}

function QueueHealthCard({ depth, oldestEventAge, maxQueueSize }: QueueHealthCardProps) {
  const theme = useThemeColors();
  
  const utilizationPercent = Math.round((depth / maxQueueSize) * 100);
  const isWarning = utilizationPercent > 50;
  const isCritical = utilizationPercent > 80;
  
  const barColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
  
  const formatAge = (ms: number | null): string => {
    if (!ms) return 'n/a';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };
  
  return (
    <div
      className="p-4 rounded-lg"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <Text size="S" weight="semibold" color="high">offline queue</Text>
        <HealthStatusBadge status={isCritical ? 'critical' : isWarning ? 'degraded' : 'healthy'} />
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1" style={{ color: theme.text.medium }}>
          <span>{depth} events</span>
          <span>{utilizationPercent}% of {maxQueueSize}</span>
        </div>
        <div 
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: theme.stroke.low }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${utilizationPercent}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>
      
      <div className="text-xs" style={{ color: theme.text.low }}>
        oldest event: {formatAge(oldestEventAge)}
      </div>
    </div>
  );
}

interface CacheStatsCardProps {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

function CacheStatsCard({ hits, misses, evictions, size }: CacheStatsCardProps) {
  const theme = useThemeColors();
  
  const total = hits + misses;
  const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
  
  return (
    <div
      className="p-4 rounded-lg"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <Text size="S" weight="semibold" color="high" className="mb-3 block">
        cache performance
      </Text>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-2xl font-bold" style={{ color: theme.accent }}>
            {hitRate}%
          </div>
          <div className="text-xs" style={{ color: theme.text.low }}>hit rate</div>
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: theme.text.high }}>
            {size}
          </div>
          <div className="text-xs" style={{ color: theme.text.low }}>cached items</div>
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: theme.text.medium }}>
            {hits}
          </div>
          <div className="text-xs" style={{ color: theme.text.low }}>hits</div>
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: theme.text.medium }}>
            {evictions}
          </div>
          <div className="text-xs" style={{ color: theme.text.low }}>evictions</div>
        </div>
      </div>
    </div>
  );
}

interface SyncErrorListProps {
  errors: Array<{
    timestamp: number;
    domain: string;
    message: string;
  }>;
}

function SyncErrorList({ errors }: SyncErrorListProps) {
  const theme = useThemeColors();
  
  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  if (errors.length === 0) {
    return (
      <div
        className="p-4 rounded-lg text-center"
        style={{ 
          backgroundColor: theme.background.ghost,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <Text size="S" color="low">no recent sync errors</Text>
      </div>
    );
  }
  
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <div className="p-3 border-b" style={{ borderColor: theme.stroke.low }}>
        <Text size="S" weight="semibold" color="high">recent sync errors</Text>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {errors.map((error, i) => (
          <div
            key={i}
            className="p-3 border-b last:border-b-0"
            style={{ borderColor: theme.stroke.low }}
          >
            <div className="flex justify-between items-start mb-1">
              <span 
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
              >
                {error.domain}
              </span>
              <span className="text-xs" style={{ color: theme.text.low }}>
                {formatTime(error.timestamp)}
              </span>
            </div>
            <Text size="XS" color="medium" className="break-words">
              {error.message}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SystemHealthDashboard() {
  const theme = useThemeColors();
  const health = useSystemHealth();
  
  if (!health) {
    return (
      <div className="p-4 text-center">
        <Text size="S" color="low">loading system health...</Text>
      </div>
    );
  }
  
  const overallStatus = health.openCircuitCount > 0 
    ? 'critical' 
    : health.queueHealth.utilizationPercent > 50 
      ? 'degraded' 
      : 'healthy';
  
  return (
    <div className="space-y-4">
      {/* Header with overall status */}
      <div 
        className="p-4 rounded-xl"
        style={{ 
          backgroundColor: theme.background.ghost,
          border: `1px solid ${theme.stroke.medium}`,
        }}
      >
        <div className="flex justify-between items-center">
          <div>
            <Text size="M" weight="bold" color="high">system health</Text>
            <Text size="XS" color="low">monitoring sync, caching, and reliability systems</Text>
          </div>
          <HealthStatusBadge status={overallStatus} />
        </div>
      </div>
      
      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Queue Health */}
        <QueueHealthCard
          depth={health.queueHealth.depth}
          oldestEventAge={health.queueHealth.oldestEventAge}
          maxQueueSize={health.queueHealth.maxQueueSize}
        />
        
        {/* Cache Stats */}
        <CacheStatsCard
          hits={health.cacheStats.hits}
          misses={health.cacheStats.misses}
          evictions={health.cacheStats.evictions}
          size={health.cacheStats.size}
        />
      </div>
      
      {/* Circuit Breakers */}
      <div>
        <Text size="S" weight="semibold" color="high" className="mb-3 block">
          circuit breakers ({health.openCircuitCount} open)
        </Text>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(health.circuitBreakers).map(([domain, stats]) => (
            <CircuitBreakerCard
              key={domain}
              domain={domain}
              state={stats.state}
              failures={stats.failures}
              consecutiveSuccesses={stats.consecutiveSuccesses}
            />
          ))}
          {Object.keys(health.circuitBreakers).length === 0 && (
            <div className="col-span-full text-center py-4">
              <Text size="S" color="low">no circuit breakers active</Text>
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Errors */}
      <SyncErrorList errors={health.recentErrors} />
      
      {/* Last Updated */}
      <div className="text-center">
        <Text size="XS" color="low">
          last updated: {new Date(health.lastUpdated).toLocaleTimeString()}
        </Text>
      </div>
    </div>
  );
}
