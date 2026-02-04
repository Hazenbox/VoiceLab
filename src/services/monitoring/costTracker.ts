/**
 * Cost & Usage Tracker
 * Monitors token usage and costs across all LLM providers
 */

import type { LLMUsageMetrics } from '../providers/llm/types';

export interface UsageRecord {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  requestId?: string;
  userId?: string;
  tags?: string[];
  success: boolean;
  errorCode?: string;
}

export interface UsageStats {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  byProvider: Record<string, {
    cost: number;
    tokens: number;
    requests: number;
    avgLatency: number;
  }>;
}

export class CostTracker {
  private records: UsageRecord[] = [];
  private readonly STORAGE_KEY = 'voicelab_usage_records';
  private readonly MAX_RECORDS = 1000;

  constructor() {
    this.loadFromStorage();
  }

  track(usage: LLMUsageMetrics, metadata?: {
    requestId?: string;
    userId?: string;
    tags?: string[];
    success?: boolean;
    errorCode?: string;
  }): void {
    const record: UsageRecord = {
      id: this.generateId(),
      timestamp: usage.timestamp,
      provider: usage.provider,
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCost: usage.estimatedCost,
      latencyMs: usage.latencyMs,
      success: metadata?.success ?? true,
      requestId: metadata?.requestId,
      userId: metadata?.userId,
      tags: metadata?.tags,
      errorCode: metadata?.errorCode,
    };

    this.records.push(record);

    // Keep only last N records
    if (this.records.length > this.MAX_RECORDS) {
      this.records = this.records.slice(-this.MAX_RECORDS);
    }

    this.saveToStorage();
  }

  getStats(timeRangeMs?: number): UsageStats {
    const cutoff = timeRangeMs 
      ? Date.now() - timeRangeMs 
      : 0;
    
    const filteredRecords = this.records.filter(
      r => r.timestamp >= cutoff
    );

    if (filteredRecords.length === 0) {
      return {
        totalCost: 0,
        totalTokens: 0,
        totalRequests: 0,
        successRate: 0,
        avgLatency: 0,
        byProvider: {},
      };
    }

    const totalCost = filteredRecords.reduce((sum, r) => sum + r.estimatedCost, 0);
    const totalTokens = filteredRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const successCount = filteredRecords.filter(r => r.success).length;
    const avgLatency = filteredRecords.reduce((sum, r) => sum + r.latencyMs, 0) / filteredRecords.length;

    // Group by provider
    const byProvider: Record<string, {
      cost: number;
      tokens: number;
      requests: number;
      avgLatency: number;
    }> = {};

    filteredRecords.forEach(record => {
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { 
          cost: 0, 
          tokens: 0, 
          requests: 0, 
          avgLatency: 0 
        };
      }
      byProvider[record.provider].cost += record.estimatedCost;
      byProvider[record.provider].tokens += record.totalTokens;
      byProvider[record.provider].requests += 1;
      byProvider[record.provider].avgLatency += record.latencyMs;
    });

    // Calculate average latency per provider
    Object.keys(byProvider).forEach(provider => {
      byProvider[provider].avgLatency /= byProvider[provider].requests;
    });

    return {
      totalCost,
      totalTokens,
      totalRequests: filteredRecords.length,
      successRate: successCount / filteredRecords.length,
      avgLatency,
      byProvider,
    };
  }

  getRecords(filters?: {
    provider?: string;
    timeRangeMs?: number;
    success?: boolean;
    tags?: string[];
  }): UsageRecord[] {
    let filtered = [...this.records];

    if (filters?.provider) {
      filtered = filtered.filter(r => r.provider === filters.provider);
    }

    if (filters?.timeRangeMs) {
      const cutoff = Date.now() - filters.timeRangeMs;
      filtered = filtered.filter(r => r.timestamp >= cutoff);
    }

    if (filters?.success !== undefined) {
      filtered = filtered.filter(r => r.success === filters.success);
    }

    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter(r => 
        r.tags?.some(tag => filters.tags!.includes(tag))
      );
    }

    return filtered;
  }

  exportRecords(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'ID', 'Timestamp', 'Provider', 'Model', 'Prompt Tokens',
        'Completion Tokens', 'Total Tokens', 'Cost', 'Latency (ms)',
        'Success', 'Error Code'
      ].join(',');

      const rows = this.records.map(r => [
        r.id,
        new Date(r.timestamp).toISOString(),
        r.provider,
        r.model,
        r.promptTokens,
        r.completionTokens,
        r.totalTokens,
        r.estimatedCost.toFixed(6),
        r.latencyMs,
        r.success,
        r.errorCode || ''
      ].join(','));

      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(this.records, null, 2);
  }

  clear(): void {
    this.records = [];
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.records = JSON.parse(data);
      }
    } catch (error) {
      console.error('[CostTracker] Failed to load usage records:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records));
    } catch (error) {
      console.error('[CostTracker] Failed to save usage records:', error);
    }
  }

  private generateId(): string {
    return `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
