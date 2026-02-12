/**
 * Convex Cron Jobs
 * 
 * Scheduled tasks for maintenance and cleanup.
 */

import { cronJobs } from "convex/server";
import { internal, api } from "./_generated/api";

const crons = cronJobs();

// Daily cleanup at 3 AM UTC - archives old sessions, deletes old interactions
crons.daily(
  "daily-cleanup",
  { hourUTC: 3, minuteUTC: 0 },
  internal.maintenance.dailyCleanup
);

// Hourly timeout of stale active sessions (> 2 hours inactive)
crons.hourly(
  "timeout-stale-sessions",
  { minuteUTC: 30 },
  internal.maintenance.timeoutStale
);

// Daily cleanup of expired admin sessions
crons.daily(
  "cleanup-admin-sessions",
  { hourUTC: 4, minuteUTC: 0 },
  api.adminSessions.cleanupExpired
);

export default crons;
