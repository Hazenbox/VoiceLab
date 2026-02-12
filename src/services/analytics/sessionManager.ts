/**
 * Session Manager
 * 
 * Tracks user sessions for analytics and behavior analysis.
 * 
 * Features:
 * - Session lifecycle management (start, update, end)
 * - Real-time metrics calculation (message counts, response times)
 * - Local state caching with periodic Convex sync
 * - Rate limiting to prevent excessive writes
 * - Offline-first with queue support
 */

import { rateLimiter, RATE_LIMITS } from './rateLimiter';
import { featureFlags } from '../featureFlags';

// ── Types ────────────────────────────────────────────────────────────

export interface SessionState {
  sessionId: string | null; // Convex session ID (null if not yet synced)
  localId: string; // Local ID for tracking before Convex sync
  projectId: string;
  projectName: string;
  userId: string | null; // Convex user ID
  deviceId: string;
  
  // Timing
  startedAt: number;
  lastActivityAt: number;
  
  // Metrics (local tracking)
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  responseTimes: number[]; // Array of response times in ms
  
  // Context
  ecosystem: string;
  channel: string;
  persona: string;
  
  // Interaction counts
  contextSwitches: number;
  regenerationCount: number;
  copyActionCount: number;
  voiceMessageCount: number;
  textMessageCount: number;
  
  // Status
  isActive: boolean;
  lastSyncAt: number;
}

export interface SessionStartParams {
  projectId: string;
  projectName: string;
  deviceId: string;
  userId: string | null;
  ecosystem: string;
  channel: string;
  persona: string;
}

export interface InteractionEvent {
  eventType: 'copy' | 'regenerate' | 'edit' | 'settings_change' | 'feature_access' | 'like' | 'dislike' | 'error';
  target: string; // messageId, feature name, or error source
  metadata?: Record<string, unknown>;
}

// ── Storage Keys ─────────────────────────────────────────────────────

const SESSION_STORAGE_KEY = 'voicelab_active_session';
const SESSION_SYNC_INTERVAL_MS = 30_000; // 30 seconds

// ── Session Manager Class ────────────────────────────────────────────

export class SessionManager {
  private session: SessionState | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingEvents: InteractionEvent[] = [];
  
  // Callback for syncing to Convex (injected from React layer)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private syncCallback: ((action: string, data: Record<string, any>) => Promise<any>) | null = null;

  constructor() {
    // Restore session from localStorage if exists
    this.restoreSession();
  }

  // ── Sync Callback Setup ────────────────────────────────────────────

  /**
   * Set the callback function for syncing to Convex
   * Called from React layer after Convex client is ready
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSyncCallback(callback: (action: string, data: Record<string, any>) => Promise<any>): void {
    this.syncCallback = callback;
    
    // If we have a pending session, try to sync it now
    if (this.session && !this.session.sessionId) {
      this.syncSessionToConvex();
    }
  }

  // ── Session Lifecycle ──────────────────────────────────────────────

  /**
   * Start a new session
   */
  async startSession(params: SessionStartParams): Promise<string> {
    // Check feature flag
    if (!featureFlags.sessionAnalytics) {
      return 'disabled';
    }
    
    // Rate limit session starts
    if (!rateLimiter.canProceed('sessionStarts', RATE_LIMITS.sessionStarts)) {
      console.warn('[SessionManager] Session start rate limited');
      return 'rate_limited';
    }
    
    // End any existing session
    if (this.session?.isActive) {
      await this.endSession('new_session');
    }
    
    const now = Date.now();
    const localId = `local_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.session = {
      sessionId: null,
      localId,
      projectId: params.projectId,
      projectName: params.projectName,
      userId: params.userId,
      deviceId: params.deviceId,
      startedAt: now,
      lastActivityAt: now,
      messageCount: 0,
      userMessageCount: 0,
      assistantMessageCount: 0,
      responseTimes: [],
      ecosystem: params.ecosystem,
      channel: params.channel,
      persona: params.persona,
      contextSwitches: 0,
      regenerationCount: 0,
      copyActionCount: 0,
      voiceMessageCount: 0,
      textMessageCount: 0,
      isActive: true,
      lastSyncAt: 0,
    };
    
    // Save to localStorage
    this.saveSessionLocally();
    
    // Try to sync to Convex immediately
    await this.syncSessionToConvex();
    
    // Start periodic sync timer
    this.startSyncTimer();
    
    console.log(`[SessionManager] Session started: ${localId}`);
    return localId;
  }

  /**
   * End the current session
   */
  async endSession(reason: string = 'user_left'): Promise<void> {
    if (!this.session || !this.session.isActive) {
      return;
    }
    
    this.session.isActive = false;
    this.session.lastActivityAt = Date.now();
    
    // Stop sync timer
    this.stopSyncTimer();
    
    // Flush any pending events
    await this.flushPendingEvents();
    
    // Final sync to Convex
    if (this.session.sessionId && this.syncCallback) {
      try {
        await this.syncCallback('sessions:end', {
          sessionId: this.session.sessionId,
          exitReason: reason,
        });
        console.log(`[SessionManager] Session ended: ${this.session.sessionId}, reason: ${reason}`);
      } catch (error) {
        console.error('[SessionManager] Failed to end session in Convex:', error);
      }
    }
    
    // Clear local storage
    this.clearSessionLocally();
    this.session = null;
  }

  // ── Activity Tracking ──────────────────────────────────────────────

  /**
   * Track a user message
   */
  trackUserMessage(isVoice: boolean = false): void {
    if (!this.session?.isActive) return;
    
    this.session.messageCount++;
    this.session.userMessageCount++;
    this.session.lastActivityAt = Date.now();
    
    if (isVoice) {
      this.session.voiceMessageCount++;
    } else {
      this.session.textMessageCount++;
    }
    
    this.saveSessionLocally();
  }

  /**
   * Track an assistant message with response time
   */
  trackAssistantMessage(responseTimeMs?: number): void {
    if (!this.session?.isActive) return;
    
    this.session.messageCount++;
    this.session.assistantMessageCount++;
    this.session.lastActivityAt = Date.now();
    
    if (responseTimeMs !== undefined && responseTimeMs > 0) {
      this.session.responseTimes.push(responseTimeMs);
    }
    
    this.saveSessionLocally();
  }

  /**
   * Track a context switch (ecosystem, channel, or persona change)
   */
  trackContextSwitch(newEcosystem?: string, newChannel?: string, newPersona?: string): void {
    if (!this.session?.isActive) return;
    
    const hasChange = 
      (newEcosystem && newEcosystem !== this.session.ecosystem) ||
      (newChannel && newChannel !== this.session.channel) ||
      (newPersona && newPersona !== this.session.persona);
    
    if (hasChange) {
      this.session.contextSwitches++;
      if (newEcosystem) this.session.ecosystem = newEcosystem;
      if (newChannel) this.session.channel = newChannel;
      if (newPersona) this.session.persona = newPersona;
      this.session.lastActivityAt = Date.now();
      this.saveSessionLocally();
    }
  }

  /**
   * Track a regeneration request
   */
  trackRegeneration(): void {
    if (!this.session?.isActive) return;
    
    this.session.regenerationCount++;
    this.session.lastActivityAt = Date.now();
    this.saveSessionLocally();
    
    this.logInteraction({ eventType: 'regenerate', target: 'message' });
  }

  /**
   * Track a copy action
   */
  trackCopy(messageId: string): void {
    if (!this.session?.isActive) return;
    
    this.session.copyActionCount++;
    this.session.lastActivityAt = Date.now();
    this.saveSessionLocally();
    
    this.logInteraction({ eventType: 'copy', target: messageId });
  }

  /**
   * Track a like/dislike action
   */
  trackFeedback(messageId: string, isLike: boolean): void {
    if (!this.session?.isActive) return;
    
    this.session.lastActivityAt = Date.now();
    this.saveSessionLocally();
    
    this.logInteraction({ 
      eventType: isLike ? 'like' : 'dislike', 
      target: messageId 
    });
  }

  /**
   * Track a feature access
   */
  trackFeatureAccess(featureName: string): void {
    if (!this.session?.isActive) return;
    
    this.session.lastActivityAt = Date.now();
    this.saveSessionLocally();
    
    this.logInteraction({ eventType: 'feature_access', target: featureName });
  }

  /**
   * Track an error
   */
  trackError(errorSource: string, errorMessage: string): void {
    if (!rateLimiter.canProceed('errorLogs', RATE_LIMITS.errorLogs)) {
      return;
    }
    
    if (this.session?.isActive) {
      this.session.lastActivityAt = Date.now();
      this.saveSessionLocally();
    }
    
    this.logInteraction({ 
      eventType: 'error', 
      target: errorSource,
      metadata: { message: errorMessage }
    });
  }

  // ── Interaction Event Logging ──────────────────────────────────────

  /**
   * Log an interaction event (batched)
   */
  private logInteraction(event: InteractionEvent): void {
    // Check feature flag
    if (!featureFlags.interactionTracking) {
      return;
    }
    
    // Rate limit interaction events
    if (!rateLimiter.canProceed('interactionEvents', RATE_LIMITS.interactionEvents)) {
      console.warn('[SessionManager] Interaction event rate limited');
      return;
    }
    
    this.pendingEvents.push(event);
    
    // Flush if we have enough events (batch size: 10)
    if (this.pendingEvents.length >= 10) {
      this.flushPendingEvents();
    }
  }

  /**
   * Flush pending interaction events to Convex
   */
  private async flushPendingEvents(): Promise<void> {
    if (this.pendingEvents.length === 0 || !this.syncCallback) {
      return;
    }
    
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    
    const now = Date.now();
    const formattedEvents = events.map(e => ({
      userId: this.session?.userId,
      sessionId: this.session?.sessionId,
      deviceId: this.session?.deviceId || 'unknown',
      eventType: e.eventType,
      target: e.target,
      metadata: e.metadata ? JSON.stringify(e.metadata) : undefined,
      timestamp: now,
    }));
    
    try {
      await this.syncCallback('interactions:batchLog', { events: formattedEvents });
    } catch (error) {
      console.error('[SessionManager] Failed to flush interaction events:', error);
      // Re-queue events on failure
      this.pendingEvents.push(...events);
    }
  }

  // ── Convex Sync ────────────────────────────────────────────────────

  /**
   * Sync session to Convex
   */
  private async syncSessionToConvex(): Promise<void> {
    if (!this.session || !this.syncCallback || !this.session.userId) {
      return;
    }
    
    // Rate limit session updates
    if (this.session.sessionId && !rateLimiter.canProceed('sessionUpdates', RATE_LIMITS.sessionUpdates)) {
      console.warn('[SessionManager] Session update rate limited');
      return;
    }
    
    try {
      if (!this.session.sessionId) {
        // Create new session in Convex
        const sessionId = await this.syncCallback('sessions:create', {
          userId: this.session.userId,
          deviceId: this.session.deviceId,
          projectId: this.session.projectId,
          projectName: this.session.projectName,
          ecosystem: this.session.ecosystem,
          channel: this.session.channel,
          persona: this.session.persona,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          screenWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
          screenHeight: typeof window !== 'undefined' ? window.innerHeight : undefined,
        });
        
        this.session.sessionId = sessionId;
        this.session.lastSyncAt = Date.now();
        this.saveSessionLocally();
        
        console.log(`[SessionManager] Session created in Convex: ${sessionId}`);
      } else {
        // Update existing session
        const avgResponseTime = this.session.responseTimes.length > 0
          ? Math.round(this.session.responseTimes.reduce((a, b) => a + b, 0) / this.session.responseTimes.length)
          : undefined;
        
        await this.syncCallback('sessions:updateMetrics', {
          sessionId: this.session.sessionId,
          messageCount: this.session.messageCount,
          userMessageCount: this.session.userMessageCount,
          assistantMessageCount: this.session.assistantMessageCount,
          averageResponseTimeMs: avgResponseTime,
          contextSwitches: this.session.contextSwitches,
          regenerationCount: this.session.regenerationCount,
          copyActionCount: this.session.copyActionCount,
          voiceMessageCount: this.session.voiceMessageCount,
          textMessageCount: this.session.textMessageCount,
          ecosystem: this.session.ecosystem,
          channel: this.session.channel,
          persona: this.session.persona,
        });
        
        this.session.lastSyncAt = Date.now();
        this.saveSessionLocally();
      }
      
      // Also flush pending events
      await this.flushPendingEvents();
    } catch (error) {
      console.error('[SessionManager] Failed to sync session to Convex:', error);
    }
  }

  // ── Local Storage ──────────────────────────────────────────────────

  private saveSessionLocally(): void {
    if (!this.session) return;
    
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
    } catch (error) {
      console.error('[SessionManager] Failed to save session locally:', error);
    }
  }

  private restoreSession(): void {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored) as SessionState;
        
        // Check if session is stale (> 2 hours old)
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        if (session.lastActivityAt < twoHoursAgo) {
          console.log('[SessionManager] Discarding stale session');
          this.clearSessionLocally();
          return;
        }
        
        // Mark as active if it was active
        if (session.isActive) {
          this.session = session;
          this.startSyncTimer();
          console.log(`[SessionManager] Restored session: ${session.localId}`);
        }
      }
    } catch (error) {
      console.error('[SessionManager] Failed to restore session:', error);
    }
  }

  private clearSessionLocally(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('[SessionManager] Failed to clear session locally:', error);
    }
  }

  // ── Sync Timer ─────────────────────────────────────────────────────

  private startSyncTimer(): void {
    this.stopSyncTimer();
    
    this.syncTimer = setInterval(() => {
      if (this.session?.isActive) {
        this.syncSessionToConvex();
      }
    }, SESSION_SYNC_INTERVAL_MS);
  }

  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // ── Getters ────────────────────────────────────────────────────────

  getSession(): SessionState | null {
    return this.session;
  }

  getSessionId(): string | null {
    return this.session?.sessionId || null;
  }

  isSessionActive(): boolean {
    return this.session?.isActive ?? false;
  }

  // ── Cleanup ────────────────────────────────────────────────────────

  destroy(): void {
    this.stopSyncTimer();
    
    // End session if active
    if (this.session?.isActive) {
      this.endSession('browser_closed');
    }
    
    // Flush any remaining events
    this.flushPendingEvents();
  }
}

// ── Singleton ────────────────────────────────────────────────────────

let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

export function resetSessionManager(): void {
  if (sessionManagerInstance) {
    sessionManagerInstance.destroy();
    sessionManagerInstance = null;
  }
}
