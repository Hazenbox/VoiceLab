/**
 * Sync Status React Hook
 * 
 * Provides reactive sync status for UI components.
 * 
 * @module hooks/useSyncStatus
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  getSyncStatusManager, 
  type SyncStatus, 
  type SyncState,
} from '../services/sync/syncStatus';

export type { SyncStatus, SyncState };

/**
 * React hook for sync status
 * 
 * @example
 * ```tsx
 * const { status, refresh, clearError } = useSyncStatus();
 * 
 * if (status.state === 'offline') {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(() => {
    const manager = getSyncStatusManager();
    return manager.getStatus();
  });

  useEffect(() => {
    const manager = getSyncStatusManager();
    const unsubscribe = manager.subscribe(setStatus);
    
    return () => {
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => {
    getSyncStatusManager().refresh();
  }, []);

  const clearError = useCallback(() => {
    getSyncStatusManager().clearError();
  }, []);

  return {
    status,
    /** Manually refresh pending count */
    refresh,
    /** Clear last error */
    clearError,
    /** Convenience accessors */
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: status.pendingCount,
    state: status.state,
  };
}

export default useSyncStatus;
