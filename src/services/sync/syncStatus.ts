/**
 * Sync Status Service
 * 
 * Provides observable sync status for UI indicators.
 * Tracks online/offline state, queue size, and sync operations.
 * 
 * @module services/sync/syncStatus
 */

import * as queueStorage from './queueStorage';
import { createLogger } from '../../utils/logger';

const log = createLogger('SyncStatus');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SyncState = 
  | 'online'     // Connected, no pending items
  | 'syncing'    // Actively syncing items
  | 'pending'    // Online but has pending items
  | 'offline'    // No network connection
  | 'error';     // Sync error occurred

export interface SyncStatus {
  /** Current sync state */
  state: SyncState;
  /** Number of items pending sync */
  pendingCount: number;
  /** Whether browser is online */
  isOnline: boolean;
  /** Last successful sync timestamp */
  lastSyncAt: number | null;
  /** Last error message if any */
  lastError: string | null;
  /** Whether currently syncing */
  isSyncing: boolean;
}

export type SyncStatusListener = (status: SyncStatus) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC STATUS MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class SyncStatusManager {
  private listeners: Set<SyncStatusListener> = new Set();
  private status: SyncStatus = {
    state: 'online',
    pendingCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSyncAt: null,
    lastError: null,
    isSyncing: false,
  };
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private handleOnline: (() => void) | null = null;
  private handleOffline: (() => void) | null = null;

  constructor() {
    this.initBrowserListeners();
    this.startPolling();
  }

  private initBrowserListeners(): void {
    if (typeof window === 'undefined') return;

    this.handleOnline = () => {
      this.updateStatus({ isOnline: true });
      this.refreshPendingCount();
    };

    this.handleOffline = () => {
      this.updateStatus({ isOnline: false, state: 'offline' });
    };

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private startPolling(): void {
    // Poll queue size every 5 seconds
    this.pollInterval = setInterval(() => {
      this.refreshPendingCount();
    }, 5000);
  }

  private async refreshPendingCount(): Promise<void> {
    try {
      const count = await queueStorage.getQueueSize();
      this.updateStatus({ pendingCount: count });
    } catch (error) {
      log.warn('Failed to get queue size', { error: String(error) });
    }
  }

  private updateStatus(updates: Partial<SyncStatus>): void {
    const newStatus = { ...this.status, ...updates };
    
    // Compute state based on other fields
    newStatus.state = this.computeState(newStatus);
    
    // Only notify if something actually changed
    if (JSON.stringify(newStatus) !== JSON.stringify(this.status)) {
      this.status = newStatus;
      this.notifyListeners();
    }
  }

  private computeState(status: Partial<SyncStatus> & Pick<SyncStatus, 'isOnline' | 'isSyncing' | 'pendingCount' | 'lastError'>): SyncState {
    if (!status.isOnline) {
      return 'offline';
    }
    if (status.lastError) {
      return 'error';
    }
    if (status.isSyncing) {
      return 'syncing';
    }
    if (status.pendingCount > 0) {
      return 'pending';
    }
    return 'online';
  }

  private notifyListeners(): void {
    const statusCopy = { ...this.status };
    this.listeners.forEach(listener => {
      try {
        listener(statusCopy);
      } catch (error) {
        log.warn('Listener error', { error: String(error) });
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Subscribe to sync status changes
   * Returns unsubscribe function
   */
  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener({ ...this.status });
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Mark sync operation as started
   */
  startSync(): void {
    this.updateStatus({ isSyncing: true, lastError: null });
  }

  /**
   * Mark sync operation as completed
   */
  endSync(error?: string): void {
    if (error) {
      this.updateStatus({ 
        isSyncing: false, 
        lastError: error,
      });
    } else {
      this.updateStatus({ 
        isSyncing: false, 
        lastSyncAt: Date.now(),
        lastError: null,
      });
    }
    // Refresh pending count after sync
    this.refreshPendingCount();
  }

  /**
   * Manually trigger a refresh of the pending count
   */
  refresh(): void {
    this.refreshPendingCount();
  }

  /**
   * Clear the last error
   */
  clearError(): void {
    this.updateStatus({ lastError: null });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (typeof window !== 'undefined') {
      if (this.handleOnline) window.removeEventListener('online', this.handleOnline);
      if (this.handleOffline) window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let statusManager: SyncStatusManager | null = null;

/**
 * Get the sync status manager singleton
 */
export function getSyncStatusManager(): SyncStatusManager {
  if (!statusManager) {
    statusManager = new SyncStatusManager();
  }
  return statusManager;
}

/**
 * Initialize sync status manager (call once at app startup)
 */
export function initSyncStatus(): SyncStatusManager {
  if (statusManager) {
    statusManager.destroy();
  }
  statusManager = new SyncStatusManager();
  return statusManager;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK (for convenience)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Custom hook for React components
 * Usage: const status = useSyncStatus();
 */
export function useSyncStatus(): SyncStatus {
  // This is just a placeholder - actual implementation should be in hooks/
  // to avoid React dependency in this service file
  throw new Error('useSyncStatus must be imported from hooks/useSyncStatus');
}
