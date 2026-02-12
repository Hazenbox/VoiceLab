/**
 * Maintenance Tasks
 * 
 * Scheduled cleanup operations for data retention policy.
 * - Archives sessions older than 90 days
 * - Deletes interaction events older than 90 days
 * - Times out stale active sessions
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const RETENTION_DAYS = 90;
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

// ── Daily cleanup of old data ──────────────────────────────────────
export const dailyCleanup = internalAction({
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    let archivedSessions = 0;
    let deletedInteractions = 0;
    
    // Archive old sessions (keep aggregates, mark as archived)
    let hasMoreSessions = true;
    while (hasMoreSessions) {
      const oldSessions = await ctx.runQuery(internal.sessions.getOlderThan, {
        timestamp: ninetyDaysAgo,
      });
      
      if (oldSessions.length === 0) {
        hasMoreSessions = false;
        break;
      }
      
      for (const session of oldSessions) {
        await ctx.runMutation(internal.sessions.archive, { id: session._id });
        archivedSessions++;
      }
    }
    
    // Delete old interaction events (granular data, can be removed)
    let hasMoreInteractions = true;
    while (hasMoreInteractions) {
      const oldInteractions = await ctx.runQuery(internal.interactions.getOlderThan, {
        timestamp: ninetyDaysAgo,
      });
      
      if (oldInteractions.length === 0) {
        hasMoreInteractions = false;
        break;
      }
      
      for (const interaction of oldInteractions) {
        await ctx.runMutation(internal.interactions.remove, { id: interaction._id });
        deletedInteractions++;
      }
    }
    
    console.log(`[Maintenance] Daily cleanup complete:
      - Archived sessions: ${archivedSessions}
      - Deleted interactions: ${deletedInteractions}`);
    
    return {
      archivedSessions,
      deletedInteractions,
    };
  },
});

// ── Hourly timeout of stale sessions ───────────────────────────────
export const timeoutStale = internalAction({
  handler: async (ctx): Promise<{ timedOut: number }> => {
    const timedOut = await ctx.runMutation(internal.sessions.timeoutStaleSessions, {
      maxAgeMs: SESSION_TIMEOUT_MS,
    });
    
    if (timedOut > 0) {
      console.log(`[Maintenance] Timed out ${timedOut} stale sessions`);
    }
    
    return { timedOut };
  },
});
