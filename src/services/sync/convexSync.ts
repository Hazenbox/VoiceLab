/**
 * Convex Background Sync Service
 * 
 * Non-blocking, fire-and-forget sync of local actions to Convex.
 * If Convex is unreachable, events are queued in localStorage and
 * flushed on next successful connection.
 * 
 * This module has ZERO compile-time dependencies on Convex generated types.
 * All Convex calls go through the injected mutationFn callback.
 */

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
}

export interface CorrectionEvent {
  messageContent: string;
  originalContent: string;
  editedContent?: string;
  feedbackType: string;
  comment?: string;
  ecosystem: string;
  channel: string;
  persona: string;
  trustScore?: number;
  generationContext?: string;
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

const SYNC_QUEUE_KEY = 'voicelab_sync_queue';
const USER_CONVEX_ID_KEY = 'voicelab_convex_user_id';
const MAX_QUEUE_SIZE = 100;

// ── Queue Management ─────────────────────────────────────────────

interface QueuedEvent {
  type: 'analytics' | 'correction' | 'heartbeat' | 'user_sync';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  timestamp: number;
}

function loadQueue(): QueuedEvent[] {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedEvent[]): void {
  try {
    const trimmed = queue.slice(-MAX_QUEUE_SIZE);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[ConvexSync] Failed to save queue (quota?):', e);
  }
}

function addToQueue(event: QueuedEvent): void {
  const queue = loadQueue();
  queue.push(event);
  saveQueue(queue);
}

function clearQueue(): void {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch { /* ignore */ }
}

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

  // ── Safe mutation call ───────────────────────────────────────

  // Returns { ok: true, value } on success, { ok: false } on failure.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async safeMutation(name: string, args: Record<string, any>): Promise<{ ok: true; value: any } | { ok: false }> {
    if (!this.mutationFn) return { ok: false };
    try {
      const result = await this.mutationFn(name, args);
      return { ok: true, value: result };
    } catch (error) {
      console.warn('[ConvexSync] Mutation failed:', error);
      return { ok: false };
    }
  }

  // ── User Profile Sync ────────────────────────────────────────

  async syncUserProfile(profile: UserProfileSync): Promise<string | null> {
    if (!this.isAvailable) {
      addToQueue({
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
      return result.value;
    }
    return null;
  }

  // ── Heartbeat ────────────────────────────────────────────────

  async heartbeat(): Promise<void> {
    if (!this.isAvailable || !this.deviceId) return;

    const result = await this.safeMutation('users:heartbeat', {
      deviceId: this.deviceId,
    });

    if (!result.ok && this.deviceId) {
      addToQueue({
        type: 'heartbeat',
        data: { deviceId: this.deviceId },
        timestamp: Date.now(),
      });
    }
  }

  // ── Log Analytics Event ──────────────────────────────────────

  logAnalyticsEvent(event: AnalyticsEvent): void {
    if (!this.convexUserId || !this.deviceId) {
      addToQueue({
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
    if (this.eventBuffer.length === 0) return;
    if (!this.isAvailable || !this.convexUserId || !this.deviceId) {
      for (const event of this.eventBuffer) {
        addToQueue({ type: 'analytics', data: { ...event }, timestamp: event.timestamp });
      }
      this.eventBuffer = [];
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    const result = await this.safeMutation('analytics:batchLogEvents', {
      events: events.map((e) => ({
        ...e,
        userId: this.convexUserId,
        deviceId: this.deviceId!,
      })),
    });

    if (!result.ok) {
      for (const event of events) {
        addToQueue({ type: 'analytics', data: { ...event }, timestamp: event.timestamp });
      }
    }
  }

  // ── Log Correction/Feedback ──────────────────────────────────

  async logCorrection(correction: CorrectionEvent): Promise<void> {
    if (!this.isAvailable || !this.convexUserId || !this.deviceId) {
      addToQueue({
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
      addToQueue({
        type: 'correction',
        data: { ...correction },
        timestamp: Date.now(),
      });
    }
  }

  // ── Flush Queued Events ──────────────────────────────────────

  async flushQueue(): Promise<void> {
    if (!this.isAvailable || !this.convexUserId || !this.deviceId) return;

    const queue = loadQueue();
    if (queue.length === 0) return;

    console.log(`[ConvexSync] Flushing ${queue.length} queued events`);

    const failed: QueuedEvent[] = [];

    // Group events by type for batch flush
    const analyticsEvents = queue.filter((e) => e.type === 'analytics');
    const correctionEvents = queue.filter((e) => e.type === 'correction');
    const heartbeatEvents = queue.filter((e) => e.type === 'heartbeat');
    const userSyncEvents = queue.filter((e) => e.type === 'user_sync');

    // Replay user_sync events first (needed for convexUserId)
    for (const event of userSyncEvents) {
      const result = await this.safeMutation('users:createOrUpdate', {
        ...event.data,
      });
      if (!result.ok) {
        failed.push(event);
      } else if (result.value) {
        this.setConvexUserId(result.value);
      }
    }

    // Replay heartbeat events
    for (const event of heartbeatEvents) {
      const result = await this.safeMutation('users:heartbeat', {
        ...event.data,
      });
      if (!result.ok) {
        failed.push(event);
      }
    }

    if (analyticsEvents.length > 0) {
      const result = await this.safeMutation('analytics:batchLogEvents', {
        events: analyticsEvents.map((e) => ({
          ...e.data,
          userId: this.convexUserId,
          deviceId: this.deviceId!,
          timestamp: e.data.timestamp || e.timestamp,
        })),
      });

      if (!result.ok) {
        failed.push(...analyticsEvents);
      }
    }

    for (const event of correctionEvents) {
      const result = await this.safeMutation('corrections:create', {
        ...event.data,
        userId: this.convexUserId,
        deviceId: this.deviceId!,
      });

      if (!result.ok) {
        failed.push(event);
      }
    }

    if (failed.length > 0) {
      saveQueue(failed);
    } else {
      clearQueue();
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
      addToQueue({ type: 'analytics', data: { ...event }, timestamp: event.timestamp });
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
