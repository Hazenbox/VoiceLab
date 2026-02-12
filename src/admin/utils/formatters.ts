/**
 * Formatting utilities for analytics dashboard
 */

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Format response time in milliseconds
 */
export function formatResponseTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format a number with optional decimal places
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  if (decimals > 0) {
    return value.toFixed(decimals);
  }
  return Math.round(value).toLocaleString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate trend between current and previous values
 */
export function calculateTrend(
  current: number | null | undefined,
  previous: number | null | undefined
): { value: string; isPositive: boolean } | undefined {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return undefined;
  }
  
  if (previous === 0) {
    if (current === 0) return undefined;
    return { value: 'new', isPositive: true };
  }
  
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    value: `${pct > 0 ? '+' : ''}${pct}%`,
    isPositive: pct >= 0,
  };
}

/**
 * Format hour for chart labels
 */
export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Get time range label
 */
export function getTimeRangeLabel(range: string): string {
  switch (range) {
    case 'hour': return 'last hour';
    case 'day': return 'last 24 hours';
    case 'week': return 'last 7 days';
    case 'month': return 'last 30 days';
    case 'all': return 'all time';
    default: return range;
  }
}
