/**
 * Response Timer
 * 
 * Measures AI response latency from user message submission
 * to first token / complete response.
 * 
 * Usage:
 * 1. Call startTimer() when user sends a message
 * 2. Call markFirstToken() when streaming starts (optional)
 * 3. Call endTimer() when response is complete
 * 4. Use getLastResponseTime() to get the duration
 */

import { featureFlags } from '../featureFlags';

// ── Types ────────────────────────────────────────────────────────────

export interface ResponseTiming {
  requestId: string;
  startTime: number;
  firstTokenTime?: number;
  endTime?: number;
  timeToFirstToken?: number;  // ms from start to first token
  totalTime?: number;         // ms from start to end
  wasRegeneration: boolean;
  ecosystem: string;
  channel: string;
  persona: string;
}

// ── Response Timer Class ─────────────────────────────────────────────

export class ResponseTimer {
  private currentTiming: ResponseTiming | null = null;
  private lastCompletedTiming: ResponseTiming | null = null;
  private timingHistory: ResponseTiming[] = [];
  private maxHistorySize = 50;

  /**
   * Start timing a new request
   */
  startTimer(params: {
    requestId: string;
    wasRegeneration: boolean;
    ecosystem: string;
    channel: string;
    persona: string;
  }): void {
    if (!featureFlags.responseTimeTracking) {
      return;
    }
    
    this.currentTiming = {
      requestId: params.requestId,
      startTime: performance.now(),
      wasRegeneration: params.wasRegeneration,
      ecosystem: params.ecosystem,
      channel: params.channel,
      persona: params.persona,
    };
  }

  /**
   * Mark when the first token arrives (for streaming responses)
   */
  markFirstToken(): void {
    if (!this.currentTiming) return;
    
    const now = performance.now();
    this.currentTiming.firstTokenTime = now;
    this.currentTiming.timeToFirstToken = Math.round(now - this.currentTiming.startTime);
  }

  /**
   * End timing and calculate total duration
   */
  endTimer(): number | null {
    if (!this.currentTiming) return null;
    
    const now = performance.now();
    this.currentTiming.endTime = now;
    this.currentTiming.totalTime = Math.round(now - this.currentTiming.startTime);
    
    // If no first token was marked, use end time
    if (!this.currentTiming.timeToFirstToken) {
      this.currentTiming.timeToFirstToken = this.currentTiming.totalTime;
    }
    
    // Save to history
    this.lastCompletedTiming = { ...this.currentTiming };
    this.timingHistory.push(this.lastCompletedTiming);
    
    // Trim history if needed
    if (this.timingHistory.length > this.maxHistorySize) {
      this.timingHistory.shift();
    }
    
    const totalTime = this.currentTiming.totalTime;
    this.currentTiming = null;
    
    return totalTime;
  }

  /**
   * Cancel the current timing (e.g., on error or abort)
   */
  cancelTimer(): void {
    this.currentTiming = null;
  }

  /**
   * Get the last completed response time
   */
  getLastResponseTime(): number | null {
    return this.lastCompletedTiming?.totalTime ?? null;
  }

  /**
   * Get the last completed timing details
   */
  getLastTiming(): ResponseTiming | null {
    return this.lastCompletedTiming;
  }

  /**
   * Check if a timer is currently running
   */
  isRunning(): boolean {
    return this.currentTiming !== null;
  }

  /**
   * Get current elapsed time (if timer is running)
   */
  getCurrentElapsed(): number | null {
    if (!this.currentTiming) return null;
    return Math.round(performance.now() - this.currentTiming.startTime);
  }

  /**
   * Get timing history
   */
  getHistory(): ResponseTiming[] {
    return [...this.timingHistory];
  }

  /**
   * Get average response time from history
   */
  getAverageResponseTime(): number | null {
    const completedTimings = this.timingHistory.filter(t => t.totalTime !== undefined);
    if (completedTimings.length === 0) return null;
    
    const sum = completedTimings.reduce((acc, t) => acc + (t.totalTime || 0), 0);
    return Math.round(sum / completedTimings.length);
  }

  /**
   * Get average time to first token from history
   */
  getAverageTimeToFirstToken(): number | null {
    const withFirstToken = this.timingHistory.filter(t => t.timeToFirstToken !== undefined);
    if (withFirstToken.length === 0) return null;
    
    const sum = withFirstToken.reduce((acc, t) => acc + (t.timeToFirstToken || 0), 0);
    return Math.round(sum / withFirstToken.length);
  }

  /**
   * Get statistics for a specific ecosystem/channel combination
   */
  getStatsFor(ecosystem: string, channel: string): {
    count: number;
    avgResponseTime: number | null;
    avgTimeToFirstToken: number | null;
  } {
    const filtered = this.timingHistory.filter(
      t => t.ecosystem === ecosystem && t.channel === channel
    );
    
    if (filtered.length === 0) {
      return { count: 0, avgResponseTime: null, avgTimeToFirstToken: null };
    }
    
    const withTotal = filtered.filter(t => t.totalTime !== undefined);
    const avgResponseTime = withTotal.length > 0
      ? Math.round(withTotal.reduce((acc, t) => acc + (t.totalTime || 0), 0) / withTotal.length)
      : null;
    
    const withFirstToken = filtered.filter(t => t.timeToFirstToken !== undefined);
    const avgTimeToFirstToken = withFirstToken.length > 0
      ? Math.round(withFirstToken.reduce((acc, t) => acc + (t.timeToFirstToken || 0), 0) / withFirstToken.length)
      : null;
    
    return {
      count: filtered.length,
      avgResponseTime,
      avgTimeToFirstToken,
    };
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.timingHistory = [];
    this.lastCompletedTiming = null;
  }

  /**
   * Reset completely
   */
  reset(): void {
    this.currentTiming = null;
    this.lastCompletedTiming = null;
    this.timingHistory = [];
  }
}

// ── Singleton ────────────────────────────────────────────────────────

let responseTimerInstance: ResponseTimer | null = null;

export function getResponseTimer(): ResponseTimer {
  if (!responseTimerInstance) {
    responseTimerInstance = new ResponseTimer();
  }
  return responseTimerInstance;
}

export function resetResponseTimer(): void {
  if (responseTimerInstance) {
    responseTimerInstance.reset();
    responseTimerInstance = null;
  }
}
