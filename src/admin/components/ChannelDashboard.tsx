/**
 * Channel-Specific Weekly Dashboard
 * 
 * Phase 4.4: Shows channel performance metrics, tonality compliance,
 * and content quality trends on a weekly basis.
 * 
 * @module admin/components/ChannelDashboard
 */

import { useMemo } from 'react';
import { Title, Text, Label } from '@marcelinodzn/ds-react';
import { ChartContainer, HorizontalBarChart, VerticalBars } from './AnalyticsCharts';
import { AdminTable, AdminTableRow, AdminTableCell } from './AdminTable';
import { SimpleKPICard } from './KPICard';
import type { ContentChannelType } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChannelMetrics {
  channel: ContentChannelType;
  channelLabel: string;
  /** Total generations in the period */
  totalGenerations: number;
  /** Average trust score (0-100) */
  avgTrustScore: number;
  /** Percentage of content passing validation */
  passRate: number;
  /** Number of regeneration requests */
  regenerations: number;
  /** Average content length */
  avgContentLength: number;
  /** Most common violations */
  topViolations: Array<{ rule: string; count: number }>;
  /** Tonality compliance score (0-100) */
  tonalityScore: number;
  /** Week-over-week change percentage */
  weekOverWeekChange: number;
}

export interface ChannelDashboardProps {
  /** Channel metrics for the selected period */
  metrics: ChannelMetrics[];
  /** Time range label for display */
  timeRangeLabel: string;
  /** Color scheme */
  colors: {
    surface: string;
    surfaceSecondary: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL LABELS
// ═══════════════════════════════════════════════════════════════════════════════

const CHANNEL_LABELS: Record<ContentChannelType, string> = {
  app_chat: 'app chat',
  web_chat: 'web chat',
  whatsapp: 'whatsapp',
  sms: 'sms',
  ivr: 'ivr',
  retail: 'retail',
  push_notification: 'push notification',
  marketing_email: 'marketing email',
  transactional_email: 'transactional email',
  in_app_banner: 'in-app banner',
  help_article: 'help article',
  social_media: 'social media',
  video_script: 'video script',
  print_ad: 'print ad',
  website_copy: 'website copy',
  voice_assistant: 'voice assistant',
  agent_script: 'agent script',
  chatbot_fallback: 'chatbot fallback',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getScoreColor(score: number, colors: ChannelDashboardProps['colors']): string {
  if (score >= 90) return colors.success;
  if (score >= 70) return colors.warning;
  return colors.error;
}

function formatChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Summary KPI cards at the top of the dashboard
 */
function DashboardSummary({
  metrics,
  colors,
}: {
  metrics: ChannelMetrics[];
  colors: ChannelDashboardProps['colors'];
}) {
  const summary = useMemo(() => {
    if (metrics.length === 0) {
      return { total: 0, avgScore: 0, avgPass: 0, avgTonality: 0 };
    }
    
    const total = metrics.reduce((sum, m) => sum + m.totalGenerations, 0);
    const avgScore = metrics.reduce((sum, m) => sum + m.avgTrustScore, 0) / metrics.length;
    const avgPass = metrics.reduce((sum, m) => sum + m.passRate, 0) / metrics.length;
    const avgTonality = metrics.reduce((sum, m) => sum + m.tonalityScore, 0) / metrics.length;
    
    return { total, avgScore, avgPass, avgTonality };
  }, [metrics]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      <SimpleKPICard
        label="total generations"
        value={summary.total.toLocaleString()}
        colors={colors}
      />
      <SimpleKPICard
        label="avg trust score"
        value={`${summary.avgScore.toFixed(1)}%`}
        valueColor={getScoreColor(summary.avgScore, colors)}
        colors={colors}
      />
      <SimpleKPICard
        label="pass rate"
        value={`${summary.avgPass.toFixed(1)}%`}
        valueColor={getScoreColor(summary.avgPass, colors)}
        colors={colors}
      />
      <SimpleKPICard
        label="tonality compliance"
        value={`${summary.avgTonality.toFixed(1)}%`}
        valueColor={getScoreColor(summary.avgTonality, colors)}
        colors={colors}
      />
    </div>
  );
}

/**
 * Channel performance comparison chart
 */
function ChannelComparisonChart({
  metrics,
  colors,
}: {
  metrics: ChannelMetrics[];
  colors: ChannelDashboardProps['colors'];
}) {
  const sortedByScore = useMemo(
    () => [...metrics].sort((a, b) => b.avgTrustScore - a.avgTrustScore).slice(0, 10),
    [metrics]
  );

  if (sortedByScore.length === 0) {
    return (
      <ChartContainer title="channel trust scores" colors={colors}>
        <Text style={{ color: colors.textSecondary }}>no data available</Text>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="channel trust scores (top 10)" colors={colors}>
      <HorizontalBarChart
        data={sortedByScore.map(m => ({
          label: m.channelLabel,
          value: m.avgTrustScore,
          color: getScoreColor(m.avgTrustScore, colors),
        }))}
        maxValue={100}
        height={280}
        colors={colors}
      />
    </ChartContainer>
  );
}

/**
 * Tonality compliance breakdown
 */
function TonalityBreakdownChart({
  metrics,
  colors,
}: {
  metrics: ChannelMetrics[];
  colors: ChannelDashboardProps['colors'];
}) {
  const sortedByTonality = useMemo(
    () => [...metrics].sort((a, b) => b.tonalityScore - a.tonalityScore).slice(0, 10),
    [metrics]
  );

  if (sortedByTonality.length === 0) {
    return (
      <ChartContainer title="tonality compliance by channel" colors={colors}>
        <Text style={{ color: colors.textSecondary }}>no data available</Text>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="tonality compliance by channel (top 10)" colors={colors}>
      <VerticalBars
        data={sortedByTonality.map(m => ({
          label: m.channelLabel,
          value: m.tonalityScore,
          color: getScoreColor(m.tonalityScore, colors),
        }))}
        maxValue={100}
        height={200}
        colors={colors}
      />
    </ChartContainer>
  );
}

/**
 * Detailed channel metrics table
 */
function ChannelMetricsTable({
  metrics,
  colors,
}: {
  metrics: ChannelMetrics[];
  colors: ChannelDashboardProps['colors'];
}) {
  const sortedMetrics = useMemo(
    () => [...metrics].sort((a, b) => b.totalGenerations - a.totalGenerations),
    [metrics]
  );

  return (
    <div style={{ marginTop: '24px' }}>
      <Title level={4} style={{ color: colors.text, marginBottom: '12px' }}>
        channel metrics breakdown
      </Title>
      <AdminTable>
        <thead>
          <tr>
            <th style={{ color: colors.textSecondary, textAlign: 'left', padding: '8px' }}>channel</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>generations</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>trust score</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>pass rate</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>tonality</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>regenerations</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>wow change</th>
          </tr>
        </thead>
        <tbody>
          {sortedMetrics.map((m) => (
            <AdminTableRow key={m.channel}>
              <AdminTableCell>
                <Label style={{ color: colors.text }}>{m.channelLabel}</Label>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.text }}>{m.totalGenerations.toLocaleString()}</Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getScoreColor(m.avgTrustScore, colors) }}>
                  {m.avgTrustScore.toFixed(1)}%
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getScoreColor(m.passRate, colors) }}>
                  {m.passRate.toFixed(1)}%
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getScoreColor(m.tonalityScore, colors) }}>
                  {m.tonalityScore.toFixed(1)}%
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.text }}>{m.regenerations}</Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: m.weekOverWeekChange >= 0 ? colors.success : colors.error }}>
                  {formatChange(m.weekOverWeekChange)}
                </Text>
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
    </div>
  );
}

/**
 * Top violations across channels
 */
function TopViolationsSection({
  metrics,
  colors,
}: {
  metrics: ChannelMetrics[];
  colors: ChannelDashboardProps['colors'];
}) {
  const aggregatedViolations = useMemo(() => {
    const violationCounts: Record<string, number> = {};
    
    for (const m of metrics) {
      for (const v of m.topViolations) {
        violationCounts[v.rule] = (violationCounts[v.rule] || 0) + v.count;
      }
    }
    
    return Object.entries(violationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([rule, count]) => ({ rule, count }));
  }, [metrics]);

  if (aggregatedViolations.length === 0) {
    return null;
  }

  return (
    <ChartContainer title="most common violations" colors={colors} style={{ marginTop: '24px' }}>
      <HorizontalBarChart
        data={aggregatedViolations.map(v => ({
          label: v.rule,
          value: v.count,
          color: colors.warning,
        }))}
        maxValue={Math.max(...aggregatedViolations.map(v => v.count), 1)}
        height={240}
        colors={colors}
      />
    </ChartContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Channel-Specific Weekly Dashboard
 * 
 * Displays channel performance metrics including:
 * - Trust score trends
 * - Pass rates
 * - Tonality compliance
 * - Common violations
 */
export function ChannelDashboard({ metrics, timeRangeLabel, colors }: ChannelDashboardProps) {
  // Enrich metrics with labels
  const enrichedMetrics = useMemo(
    () =>
      metrics.map(m => ({
        ...m,
        channelLabel: CHANNEL_LABELS[m.channel] || m.channel,
      })),
    [metrics]
  );

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: colors.text, marginBottom: '8px' }}>
        channel performance dashboard
      </Title>
      <Text style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        {timeRangeLabel}
      </Text>

      <DashboardSummary metrics={enrichedMetrics} colors={colors} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <ChannelComparisonChart metrics={enrichedMetrics} colors={colors} />
        <TonalityBreakdownChart metrics={enrichedMetrics} colors={colors} />
      </div>

      <ChannelMetricsTable metrics={enrichedMetrics} colors={colors} />

      <TopViolationsSection metrics={enrichedMetrics} colors={colors} />
    </div>
  );
}

export default ChannelDashboard;
