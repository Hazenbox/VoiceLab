/**
 * Sync Module
 * 
 * Handles offline-first sync to Convex backend.
 * 
 * @module services/sync
 */

// Convex Sync Service
export {
  ConvexSyncService,
  initSyncService,
  getSyncService,
  getCachedConvexUserId,
  type AnalyticsEvent,
  type CorrectionEvent,
  type SessionCreateParams,
  type SessionUpdateParams,
  type InteractionEventParams,
  type UserProfileSync,
  type MutationFn,
} from './convexSync';

// Queue Storage
export {
  addToQueue,
  getQueue,
  removeFromQueue,
  updateAttempts,
  clearQueue,
  getQueueSize,
  removeExpiredEvents,
  isEventExpired,
  generateIdempotencyKey,
  hasIdempotencyKey,
  type QueuedEvent,
} from './queueStorage';

// Sync Status
export {
  getSyncStatusManager,
  initSyncStatus,
  type SyncStatus,
  type SyncState,
  type SyncStatusListener,
} from './syncStatus';
