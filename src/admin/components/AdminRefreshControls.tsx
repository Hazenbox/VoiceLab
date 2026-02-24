/**
 * Admin Refresh Controls Component
 * 
 * PHASE 3: Provides manual refresh functionality for admin sections
 * to reduce continuous polling while giving users control over data freshness.
 */

import { useThemeColors } from '../../theme/useColors';
import { Button, Text } from '@marcelinodzn/ds-react';

interface AdminRefreshControlsProps {
  /** Last refresh timestamp */
  lastRefresh: number | null;
  /** Whether the section is currently refreshing/loading */
  isLoading?: boolean;
  /** Whether queries are paused due to tab visibility */
  isPaused?: boolean;
  /** Callback to trigger a refresh */
  onRefresh: () => void;
  /** Optional label override */
  label?: string;
}

export function AdminRefreshControls({
  lastRefresh,
  isLoading = false,
  isPaused = false,
  onRefresh,
  label = 'data',
}: AdminRefreshControlsProps) {
  const theme = useThemeColors();

  const getLastRefreshText = (): string => {
    if (!lastRefresh) return 'never';
    const elapsed = Date.now() - lastRefresh;
    if (elapsed < 10000) return 'just now';
    if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s ago`;
    if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
    return `${Math.floor(elapsed / 3600000)}h ago`;
  };

  return (
    <div 
      className="flex items-center gap-3 px-3 py-2 rounded-lg"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <Text size="XS" color="low">
        {label} updated: <span style={{ color: theme.text.medium }}>{getLastRefreshText()}</span>
      </Text>
      
      {isPaused && (
        <span 
          className="text-xs px-2 py-0.5 rounded"
          style={{ 
            backgroundColor: `${theme.accent}20`,
            color: theme.accent,
          }}
        >
          paused
        </span>
      )}
      
      <Button
        appearance="ghost"
        size="XS"
        onPress={onRefresh}
        isDisabled={isLoading}
      >
        {isLoading ? 'refreshing...' : 'refresh'}
      </Button>
    </div>
  );
}

/**
 * Compact inline refresh indicator
 */
export function RefreshIndicator({
  lastRefresh,
  isStale = false,
}: {
  lastRefresh: number | null;
  isStale?: boolean;
}) {
  const theme = useThemeColors();
  
  if (!lastRefresh) return null;

  const elapsed = Date.now() - lastRefresh;
  const text = elapsed < 60000 
    ? 'just now' 
    : elapsed < 3600000 
      ? `${Math.floor(elapsed / 60000)}m ago`
      : `${Math.floor(elapsed / 3600000)}h ago`;

  return (
    <span 
      className="text-xs"
      style={{ 
        color: isStale ? theme.accent : theme.text.low,
        fontStyle: isStale ? 'italic' : 'normal',
      }}
    >
      {isStale ? `stale (${text})` : text}
    </span>
  );
}
