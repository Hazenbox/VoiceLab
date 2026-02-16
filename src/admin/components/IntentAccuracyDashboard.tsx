/**
 * Intent Accuracy Dashboard
 * 
 * Phase 4.4: Displays intent detection accuracy metrics,
 * misclassification analysis, and improvement trends.
 * 
 * @module admin/components/IntentAccuracyDashboard
 */

import { useMemo } from 'react';
import { Title, Text, Label } from '@marcelinodzn/ds-react';
import { ChartContainer, HorizontalBarChart, VerticalBars, StatBreakdown } from './AnalyticsCharts';
import { AdminTable, AdminTableRow, AdminTableCell } from './AdminTable';
import { SimpleKPICard } from './KPICard';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntentMetrics {
  /** Intent identifier */
  intent: string;
  /** Human-readable label */
  intentLabel: string;
  /** Total detections */
  totalDetections: number;
  /** Correct detections */
  correctDetections: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Average confidence score (0-1) */
  avgConfidence: number;
  /** Most common misclassifications */
  misclassifiedAs: Array<{
    intent: string;
    count: number;
    percentage: number;
  }>;
  /** Confidence distribution */
  confidenceDistribution: {
    high: number;    // >= 0.8
    medium: number;  // >= 0.5, < 0.8
    low: number;     // < 0.5
  };
}

export interface IntentAccuracyMetrics {
  /** Overall accuracy */
  overallAccuracy: number;
  /** Total intent detections */
  totalDetections: number;
  /** Total corrections received */
  totalCorrections: number;
  /** Per-intent breakdown */
  intentMetrics: IntentMetrics[];
  /** Time period label */
  period: string;
  /** Trend compared to previous period */
  accuracyTrend: number;
}

export interface IntentAccuracyDashboardProps {
  /** Intent accuracy metrics */
  metrics: IntentAccuracyMetrics;
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
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getAccuracyColor(accuracy: number, colors: IntentAccuracyDashboardProps['colors']): string {
  if (accuracy >= 90) return colors.success;
  if (accuracy >= 75) return colors.warning;
  return colors.error;
}

function formatTrend(trend: number): { text: string; color: string; colors: IntentAccuracyDashboardProps['colors'] } {
  const sign = trend > 0 ? '+' : '';
  return {
    text: `${sign}${trend.toFixed(1)}% vs prev period`,
    color: trend >= 0 ? '#22c55e' : '#ef4444',
    colors: {} as IntentAccuracyDashboardProps['colors'], // Placeholder
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Summary KPI cards
 */
function AccuracySummary({
  metrics,
  colors,
}: {
  metrics: IntentAccuracyMetrics;
  colors: IntentAccuracyDashboardProps['colors'];
}) {
  const trend = formatTrend(metrics.accuracyTrend);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      <SimpleKPICard
        label="overall accuracy"
        value={`${metrics.overallAccuracy.toFixed(1)}%`}
        valueColor={getAccuracyColor(metrics.overallAccuracy, colors)}
        subtext={trend.text}
        subtextColor={metrics.accuracyTrend >= 0 ? colors.success : colors.error}
        colors={colors}
      />
      <SimpleKPICard
        label="total detections"
        value={metrics.totalDetections.toLocaleString()}
        colors={colors}
      />
      <SimpleKPICard
        label="corrections received"
        value={metrics.totalCorrections.toLocaleString()}
        subtext={`${((metrics.totalCorrections / metrics.totalDetections) * 100).toFixed(1)}% correction rate`}
        colors={colors}
      />
      <SimpleKPICard
        label="intents tracked"
        value={String(metrics.intentMetrics.length)}
        colors={colors}
      />
    </div>
  );
}

/**
 * Intent accuracy ranking chart
 */
function IntentAccuracyChart({
  intentMetrics,
  colors,
}: {
  intentMetrics: IntentMetrics[];
  colors: IntentAccuracyDashboardProps['colors'];
}) {
  const sortedByAccuracy = useMemo(
    () => [...intentMetrics].sort((a, b) => b.accuracy - a.accuracy).slice(0, 12),
    [intentMetrics]
  );

  if (sortedByAccuracy.length === 0) {
    return (
      <ChartContainer title="intent accuracy ranking" colors={colors}>
        <Text style={{ color: colors.textSecondary }}>no data available</Text>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="intent accuracy ranking" colors={colors}>
      <HorizontalBarChart
        data={sortedByAccuracy.map(m => ({
          label: m.intentLabel,
          value: m.accuracy,
          color: getAccuracyColor(m.accuracy, colors),
        }))}
        maxValue={100}
        height={320}
        colors={colors}
      />
    </ChartContainer>
  );
}

/**
 * Detection volume by intent
 */
function DetectionVolumeChart({
  intentMetrics,
  colors,
}: {
  intentMetrics: IntentMetrics[];
  colors: IntentAccuracyDashboardProps['colors'];
}) {
  const sortedByVolume = useMemo(
    () => [...intentMetrics].sort((a, b) => b.totalDetections - a.totalDetections).slice(0, 10),
    [intentMetrics]
  );

  if (sortedByVolume.length === 0) {
    return (
      <ChartContainer title="detection volume by intent" colors={colors}>
        <Text style={{ color: colors.textSecondary }}>no data available</Text>
      </ChartContainer>
    );
  }

  const maxVolume = Math.max(...sortedByVolume.map(m => m.totalDetections), 1);

  return (
    <ChartContainer title="detection volume by intent (top 10)" colors={colors}>
      <VerticalBars
        data={sortedByVolume.map(m => ({
          label: m.intentLabel,
          value: m.totalDetections,
          color: colors.accent,
        }))}
        maxValue={maxVolume}
        height={200}
        colors={colors}
      />
    </ChartContainer>
  );
}

/**
 * Confidence distribution breakdown
 */
function ConfidenceDistributionChart({
  intentMetrics,
  colors,
}: {
  intentMetrics: IntentMetrics[];
  colors: IntentAccuracyDashboardProps['colors'];
}) {
  const aggregated = useMemo(() => {
    const totals = { high: 0, medium: 0, low: 0 };
    
    for (const m of intentMetrics) {
      totals.high += m.confidenceDistribution.high;
      totals.medium += m.confidenceDistribution.medium;
      totals.low += m.confidenceDistribution.low;
    }
    
    const total = totals.high + totals.medium + totals.low;
    if (total === 0) return null;
    
    return {
      high: { value: totals.high, percentage: (totals.high / total) * 100 },
      medium: { value: totals.medium, percentage: (totals.medium / total) * 100 },
      low: { value: totals.low, percentage: (totals.low / total) * 100 },
    };
  }, [intentMetrics]);

  if (!aggregated) {
    return null;
  }

  return (
    <ChartContainer title="confidence distribution" colors={colors}>
      <StatBreakdown
        items={[
          {
            label: 'high confidence (≥80%)',
            value: aggregated.high.value,
            percentage: aggregated.high.percentage,
            color: colors.success,
          },
          {
            label: 'medium confidence (50-80%)',
            value: aggregated.medium.value,
            percentage: aggregated.medium.percentage,
            color: colors.warning,
          },
          {
            label: 'low confidence (<50%)',
            value: aggregated.low.value,
            percentage: aggregated.low.percentage,
            color: colors.error,
          },
        ]}
        colors={colors}
      />
    </ChartContainer>
  );
}

/**
 * Misclassification analysis table
 */
function MisclassificationTable({
  intentMetrics,
  colors,
}: {
  intentMetrics: IntentMetrics[];
  colors: IntentAccuracyDashboardProps['colors'];
}) {
  // Find intents with significant misclassifications
  const intentsWithMisclass = useMemo(
    () =>
      intentMetrics
        .filter(m => m.misclassifiedAs.length > 0 && m.accuracy < 95)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 10),
    [intentMetrics]
  );

  if (intentsWithMisclass.length === 0) {
    return (
      <div style={{ marginTop: '24px' }}>
        <Title level={4} style={{ color: colors.text, marginBottom: '12px' }}>
          misclassification analysis
        </Title>
        <Text style={{ color: colors.success }}>
          all intents performing well with no significant misclassifications
        </Text>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <Title level={4} style={{ color: colors.text, marginBottom: '12px' }}>
        misclassification analysis (intents needing attention)
      </Title>
      <AdminTable>
        <thead>
          <tr>
            <th style={{ color: colors.textSecondary, textAlign: 'left', padding: '8px' }}>intent</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>accuracy</th>
            <th style={{ color: colors.textSecondary, textAlign: 'left', padding: '8px' }}>commonly confused with</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>confusion rate</th>
          </tr>
        </thead>
        <tbody>
          {intentsWithMisclass.map((m) => (
            <AdminTableRow key={m.intent}>
              <AdminTableCell>
                <Label style={{ color: colors.text }}>{m.intentLabel}</Label>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getAccuracyColor(m.accuracy, colors) }}>
                  {m.accuracy.toFixed(1)}%
                </Text>
              </AdminTableCell>
              <AdminTableCell>
                <Text style={{ color: colors.textSecondary }}>
                  {m.misclassifiedAs.slice(0, 2).map(mc => mc.intent).join(', ')}
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.warning }}>
                  {m.misclassifiedAs[0]?.percentage.toFixed(1)}%
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
 * Full intent breakdown table
 */
function IntentBreakdownTable({
  intentMetrics,
  colors,
}: {
  intentMetrics: IntentMetrics[];
  colors: IntentAccuracyDashboardProps['colors'];
}) {
  const sortedMetrics = useMemo(
    () => [...intentMetrics].sort((a, b) => b.totalDetections - a.totalDetections),
    [intentMetrics]
  );

  return (
    <div style={{ marginTop: '24px' }}>
      <Title level={4} style={{ color: colors.text, marginBottom: '12px' }}>
        full intent breakdown
      </Title>
      <AdminTable>
        <thead>
          <tr>
            <th style={{ color: colors.textSecondary, textAlign: 'left', padding: '8px' }}>intent</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>detections</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>correct</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>accuracy</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>avg confidence</th>
          </tr>
        </thead>
        <tbody>
          {sortedMetrics.map((m) => (
            <AdminTableRow key={m.intent}>
              <AdminTableCell>
                <Label style={{ color: colors.text }}>{m.intentLabel}</Label>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.text }}>{m.totalDetections.toLocaleString()}</Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.text }}>{m.correctDetections.toLocaleString()}</Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getAccuracyColor(m.accuracy, colors) }}>
                  {m.accuracy.toFixed(1)}%
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.textSecondary }}>
                  {(m.avgConfidence * 100).toFixed(0)}%
                </Text>
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Intent Accuracy Dashboard
 * 
 * Displays comprehensive intent detection accuracy metrics including:
 * - Overall accuracy and trends
 * - Per-intent accuracy ranking
 * - Confidence distribution
 * - Misclassification analysis
 */
export function IntentAccuracyDashboard({ metrics, colors }: IntentAccuracyDashboardProps) {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: colors.text, marginBottom: '8px' }}>
        intent detection accuracy
      </Title>
      <Text style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        {metrics.period}
      </Text>

      <AccuracySummary metrics={metrics} colors={colors} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <IntentAccuracyChart intentMetrics={metrics.intentMetrics} colors={colors} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <DetectionVolumeChart intentMetrics={metrics.intentMetrics} colors={colors} />
          <ConfidenceDistributionChart intentMetrics={metrics.intentMetrics} colors={colors} />
        </div>
      </div>

      <MisclassificationTable intentMetrics={metrics.intentMetrics} colors={colors} />

      <IntentBreakdownTable intentMetrics={metrics.intentMetrics} colors={colors} />
    </div>
  );
}

export default IntentAccuracyDashboard;
