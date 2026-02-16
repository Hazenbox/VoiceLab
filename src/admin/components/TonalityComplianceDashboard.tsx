/**
 * Tonality Compliance Dashboard
 * 
 * Phase 4.4: Displays tonality and brand voice compliance metrics
 * across ecosystems, channels, and time periods.
 * 
 * @module admin/components/TonalityComplianceDashboard
 */

import { useMemo } from 'react';
import { Title, Text, Label } from '@marcelinodzn/ds-react';
import { Badge } from '../../components/ui/Badge';
import { ChartContainer, HorizontalBarChart, VerticalBars, SentimentBar } from './AnalyticsCharts';
import { AdminTable, AdminTableRow, AdminTableCell } from './AdminTable';
import { SimpleKPICard } from './KPICard';
import type { EcosystemType } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TonalityViolation {
  /** Rule that was violated */
  rule: string;
  /** Category of violation */
  category: 'formality' | 'warmth' | 'brand_voice' | 'directness' | 'empathy' | 'professionalism';
  /** Number of occurrences */
  count: number;
  /** Percentage of total content affected */
  percentage: number;
  /** Example violation text */
  example?: string;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

export interface EcosystemTonality {
  ecosystem: EcosystemType;
  ecosystemLabel: string;
  /** Overall tonality compliance score (0-100) */
  complianceScore: number;
  /** Breakdown by dimension */
  dimensions: {
    formality: number;
    warmth: number;
    directness: number;
    empathy: number;
    professionalism: number;
  };
  /** Total content evaluated */
  contentEvaluated: number;
  /** Violations found */
  violations: TonalityViolation[];
  /** Week-over-week change */
  trend: number;
}

export interface TonalityMetrics {
  /** Overall compliance score */
  overallScore: number;
  /** Total content pieces evaluated */
  totalEvaluated: number;
  /** Per-ecosystem breakdown */
  ecosystemMetrics: EcosystemTonality[];
  /** Top violations across all ecosystems */
  topViolations: TonalityViolation[];
  /** Trend compared to previous period */
  overallTrend: number;
  /** Time period label */
  period: string;
}

export interface TonalityComplianceDashboardProps {
  /** Tonality metrics */
  metrics: TonalityMetrics;
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
// ECOSYSTEM LABELS
// ═══════════════════════════════════════════════════════════════════════════════

const ECOSYSTEM_LABELS: Record<EcosystemType, string> = {
  connectivity: 'connectivity',
  finance: 'finance',
  entertainment: 'entertainment',
  devices: 'devices',
  enterprise: 'enterprise',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getScoreColor(score: number, colors: TonalityComplianceDashboardProps['colors']): string {
  if (score >= 90) return colors.success;
  if (score >= 75) return colors.warning;
  return colors.error;
}

function formatTrend(trend: number): string {
  const sign = trend > 0 ? '+' : '';
  return `${sign}${trend.toFixed(1)}%`;
}

function getSeverityColor(severity: TonalityViolation['severity'], colors: TonalityComplianceDashboardProps['colors']): string {
  switch (severity) {
    case 'error': return colors.error;
    case 'warning': return colors.warning;
    case 'info': return colors.textSecondary;
    default: return colors.textSecondary;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Summary KPI cards
 */
function TonalitySummary({
  metrics,
  colors,
}: {
  metrics: TonalityMetrics;
  colors: TonalityComplianceDashboardProps['colors'];
}) {
  const avgDimensions = useMemo(() => {
    if (metrics.ecosystemMetrics.length === 0) {
      return { formality: 0, warmth: 0, directness: 0, empathy: 0, professionalism: 0 };
    }
    
    const totals = { formality: 0, warmth: 0, directness: 0, empathy: 0, professionalism: 0 };
    
    for (const m of metrics.ecosystemMetrics) {
      totals.formality += m.dimensions.formality;
      totals.warmth += m.dimensions.warmth;
      totals.directness += m.dimensions.directness;
      totals.empathy += m.dimensions.empathy;
      totals.professionalism += m.dimensions.professionalism;
    }
    
    const count = metrics.ecosystemMetrics.length;
    return {
      formality: totals.formality / count,
      warmth: totals.warmth / count,
      directness: totals.directness / count,
      empathy: totals.empathy / count,
      professionalism: totals.professionalism / count,
    };
  }, [metrics.ecosystemMetrics]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
      <SimpleKPICard
        label="overall compliance"
        value={`${metrics.overallScore.toFixed(1)}%`}
        valueColor={getScoreColor(metrics.overallScore, colors)}
        subtext={`${formatTrend(metrics.overallTrend)} vs prev`}
        subtextColor={metrics.overallTrend >= 0 ? colors.success : colors.error}
        colors={colors}
      />
      <SimpleKPICard
        label="content evaluated"
        value={metrics.totalEvaluated.toLocaleString()}
        colors={colors}
      />
      <SimpleKPICard
        label="ecosystems tracked"
        value={String(metrics.ecosystemMetrics.length)}
        colors={colors}
      />
      <SimpleKPICard
        label="total violations"
        value={metrics.topViolations.reduce((sum, v) => sum + v.count, 0).toLocaleString()}
        colors={colors}
      />
    </div>
  );
}

/**
 * Dimension scores radar-style display (simplified as bars)
 */
function DimensionScoresChart({
  metrics,
  colors,
}: {
  metrics: TonalityMetrics;
  colors: TonalityComplianceDashboardProps['colors'];
}) {
  const avgDimensions = useMemo(() => {
    if (metrics.ecosystemMetrics.length === 0) return [];
    
    const totals = { formality: 0, warmth: 0, directness: 0, empathy: 0, professionalism: 0 };
    
    for (const m of metrics.ecosystemMetrics) {
      totals.formality += m.dimensions.formality;
      totals.warmth += m.dimensions.warmth;
      totals.directness += m.dimensions.directness;
      totals.empathy += m.dimensions.empathy;
      totals.professionalism += m.dimensions.professionalism;
    }
    
    const count = metrics.ecosystemMetrics.length;
    
    return [
      { label: 'formality', value: totals.formality / count },
      { label: 'warmth', value: totals.warmth / count },
      { label: 'directness', value: totals.directness / count },
      { label: 'empathy', value: totals.empathy / count },
      { label: 'professionalism', value: totals.professionalism / count },
    ];
  }, [metrics.ecosystemMetrics]);

  if (avgDimensions.length === 0) {
    return (
      <ChartContainer title="tonality dimensions (avg)" colors={colors}>
        <Text style={{ color: colors.textSecondary }}>no data available</Text>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="tonality dimensions (avg across ecosystems)" colors={colors}>
      <HorizontalBarChart
        data={avgDimensions.map(d => ({
          label: d.label,
          value: d.value,
          color: getScoreColor(d.value, colors),
        }))}
        maxValue={100}
        height={180}
        colors={colors}
      />
    </ChartContainer>
  );
}

/**
 * Ecosystem compliance comparison
 */
function EcosystemComplianceChart({
  ecosystemMetrics,
  colors,
}: {
  ecosystemMetrics: EcosystemTonality[];
  colors: TonalityComplianceDashboardProps['colors'];
}) {
  const sortedByScore = useMemo(
    () => [...ecosystemMetrics].sort((a, b) => b.complianceScore - a.complianceScore),
    [ecosystemMetrics]
  );

  if (sortedByScore.length === 0) {
    return (
      <ChartContainer title="compliance by ecosystem" colors={colors}>
        <Text style={{ color: colors.textSecondary }}>no data available</Text>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer title="compliance by ecosystem" colors={colors}>
      <HorizontalBarChart
        data={sortedByScore.map(m => ({
          label: m.ecosystemLabel,
          value: m.complianceScore,
          color: getScoreColor(m.complianceScore, colors),
        }))}
        maxValue={100}
        height={180}
        colors={colors}
      />
    </ChartContainer>
  );
}

/**
 * Top violations breakdown
 */
function TopViolationsSection({
  violations,
  colors,
}: {
  violations: TonalityViolation[];
  colors: TonalityComplianceDashboardProps['colors'];
}) {
  const sortedViolations = useMemo(
    () => [...violations].sort((a, b) => b.count - a.count).slice(0, 10),
    [violations]
  );

  if (sortedViolations.length === 0) {
    return (
      <ChartContainer title="top tonality violations" colors={colors} style={{ marginTop: '24px' }}>
        <Text style={{ color: colors.success }}>no violations detected - excellent brand voice compliance</Text>
      </ChartContainer>
    );
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <Title level={4} style={{ color: colors.text, marginBottom: '12px' }}>
        top tonality violations
      </Title>
      <AdminTable>
        <thead>
          <tr>
            <th style={{ color: colors.textSecondary, textAlign: 'left', padding: '8px' }}>rule</th>
            <th style={{ color: colors.textSecondary, textAlign: 'left', padding: '8px' }}>category</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>count</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>% affected</th>
            <th style={{ color: colors.textSecondary, textAlign: 'left', padding: '8px' }}>severity</th>
          </tr>
        </thead>
        <tbody>
          {sortedViolations.map((v, idx) => (
            <AdminTableRow key={`${v.rule}-${idx}`}>
              <AdminTableCell>
                <Label style={{ color: colors.text }}>{v.rule}</Label>
              </AdminTableCell>
              <AdminTableCell>
                <Badge variant="outline">{v.category}</Badge>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.text }}>{v.count.toLocaleString()}</Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.textSecondary }}>{v.percentage.toFixed(1)}%</Text>
              </AdminTableCell>
              <AdminTableCell>
                <Text style={{ color: getSeverityColor(v.severity, colors) }}>{v.severity}</Text>
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </tbody>
      </AdminTable>
    </div>
  );
}

/**
 * Detailed ecosystem breakdown table
 */
function EcosystemBreakdownTable({
  ecosystemMetrics,
  colors,
}: {
  ecosystemMetrics: EcosystemTonality[];
  colors: TonalityComplianceDashboardProps['colors'];
}) {
  const sortedMetrics = useMemo(
    () => [...ecosystemMetrics].sort((a, b) => b.contentEvaluated - a.contentEvaluated),
    [ecosystemMetrics]
  );

  return (
    <div style={{ marginTop: '24px' }}>
      <Title level={4} style={{ color: colors.text, marginBottom: '12px' }}>
        ecosystem tonality breakdown
      </Title>
      <AdminTable>
        <thead>
          <tr>
            <th style={{ color: colors.textSecondary, textAlign: 'left', padding: '8px' }}>ecosystem</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>content</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>compliance</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>formality</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>warmth</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>empathy</th>
            <th style={{ color: colors.textSecondary, textAlign: 'right', padding: '8px' }}>trend</th>
          </tr>
        </thead>
        <tbody>
          {sortedMetrics.map((m) => (
            <AdminTableRow key={m.ecosystem}>
              <AdminTableCell>
                <Label style={{ color: colors.text }}>{m.ecosystemLabel}</Label>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: colors.text }}>{m.contentEvaluated.toLocaleString()}</Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getScoreColor(m.complianceScore, colors) }}>
                  {m.complianceScore.toFixed(1)}%
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getScoreColor(m.dimensions.formality, colors) }}>
                  {m.dimensions.formality.toFixed(0)}
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getScoreColor(m.dimensions.warmth, colors) }}>
                  {m.dimensions.warmth.toFixed(0)}
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: getScoreColor(m.dimensions.empathy, colors) }}>
                  {m.dimensions.empathy.toFixed(0)}
                </Text>
              </AdminTableCell>
              <AdminTableCell style={{ textAlign: 'right' }}>
                <Text style={{ color: m.trend >= 0 ? colors.success : colors.error }}>
                  {formatTrend(m.trend)}
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
 * Tonality Compliance Dashboard
 * 
 * Displays comprehensive brand voice and tonality compliance metrics including:
 * - Overall compliance scores
 * - Dimension breakdowns (formality, warmth, empathy, etc.)
 * - Per-ecosystem performance
 * - Top violations and improvement areas
 */
export function TonalityComplianceDashboard({ metrics, colors }: TonalityComplianceDashboardProps) {
  // Enrich metrics with labels
  const enrichedMetrics = useMemo(
    () => ({
      ...metrics,
      ecosystemMetrics: metrics.ecosystemMetrics.map(m => ({
        ...m,
        ecosystemLabel: ECOSYSTEM_LABELS[m.ecosystem] || m.ecosystem,
      })),
    }),
    [metrics]
  );

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: colors.text, marginBottom: '8px' }}>
        tonality compliance
      </Title>
      <Text style={{ color: colors.textSecondary, marginBottom: '24px' }}>
        {metrics.period}
      </Text>

      <TonalitySummary metrics={enrichedMetrics} colors={colors} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <DimensionScoresChart metrics={enrichedMetrics} colors={colors} />
        <EcosystemComplianceChart ecosystemMetrics={enrichedMetrics.ecosystemMetrics} colors={colors} />
      </div>

      <TopViolationsSection violations={enrichedMetrics.topViolations} colors={colors} />

      <EcosystemBreakdownTable ecosystemMetrics={enrichedMetrics.ecosystemMetrics} colors={colors} />
    </div>
  );
}

export default TonalityComplianceDashboard;
