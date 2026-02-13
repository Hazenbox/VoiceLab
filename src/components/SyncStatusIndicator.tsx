/**
 * Sync Status Indicator
 * 
 * Visual indicator showing offline/online state and sync queue status.
 * Shows pending count when items are waiting to sync.
 * 
 * @module components/SyncStatusIndicator
 */

import React, { useState, useEffect } from 'react';
import { useSyncStatus, type SyncState } from '../hooks/useSyncStatus';
import { DSIcon } from './DSIcon';

interface SyncStatusIndicatorProps {
  /** Whether to show detailed info on hover */
  showDetails?: boolean;
  /** Compact mode for tight spaces */
  compact?: boolean;
  /** Class name for container */
  className?: string;
}

// Status styling configuration
const stateConfig: Record<SyncState, {
  label: string;
  shortLabel: string;
  icon: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  animate?: boolean;
}> = {
  online: {
    label: 'synced',
    shortLabel: '',
    icon: 'IcCheckCircle',
    textColor: '#16a34a', // green-600
    bgColor: '#dcfce7', // green-100
    borderColor: '#86efac', // green-300
  },
  syncing: {
    label: 'syncing...',
    shortLabel: '',
    icon: 'IcRefresh',
    textColor: '#2563eb', // blue-600
    bgColor: '#dbeafe', // blue-100
    borderColor: '#93c5fd', // blue-300
    animate: true,
  },
  pending: {
    label: 'pending sync',
    shortLabel: 'pending',
    icon: 'IcClock',
    textColor: '#ca8a04', // yellow-600
    bgColor: '#fef9c3', // yellow-100
    borderColor: '#fde047', // yellow-300
  },
  offline: {
    label: 'offline',
    shortLabel: 'offline',
    icon: 'IcWifiOff',
    textColor: '#dc2626', // red-600
    bgColor: '#fee2e2', // red-100
    borderColor: '#fca5a5', // red-300
  },
  error: {
    label: 'sync error',
    shortLabel: 'error',
    icon: 'IcWarning',
    textColor: '#dc2626', // red-600
    bgColor: '#fee2e2', // red-100
    borderColor: '#fca5a5', // red-300
  },
};

/**
 * Compact dot indicator for minimal UI
 */
const DotIndicator: React.FC<{ state: SyncState; pendingCount: number }> = ({ 
  state, 
  pendingCount 
}) => {
  const config = stateConfig[state];
  
  return (
    <div className="relative inline-flex items-center">
      <span
        className={`h-2 w-2 rounded-full ${config.animate ? 'animate-spin' : ''}`}
        style={{ backgroundColor: config.textColor }}
      />
      {/* Ping animation for offline/error states */}
      {(state === 'offline' || state === 'error') && (
        <span
          className="absolute inline-flex h-2 w-2 rounded-full animate-ping opacity-75"
          style={{ backgroundColor: config.textColor }}
        />
      )}
      {/* Pending count badge */}
      {pendingCount > 0 && state !== 'online' && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center h-3 w-3 text-[8px] font-bold rounded-full"
          style={{
            backgroundColor: config.textColor,
            color: 'white',
          }}
        >
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </div>
  );
};

/**
 * Full badge indicator with label
 */
const BadgeIndicator: React.FC<{ 
  state: SyncState; 
  pendingCount: number;
  lastSyncAt: number | null;
  showDetails: boolean;
}> = ({ state, pendingCount, lastSyncAt, showDetails }) => {
  const config = stateConfig[state];
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Format last sync time
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => showDetails && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-300"
        style={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          borderColor: config.borderColor,
        }}
      >
        <span className={config.animate ? 'animate-spin' : ''}>
          <DSIcon name={config.icon as any} size="XS" attention="medium" />
        </span>
        
        <span className="text-xs font-medium">
          {pendingCount > 0 && state === 'pending' 
            ? `${pendingCount} ${config.label}`
            : config.label
          }
        </span>

        {/* Pulse for active states */}
        {(state === 'syncing' || state === 'offline') && (
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: config.textColor }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ backgroundColor: config.textColor }}
            />
          </span>
        )}
      </div>

      {/* Tooltip with details */}
      {showTooltip && showDetails && (
        <div 
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50"
        >
          <div className="flex flex-col gap-1">
            <div>status: {state}</div>
            {pendingCount > 0 && <div>pending: {pendingCount} items</div>}
            <div>last sync: {formatLastSync(lastSyncAt)}</div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

/**
 * Sync Status Indicator Component
 * 
 * Displays the current sync status to users so they know if their data
 * has been synced to the server or is pending.
 * 
 * @example
 * ```tsx
 * // Full badge indicator
 * <SyncStatusIndicator showDetails />
 * 
 * // Compact dot indicator
 * <SyncStatusIndicator compact />
 * ```
 */
export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  showDetails = true,
  compact = false,
  className = '',
}) => {
  const { status, state, pendingCount } = useSyncStatus();
  
  // Don't show indicator when everything is synced (unless in details mode)
  const [hasBeenOffline, setHasBeenOffline] = useState(false);
  
  useEffect(() => {
    if (state === 'offline' || state === 'error') {
      setHasBeenOffline(true);
    }
  }, [state]);

  // Only show when there's something to show
  // - Always show if offline or error
  // - Show if there are pending items
  // - Show syncing state
  // - Show briefly after recovering from offline
  const shouldShow = state !== 'online' || (hasBeenOffline && pendingCount === 0);
  
  // Auto-hide after sync completes (if previously offline)
  useEffect(() => {
    if (state === 'online' && hasBeenOffline && pendingCount === 0) {
      const timer = setTimeout(() => {
        setHasBeenOffline(false);
      }, 3000); // Show "synced" for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [state, hasBeenOffline, pendingCount]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`sync-status-indicator ${className}`}>
      {compact ? (
        <DotIndicator state={state} pendingCount={pendingCount} />
      ) : (
        <BadgeIndicator 
          state={state} 
          pendingCount={pendingCount}
          lastSyncAt={status.lastSyncAt}
          showDetails={showDetails}
        />
      )}
    </div>
  );
};

export default SyncStatusIndicator;
