/**
 * Convex Background Sync Service
 * 
 * Non-blocking, fire-and-forget sync of local actions to Convex.
 * If Convex is unreachable, events are queued in IndexedDB (with localStorage fallback)
 * and flushed on next successful connection.
 * 
 * Phase 4 Enhancements:
 * - Retry with exponential backoff for transient failures
 * - Improved error classification (retryable vs non-retryable)
 * 
 * This module has ZERO compile-time dependencies on Convex generated types.
 * All Convex calls go through the injected mutationFn callback.
 */

import * as queueStorage from './queueStorage';
import { withRetry, type RetryOptions } from '../reliability';
import { getSyncStatusManager } from './syncStatus';

// ── Retry Configuration ───────────────────────────────────────────
const RETRY_CONFIG: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  isRetryable: (error: Error) => {
    // Don't retry validation errors or permission errors
    const message = error.message.toLowerCase();
    if (message.includes('validation') || message.includes('invalid')) return false;
    if (message.includes('permission') || message.includes('unauthorized')) return false;
    if (message.includes('not found')) return false;
    // Retry network errors, timeouts, and server errors
    return true;
  },
};

// ── Types ────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  eventType: string;
  ecosystem: string;
  channel: string;
  persona: string;
  trustScore?: number;
  violationCount?: number;
  topViolations?: string[];
  userAction?: string;
  tokenCount?: number;
  llmProvider?: string;
  timestamp: number;
  // v2: Session tracking fields
  sessionId?: string;
  responseTimeMs?: number;
  messageSequenceNumber?: number;
  wasRegeneration?: boolean;
  errorType?: string;
  errorMessage?: string;
}

export interface CorrectionEvent {
  messageContent: string;
  originalContent: string;
  editedContent?: string;
  feedbackType: string;
  comment?: string;
  reasons?: string[];
  ecosystem: string;
  channel: string;
  persona: string;
  trustScore?: number;
  generationContext?: string;
  idempotencyKey?: string;  // P0-FIX: For deduplication
}

// v2: Session tracking types
export interface SessionCreateParams {
  projectId: string;
  projectName: string;
  ecosystem: string;
  channel: string;
  persona: string;
  userAgent?: string;
  screenWidth?: number;
  screenHeight?: number;
}

export interface SessionUpdateParams {
  sessionId: string;
  messageCount?: number;
  userMessageCount?: number;
  assistantMessageCount?: number;
  averageResponseTimeMs?: number;
  contextSwitches?: number;
  regenerationCount?: number;
  copyActionCount?: number;
  voiceMessageCount?: number;
  textMessageCount?: number;
  ecosystem?: string;
  channel?: string;
  persona?: string;
}

export interface InteractionEventParams {
  sessionId?: string;
  eventType: string;
  target: string;
  metadata?: string;
}

export interface UserProfileSync {
  deviceId: string;
  name: string;
  role: string;
  product: string;
}

// Callback type for Convex mutations -- injected from React layer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MutationFn = (name: string, args: Record<string, any>) => Promise<any>;

// ── Storage Keys ─────────────────────────────────────────────────

const USER_CONVEX_ID_KEY = 'voicelab_convex_user_id';

// ── Queue Management ─────────────────────────────────────────────
// Note: Queue functions are now imported from queueStorage.ts (IndexedDB-backed)

// ── Convex User ID Cache ─────────────────────────────────────────

export function getCachedConvexUserId(): string | null {
  try {
    return localStorage.getItem(USER_CONVEX_ID_KEY);
  } catch {
    return null;
  }
}

function setCachedConvexUserId(id: string): void {
  try {
    localStorage.setItem(USER_CONVEX_ID_KEY, id);
  } catch { /* ignore */ }
}

// ── Sync Service Class ───────────────────────────────────────────

export class ConvexSyncService {
  private mutationFn: MutationFn | null = null;
  private deviceId: string | null = null;
  private convexUserId: string | null = null;
  private isOnline = true;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private eventBuffer: AnalyticsEvent[] = [];
  private bufferFlushMs = 5000;
  private isFlushingBuffer = false; // Prevent concurrent flush operations
  private isFlushingQueue = false; // P0-FIX: Prevent concurrent queue flush
  private processedIdempotencyKeys: Set<string> = new Set(); // P0-FIX: Track processed keys to prevent duplicates
  // Store bound handlers so we can remove them in destroy()
  private handleOnline: (() => void) | null = null;
  private handleOffline: (() => void) | null = null;

  constructor() {
    this.convexUserId = getCachedConvexUserId();

    if (typeof window !== 'undefined') {
      this.handleOnline = () => {
        this.isOnline = true;
        this.flushQueue();
      };
      this.handleOffline = () => {
        this.isOnline = false;
      };
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  // ── Set mutation function (called from React layer) ──────────

  setMutationFn(fn: MutationFn): void {
    this.mutationFn = fn;
    // Try to flush any queued events now that we have a mutation function
    this.flushQueue();
  }

  setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
  }

  setConvexUserId(userId: string): void {
    this.convexUserId = userId;
    setCachedConvexUserId(userId);
  }

  private get isAvailable(): boolean {
    return this.mutationFn !== null && this.isOnline;
  }

  // ── Safe mutation call with retry ────────────────────────────

  // Returns { ok: true, value } on success, { ok: false } on failure.
  // Uses exponential backoff for transient failures.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async safeMutation(name: string, args: Record<string, any>): Promise<{ ok: true; value: any } | { ok: false }> {
    if (!this.mutationFn) return { ok: false };
    
    try {
      const result = await withRetry(
        () => this.mutationFn!(name, args),
        {
          ...RETRY_CONFIG,
          onRetry: (attempt, error, delay) => {
            console.log(`[ConvexSync] Retry ${attempt} for ${name} after ${delay}ms:`, error.message);
          },
        }
      );
      return { ok: true, value: result };
    } catch (error) {
      console.warn('[ConvexSync] Mutation failed after retries:', name, error);
      return { ok: false };
    }
  }
  
  // For operations that should not retry (e.g., idempotent operations or quick fails)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async safeMutationNoRetry(name: string, args: Record<string, any>): Promise<{ ok: true; value: any } | { ok: false }> {
    if (!this.mutationFn) return { ok: false };
    try {
      const result = await this.mutationFn(name, args);
      return { ok: true, value: result };
    } catch (error) {
      console.warn('[ConvexSync] Mutation failed:', name, error);
      return { ok: false };
    }
  }

  // ── User Profile Sync ────────────────────────────────────────

  async syncUserProfile(profile: UserProfileSync): Promise<string | null> {
    if (!this.isAvailable) {
      console.log('[ConvexSync] syncUserProfile: not available, queuing');
      queueStorage.addToQueue({
        type: 'user_sync',
        data: { ...profile },
        timestamp: Date.now(),
      });
      return null;
    }

    this.deviceId = profile.deviceId;

    const result = await this.safeMutation('users:createOrUpdate', {
      deviceId: profile.deviceId,
      name: profile.name,
      role: profile.role,
      product: profile.product,
    });

    if (result.ok && result.value) {
      this.setConvexUserId(result.value);
      console.log('[ConvexSync] syncUserProfile: success, userId:', result.value);
      return result.value;
    }
    
    // Mutation failed - queue for retry
    console.warn('[ConvexSync] syncUserProfile: mutation failed, queuing for retry');
    queueStorage.addToQueue({
      type: 'user_sync',
      data: { ...profile },
      timestamp: Date.now(),
    });
    return null;
  }

  // ── Heartbeat ────────────────────────────────────────────────

  async heartbeat(): Promise<void> {
    if (!this.isAvailable || !this.deviceId) return;

    const result = await this.safeMutation('users:heartbeat', {
      deviceId: this.deviceId,
    });

    if (!result.ok && this.deviceId) {
      queueStorage.addToQueue({
        type: 'heartbeat',
        data: { deviceId: this.deviceId },
        timestamp: Date.now(),
      });
    }
  }

  // ── Log Analytics Event ──────────────────────────────────────

  logAnalyticsEvent(event: AnalyticsEvent): void {
    if (!this.convexUserId || !this.deviceId) {
      queueStorage.addToQueue({
        type: 'analytics',
        data: { ...event },
        timestamp: event.timestamp,
      });
      return;
    }

    this.eventBuffer.push(event);
    this.scheduleBufferFlush();
  }

  private scheduleBufferFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushEventBuffer();
      this.flushTimer = null;
    }, this.bufferFlushMs);
  }

  private async flushEventBuffer(): Promise<void> {
    // Prevent concurrent flush operations - race condition fix
    if (this.isFlushingBuffer) {
      return;
    }
    
    if (this.eventBuffer.length === 0) return;
    
    if (!this.isAvailable || !this.convexUserId || !this.deviceId) {
      // Move to persistent queue when can't sync
      const eventsToQueue = [...this.eventBuffer];
      this.eventBuffer = [];
      for (const event of eventsToQueue) {
        queueStorage.addToQueue({ type: 'analytics', data: { ...event }, timestamp: event.timestamp });
      }
      return;
    }

    // Mark as flushing to prevent race conditions
    this.isFlushingBuffer = true;
    
    // CRITICAL: Take a snapshot of current buffer and clear it atomically
    // New events arriving during flush will accumulate in the now-empty buffer
    const events = this.eventBuffer;
    this.eventBuffer = [];

    try {
      const result = await this.safeMutation('analytics:batchLogEvents', {
        events: events.map((e) => ({
          ...e,
          userId: this.convexUserId,
          deviceId: this.deviceId!,
        })),
      });

      if (!result.ok) {
        // Mutation failed - queue events for retry
        for (const event of events) {
          queueStorage.addToQueue({ type: 'analytics', data: { ...event }, timestamp: event.timestamp });
        }
      }
    } finally {
      this.isFlushingBuffer = false;
      
      // If new events accumulated during flush, schedule another flush
      if (this.eventBuffer.length > 0) {
        this.scheduleBufferFlush();
      }
    }
  }

  // ── Log Correction/Feedback ──────────────────────────────────

  async logCorrection(correction: CorrectionEvent): Promise<void> {
    if (!this.isAvailable || !this.convexUserId || !this.deviceId) {
      queueStorage.addToQueue({
        type: 'correction',
        data: { ...correction },
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.safeMutation('corrections:create', {
      ...correction,
      userId: this.convexUserId,
      deviceId: this.deviceId,
    });

    if (!result.ok) {
      queueStorage.addToQueue({
        type: 'correction',
        data: { ...correction },
        timestamp: Date.now(),
      });
    }
  }

  // ── Session Management (v2) ─────────────────────────────────────

  /**
   * Create a new conversation session in Convex
   * Returns the session ID or null if failed
   */
  async createSession(params: SessionCreateParams): Promise<string | null> {
    if (!this.isAvailable || !this.convexUserId || !this.deviceId) {
      queueStorage.addToQueue({
        type: 'session_create',
        data: { ...params },
        timestamp: Date.now(),
      });
      return null;
    }

    const result = await this.safeMutation('sessions:create', {
      userId: this.convexUserId,
      deviceId: this.deviceId,
      ...params,
    });

    if (result.ok && result.value) {
      console.log('[ConvexSync] Session created:', result.value);
      return result.value;
    }

    // Queue for retry
    queueStorage.addToQueue({
      type: 'session_create',
      data: { ...params },
      timestamp: Date.now(),
    });
    return null;
  }

  /**
   * Update session metrics
   */
  async updateSession(params: SessionUpdateParams): Promise<void> {
    if (!this.isAvailable) {
      queueStorage.addToQueue({
        type: 'session_update',
        data: { ...params },
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.safeMutation('sessions:updateMetrics', params);

    if (!result.ok) {
      queueStorage.addToQueue({
        type: 'session_update',
        data: { ...params },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, exitReason: string = 'user_left'): Promise<void> {
    if (!this.isAvailable) {
      queueStorage.addToQueue({
        type: 'session_end',
        data: { sessionId, exitReason },
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.safeMutation('sessions:end', {
      sessionId,
      exitReason,
    });

    if (!result.ok) {
      queueStorage.addToQueue({
        type: 'session_end',
        data: { sessionId, exitReason },
        timestamp: Date.now(),
      });
    }
  }

  // ── Interaction Event Logging (v2) ──────────────────────────────

  /**
   * Log a single interaction event
   */
  async logInteraction(params: InteractionEventParams): Promise<void> {
    if (!this.isAvailable || !this.convexUserId || !this.deviceId) {
      queueStorage.addToQueue({
        type: 'interaction',
        data: { ...params },
        timestamp: Date.now(),
      });
      return;
    }

    const result = await this.safeMutation('interactions:log', {
      userId: this.convexUserId,
      deviceId: this.deviceId,
      ...params,
    });

    if (!result.ok) {
      queueStorage.addToQueue({
        type: 'interaction',
        data: { ...params },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Batch log interaction events
   */
  async batchLogInteractions(events: InteractionEventParams[]): Promise<void> {
    if (!this.isAvailable || !this.convexUserId || !this.deviceId) {
      for (const event of events) {
        queueStorage.addToQueue({
          type: 'interaction',
          data: { ...event },
          timestamp: Date.now(),
        });
      }
      return;
    }

    const formattedEvents = events.map(e => ({
      userId: this.convexUserId!,
      deviceId: this.deviceId!,
      ...e,
      timestamp: Date.now(),
    }));

    const result = await this.safeMutation('interactions:batchLog', {
      events: formattedEvents,
    });

    if (!result.ok) {
      for (const event of events) {
        queueStorage.addToQueue({
          type: 'interaction',
          data: { ...event },
          timestamp: Date.now(),
        });
      }
    }
  }

  // ── Getters ─────────────────────────────────────────────────────

  getConvexUserId(): string | null {
    return this.convexUserId;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  // ── Flush Queued Events ──────────────────────────────────────

  async flushQueue(): Promise<void> {
    // P0-FIX: Prevent concurrent queue flush operations
    if (this.isFlushingQueue) {
      console.log('[ConvexSync] Queue flush already in progress, skipping');
      return;
    }
    
    // CRITICAL: Only require isAvailable and deviceId initially
    // convexUserId may be established by processing user_sync events
    if (!this.isAvailable || !this.deviceId) {
      console.log('[ConvexSync] Cannot flush: isAvailable=%s, deviceId=%s', this.isAvailable, !!this.deviceId);
      return;
    }

    const queue = await queueStorage.getQueue();
    if (queue.length === 0) return;

    this.isFlushingQueue = true;
    console.log(`[ConvexSync] Flushing ${queue.length} queued events`);
    
    // P3: Notify sync status manager that sync is starting
    try {
      getSyncStatusManager().startSync();
    } catch { /* ignore if manager not initialized */ }

    // Group events by type for batch flush
    const analyticsEvents = queue.filter((e) => e.type === 'analytics');
    const correctionEvents = queue.filter((e) => e.type === 'correction');
    const heartbeatEvents = queue.filter((e) => e.type === 'heartbeat');
    const userSyncEvents = queue.filter((e) => e.type === 'user_sync');
    // v2: Session and interaction events
    const sessionCreateEvents = queue.filter((e) => e.type === 'session_create');
    const sessionUpdateEvents = queue.filter((e) => e.type === 'session_update');
    const sessionEndEvents = queue.filter((e) => e.type === 'session_end');
    const interactionEvents = queue.filter((e) => e.type === 'interaction');

    // FIRST: Replay user_sync events to establish convexUserId
    // This MUST happen before processing other events that require convexUserId
    for (const event of userSyncEvents) {
      const result = await this.safeMutation('users:createOrUpdate', {
        ...event.data,
      });
      if (result.ok) {
        // Success - remove from queue
        if (event.id) await queueStorage.removeFromQueue(event.id);
        if (result.value) {
          this.setConvexUserId(result.value);
          console.log('[ConvexSync] User synced, convexUserId established:', result.value);
        }
      } else {
        // Failure - increment attempts
        if (event.id) await queueStorage.updateAttempts(event.id, (event.attempts ?? 0) + 1);
      }
    }

    // NOW check for convexUserId before processing events that require it
    if (!this.convexUserId) {
      console.warn('[ConvexSync] Cannot flush analytics/corrections: no convexUserId established');
      // Still continue with heartbeats which don't require convexUserId
    }

    // Replay heartbeat events
    for (const event of heartbeatEvents) {
      const result = await this.safeMutation('users:heartbeat', {
        ...event.data,
      });
      if (result.ok) {
        // Success - remove from queue
        if (event.id) await queueStorage.removeFromQueue(event.id);
      } else {
        // Failure - increment attempts
        if (event.id) await queueStorage.updateAttempts(event.id, (event.attempts ?? 0) + 1);
      }
    }

    // Only process events requiring convexUserId if we have one
    if (this.convexUserId) {
      // Batch analytics events
      if (analyticsEvents.length > 0) {
        const result = await this.safeMutation('analytics:batchLogEvents', {
          events: analyticsEvents.map((e) => ({
            ...e.data,
            userId: this.convexUserId,
            deviceId: this.deviceId!,
            timestamp: e.data.timestamp || e.timestamp,
          })),
        });

        if (result.ok) {
          // Success - remove all from queue
          for (const event of analyticsEvents) {
            if (event.id) await queueStorage.removeFromQueue(event.id);
          }
        } else {
          // Failure - increment attempts for all
          for (const event of analyticsEvents) {
            if (event.id) await queueStorage.updateAttempts(event.id, (event.attempts ?? 0) + 1);
          }
        }
      }

      // Replay correction events (individual) with P0-FIX deduplication
      for (const event of correctionEvents) {
        // P0-FIX: Skip if already processed (deduplication)
        if (event.idempotencyKey && this.processedIdempotencyKeys.has(event.idempotencyKey)) {
          console.log('[ConvexSync] Skipping duplicate correction:', event.idempotencyKey);
          if (event.id) await queueStorage.removeFromQueue(event.id);
          continue;
        }
        
        const result = await this.safeMutation('corrections:create', {
          ...event.data,
          userId: this.convexUserId,
          deviceId: this.deviceId!,
          idempotencyKey: event.idempotencyKey, // P0-FIX: Pass to server for server-side dedup
        });

        if (result.ok) {
          // Success - remove from queue and track processed key
          if (event.id) await queueStorage.removeFromQueue(event.id);
          if (event.idempotencyKey) this.processedIdempotencyKeys.add(event.idempotencyKey);
        } else {
          // Failure - increment attempts
          if (event.id) await queueStorage.updateAttempts(event.id, (event.attempts ?? 0) + 1);
        }
      }

      // v2: Replay session create events
      for (const event of sessionCreateEvents) {
        const result = await this.safeMutation('sessions:create', {
          userId: this.convexUserId,
          deviceId: this.deviceId!,
          ...event.data,
        });
        if (result.ok) {
          if (event.id) await queueStorage.removeFromQueue(event.id);
        } else {
          if (event.id) await queueStorage.updateAttempts(event.id, (event.attempts ?? 0) + 1);
        }
      }

      // v2: Replay session update events
      for (const event of sessionUpdateEvents) {
        const result = await this.safeMutation('sessions:updateMetrics', event.data);
        if (result.ok) {
          if (event.id) await queueStorage.removeFromQueue(event.id);
        } else {
          if (event.id) await queueStorage.updateAttempts(event.id, (event.attempts ?? 0) + 1);
        }
      }

      // v2: Replay session end events
      for (const event of sessionEndEvents) {
        const result = await this.safeMutation('sessions:end', event.data);
        if (result.ok) {
          if (event.id) await queueStorage.removeFromQueue(event.id);
        } else {
          if (event.id) await queueStorage.updateAttempts(event.id, (event.attempts ?? 0) + 1);
        }
      }

      // v2: Batch interaction events
      if (interactionEvents.length > 0) {
        const result = await this.safeMutation('interactions:batchLog', {
          events: interactionEvents.map((e) => ({
            userId: this.convexUserId,
            deviceId: this.deviceId!,
            ...e.data,
            timestamp: e.data.timestamp || e.timestamp,
          })),
        });

        if (result.ok) {
          for (const event of interactionEvents) {
            if (event.id) await queueStorage.removeFromQueue(event.id);
          }
        } else {
          for (const event of interactionEvents) {
            if (event.id) await queueStorage.updateAttempts(event.id, (event.attempts ?? 0) + 1);
          }
        }
      }
    }

    const remainingSize = await queueStorage.getQueueSize();
    console.log(`[ConvexSync] Flush complete. ${remainingSize} events remain in queue`);
    
    // P0-FIX: Reset flushing flag
    this.isFlushingQueue = false;
    
    // P3: Notify sync status manager that sync is complete
    try {
      getSyncStatusManager().endSync();
    } catch { /* ignore if manager not initialized */ }
    
    // P0-FIX: Periodically clear processed keys to prevent memory bloat (keep last 1000)
    if (this.processedIdempotencyKeys.size > 1000) {
      const keysArray = Array.from(this.processedIdempotencyKeys);
      this.processedIdempotencyKeys = new Set(keysArray.slice(-500));
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────

  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    // Remove event listeners to prevent leaks
    if (typeof window !== 'undefined') {
      if (this.handleOnline) window.removeEventListener('online', this.handleOnline);
      if (this.handleOffline) window.removeEventListener('offline', this.handleOffline);
    }
    // Flush remaining buffered events to queue
    for (const event of this.eventBuffer) {
      queueStorage.addToQueue({ type: 'analytics', data: { ...event }, timestamp: event.timestamp });
    }
    this.eventBuffer = [];
  }
}

// ── Singleton ────────────────────────────────────────────────────

let syncInstance: ConvexSyncService | null = null;

export function initSyncService(): ConvexSyncService {
  if (syncInstance) {
    syncInstance.destroy();
  }
  syncInstance = new ConvexSyncService();
  return syncInstance;
}

export function getSyncService(): ConvexSyncService | null {
  return syncInstance;
}
