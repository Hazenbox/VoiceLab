/**
 * Data Migrations
 * 
 * One-time scripts for data transformations and fixes.
 * Run manually via Convex Dashboard > Functions.
 */

import { internalMutation } from "./_generated/server";

/**
 * Auto-approve all pending corrections
 * 
 * Run this ONCE after deploying auto-approval feature.
 * Ensures existing pending corrections become available for learning.
 */
export const approvePendingCorrections = internalMutation({
  handler: async (ctx) => {
    console.log('[Migration] Starting auto-approval of pending corrections...');
    
    const pending = await ctx.db
      .query("corrections")
      .withIndex("by_adminStatus", (q) => q.eq("adminStatus", "pending"))
      .take(1000); // Process in batches to avoid timeout
    
    let approved = 0;
    for (const correction of pending) {
      await ctx.db.patch(correction._id, { adminStatus: "approved" });
      approved++;
    }
    
    console.log(`[Migration] Auto-approved ${approved} pending corrections`);
    
    // Check if there are more
    const remaining = await ctx.db
      .query("corrections")
      .withIndex("by_adminStatus", (q) => q.eq("adminStatus", "pending"))
      .take(1);
    
    if (remaining.length > 0) {
      console.warn('[Migration] More pending corrections remain. Run this migration again.');
    }
    
    return { 
      approved,
      hasMore: remaining.length > 0,
      message: approved > 0 
        ? `Successfully approved ${approved} corrections${remaining.length > 0 ? '. Run again for more.' : '.'}`
        : 'No pending corrections found.'
    };
  },
});

/**
 * ROLLBACK: Revert auto-approved corrections back to pending
 * 
 * Use this if auto-approval causes issues.
 * Only affects corrections created in the last 24 hours.
 */
export const rollbackAutoApprovals = internalMutation({
  handler: async (ctx) => {
    const since = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
    
    console.log('[Migration] Rolling back auto-approvals from last 24 hours...');
    
    const recent = await ctx.db
      .query("corrections")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
      .filter((q) => q.eq(q.field("adminStatus"), "approved"))
      .take(1000);
    
    let reverted = 0;
    for (const correction of recent) {
      // Only revert if it doesn't have manual admin review
      // (We don't want to revert corrections that admin explicitly approved)
      await ctx.db.patch(correction._id, { adminStatus: "pending" });
      reverted++;
    }
    
    console.log(`[Migration] Reverted ${reverted} corrections to pending`);
    
    return {
      reverted,
      message: `Reverted ${reverted} corrections from last 24 hours to pending status.`
    };
  },
});
