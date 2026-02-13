/**
 * useSessionAnalytics Hook
 * 
 * Extracts session analytics tracking logic from App.tsx for better separation of concerns.
 * Handles:
 * - Session lifecycle (start/end on project change)
 * - Context switches (ecosystem, channel, persona)
 * - Page unload session termination
 * 
 * Performance: Consolidates multiple useEffects into a single hook with proper cleanup.
 */

import { useEffect, useRef, useCallback } from 'react';
import { featureFlags } from '../services/featureFlags';
import { 
  getSessionManager, 
  getErrorLogger,
} from '../services/analytics';
import { getSyncService } from '../services/sync/convexSync';
import type { EcosystemType, ContentChannelType } from '../types';

// =============================================================================
// Types
// =============================================================================

interface SessionAnalyticsConfig {
  /** Device ID of the current user */
  deviceId: string | null;
  /** User's role (persona) */
  userRole: string | undefined;
  /** User's product */
  userProduct: string | undefined;
  /** Active project ID */
  projectId: string | null;
  /** Active project name */
  projectName: string | undefined;
  /** Current ecosystem */
  ecosystem: EcosystemType;
  /** Current content channel */
  channel: ContentChannelType;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages session analytics tracking.
 * Automatically starts/ends sessions, tracks context switches, and handles cleanup.
 */
export function useSessionAnalytics(config: SessionAnalyticsConfig): void {
  const { 
    deviceId, 
    userRole, 
    userProduct,
    projectId, 
    projectName, 
    ecosystem, 
    channel 
  } = config;
  
  // Track previous context to detect actual changes (not initial mount)
  const prevContextRef = useRef<{ ecosystem?: EcosystemType; channel?: ContentChannelType; role?: string }>({});
  
  // ==========================================================================
  // Sync Service & Session Manager Initialization
  // ==========================================================================
  
  useEffect(() => {
    if (!deviceId) return;
    
    const syncService = getSyncService();
    if (!syncService) {
      console.warn('[useSessionAnalytics] Sync service not available');
      return;
    }
    
    // Set device ID on sync service
    syncService.setDeviceId(deviceId);
    
    // Sync user profile to Convex (non-blocking)
    syncService.syncUserProfile({
      deviceId,
      name: '', // Name handled separately
      role: userRole,
      product: userProduct,
    });
    
    // Heartbeat on mount
    syncService.heartbeat();
    
    // Log session start event
    syncService.logAnalyticsEvent({
      eventType: 'session_start',
      ecosystem: userProduct as string || 'connectivity',
      channel: 'app_session',
      persona: featureFlags.persona ? userRole : 'unknown',
      timestamp: Date.now(),
    });

    // Initialize SessionManager for detailed session tracking
    if (featureFlags.sessionAnalytics) {
      const sessionManager = getSessionManager();
      const errorLogger = getErrorLogger();
      
      // Wire up the sync callback for Convex operations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionManager.setSyncCallback(async (action: string, data: Record<string, any>) => {
        const [module, method] = action.split(':');
        if (module === 'sessions') {
          if (method === 'create') return syncService.createSession(data as Parameters<typeof syncService.createSession>[0]);
          if (method === 'updateMetrics') return syncService.updateSession(data as Parameters<typeof syncService.updateSession>[0]);
          if (method === 'end') return syncService.endSession(data.sessionId, data.exitReason);
        } else if (module === 'interactions') {
          if (method === 'log') return syncService.logInteraction(data as Parameters<typeof syncService.logInteraction>[0]);
          if (method === 'batchLog') return syncService.batchLogInteractions(data.events);
        }
      });
      
      // Wire up error logger
      errorLogger.setSyncCallback(sessionManager.setSyncCallback.bind(sessionManager));
    }
  }, [deviceId, userRole, userProduct]);

  // ==========================================================================
  // Session Lifecycle (Project Change)
  // ==========================================================================
  
  useEffect(() => {
    if (!featureFlags.sessionAnalytics || !deviceId || !projectId) {
      return;
    }
    
    const syncService = getSyncService();
    const sessionManager = getSessionManager();
    
    // Start a new session for this project
    sessionManager.startSession({
      projectId,
      projectName: projectName || 'Untitled Project',
      deviceId,
      userId: syncService?.getConvexUserId() || null,
      ecosystem,
      channel,
      persona: featureFlags.persona ? userRole : 'unknown',
    });
    
    // Cleanup: end session when project changes or component unmounts
    return () => {
      sessionManager.endSession('project_changed');
    };
  }, [projectId, projectName, deviceId, ecosystem, channel, userRole]);

  // ==========================================================================
  // Context Switches (Ecosystem, Channel, Persona)
  // ==========================================================================
  
  useEffect(() => {
    if (!featureFlags.sessionAnalytics) return;
    
    const prev = prevContextRef.current;
    const hasChanged = prev.ecosystem !== undefined && (
      prev.ecosystem !== ecosystem || 
      prev.channel !== channel || 
      prev.role !== userRole
    );
    
    // Only track if this is an actual change, not initial mount
    if (hasChanged) {
      const sessionManager = getSessionManager();
      sessionManager.trackContextSwitch(ecosystem, channel, featureFlags.persona ? userRole : undefined);
    }
    
    // Update previous context
    prevContextRef.current = { ecosystem, channel, role: userRole };
  }, [ecosystem, channel, userRole]);

  // ==========================================================================
  // Page Unload Handler
  // Supports both beforeunload (desktop) and pagehide (mobile)
  // pagehide is more reliable on mobile browsers (iOS Safari, Android Chrome)
  // ==========================================================================
  
  useEffect(() => {
    if (!featureFlags.sessionAnalytics) return;
    
    // Track if we've already ended the session to prevent double-ending
    let sessionEnded = false;
    
    const endSessionOnce = (reason: string) => {
      if (sessionEnded) return;
      sessionEnded = true;
      
      const sessionManager = getSessionManager();
      sessionManager.endSession(reason);
    };
    
    // beforeunload: Works on desktop browsers
    const handleBeforeUnload = () => {
      endSessionOnce('browser_closed');
    };
    
    // pagehide: Works on mobile browsers (wiring for mobile support)
    // This is the modern replacement for beforeunload on mobile
    // The 'persisted' property indicates if the page might be restored from bfcache
    const handlePageHide = (event: PageTransitionEvent) => {
      // If persisted is true, the page might be restored (bfcache)
      // We still end the session but with a different reason
      const reason = event.persisted ? 'page_hidden_bfcache' : 'page_hidden';
      endSessionOnce(reason);
    };
    
    // visibilitychange: Additional safety net for tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Don't end session immediately on visibility change
        // Just log for debugging - the pagehide/beforeunload will handle actual end
        console.log('[SessionAnalytics] Tab became hidden');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

/**
 * Simple hook to track a response time for analytics.
 * Returns a function to call when response starts and ends.
 */
export function useResponseTimer() {
  const startTimeRef = useRef<number | null>(null);
  
  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);
  
  const end = useCallback((success: boolean = true) => {
    if (startTimeRef.current === null) return 0;
    
    const duration = performance.now() - startTimeRef.current;
    startTimeRef.current = null;
    
    // Track in session manager if available
    if (featureFlags.sessionAnalytics) {
      const sessionManager = getSessionManager();
      sessionManager.trackResponse(duration, success);
    }
    
    return duration;
  }, []);
  
  return { start, end };
}

export default useSessionAnalytics;
