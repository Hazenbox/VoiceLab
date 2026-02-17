/**
 * useProfileSync -- syncs user profile to Convex and wires analytics callbacks
 *
 * Extracted from App.tsx. Handles:
 * - Sync user profile to Convex via sync service
 * - Heartbeat on mount
 * - Log session start event
 * - Wire SessionManager + ErrorLogger sync callbacks (v2 analytics)
 */

import { useEffect } from 'react';
import { getSyncService } from '../services/sync/convexSync';
import { featureFlags } from '../services/featureFlags';
import { getSessionManager, getErrorLogger } from '../services/analytics';
import type { UserProfile } from '../components/OnboardingModal';

export function useProfileSync(userProfile: UserProfile | null) {
  useEffect(() => {
    const syncService = getSyncService();
    if (!syncService) {
      console.warn('[App] Sync service not available');
      return;
    }

    if (userProfile?.deviceId) {
      syncService.setDeviceId(userProfile.deviceId);
      syncService.syncUserProfile({
        deviceId: userProfile.deviceId,
        name: userProfile.name,
        role: userProfile.role,
        product: userProfile.product,
      });
      syncService.heartbeat();

      syncService.logAnalyticsEvent({
        eventType: 'session_start',
        ecosystem: (userProfile.product as string) || 'connectivity',
        channel: 'app_session',
        persona: featureFlags.persona ? userProfile.role : 'unknown',
        timestamp: Date.now(),
      });

      if (featureFlags.sessionAnalytics) {
        const sessionManager = getSessionManager();
        const errorLogger = getErrorLogger();

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

        errorLogger.setSyncCallback(sessionManager.setSyncCallback.bind(sessionManager));
      }
    }
  }, [userProfile?.deviceId, userProfile?.name, userProfile?.role, userProfile?.product]);
}
