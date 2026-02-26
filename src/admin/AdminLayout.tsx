import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../../convex/_generated/api';
import { useLazyQuery } from '../hooks/useLazyQuery';
import { AdminRefreshControls } from './components/AdminRefreshControls';
import { useThemeColors, SEMANTIC_COLORS } from '../theme/useColors';
import { Title, Text, Label, Button, SegmentedControl, SegmentedControlItem, SearchField } from '@marcelinodzn/ds-react';
import { Badge } from '../components/ui/Badge';
import OnboardingModal, { loadUserProfile, type UserProfile } from '../components/OnboardingModal';
import type { ColorMode } from '../types';

/** Chart accent for branded chart bars */
const CHART_ACCENT = '#f97316';
/** Muted gray for disabled/fallback states */
const MUTED_GRAY = '#6b7280';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { AdminSidebar, type AdminSection } from './components/AdminSidebar';
import { AdminTable, AdminTableRow, AdminTableCell } from './components/AdminTable';
import { TimeRangeSelector, getTimestampForRange, type TimeRange } from './components/TimeRangeSelector';
import { ChartContainer, HorizontalBarChart, VerticalBars, StatBreakdown, SentimentBar } from './components/AnalyticsCharts';
import { DataCard, VerticalBarChart } from '@jio/datavis-components';
import { DelayedTooltip } from '../components/DelayedTooltip';
import { KPI_DESCRIPTIONS } from './constants/kpiDescriptions';
import { formatDuration, formatRelativeTime } from './utils/formatters';
import { CorrectionApprovalList } from './components/CorrectionApproval';
import { CategorySection } from './components/CategorySection';
import { TokensDisplay } from './components/TokensDisplay';

// ── Utility: Feedback badge ──────────────────────────────────────
function FeedbackBadge({ type }: { type: string }) {
  const theme = useThemeColors();
  
  const colorMap: Record<string, string> = {
    thumbs_up:   theme.isLight ? '#DCFCE7' : 'rgba(34, 197, 94, 0.2)',
    thumbs_down: theme.isLight ? '#FEE2E2' : 'rgba(239, 68, 68, 0.2)',
    edit:        theme.isLight ? '#DBEAFE' : 'rgba(59, 130, 246, 0.2)',
    comment:     theme.isLight ? '#FEF3C7' : 'rgba(234, 179, 8, 0.2)',
  };
  const fallbackBg = theme.isLight ? '#F3F4F6' : 'rgba(107, 114, 128, 0.2)';
  const bg = colorMap[type] || fallbackBg;

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: bg,
        borderRadius: '4px',
        padding: '2px 6px',
      }}
    >
      <Label size="XS" weight="medium" attention="high" as="span">
        {type.replace('_', ' ')}
      </Label>
    </span>
  );
}

// Badge component imported from '../components/ui/Badge'

// ── Utility: Page Header (main page title) ───────────────────────
function PageHeader({ title, description }: { title: string; description: string }) {
  const theme = useThemeColors();
  return (
    <div className="mb-6">
      <Title size="L" as="h1" weight="high" color="high">
        {title}
      </Title>
      <p 
        style={{
          fontFamily: '"JioType Var"',
          fontWeight: 400,
          fontSize: '12px',
          lineHeight: 1.3,
          fontVariationSettings: '"opsz" 24',
          color: theme.text.low,
          margin: 0,
          marginTop: '6px',
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ── Utility: Section Header (chart/section titles) ───────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <Title size="S" as="h2" weight="high" color="high">
        {title}
      </Title>
      <div className="mt-0.5">
        <Text size="XS" weight="low" color="low">
          {subtitle}
        </Text>
      </div>
    </div>
  );
}

// ── Utility: Card wrapper ────────────────────────────────────────
function AdminCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const theme = useThemeColors();
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        border: `1px solid ${theme.stroke.medium}`,
        backgroundColor: 'transparent',
      }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-6 first:mt-0">
      <Title size="XS" as="h2" weight="high" color="high">
        {children}
      </Title>
    </div>
  );
}

// ── Loading skeleton for admin sections ──────────────────────────
function AdminLoadingSkeleton() {
  const theme = useThemeColors();
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 rounded w-1/4" style={{ backgroundColor: theme.stroke.low }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded" style={{ backgroundColor: theme.stroke.low }} />
        ))}
      </div>
      <div className="h-40 rounded" style={{ backgroundColor: theme.stroke.low }} />
    </div>
  );
}

// ── Offline banner component ─────────────────────────────────────
function OfflineBanner() {
  return (
    <div 
      className="mb-4 px-4 py-2 rounded-lg flex items-center gap-2"
      style={{ backgroundColor: `${SEMANTIC_COLORS.warning}1A`, border: `1px solid ${SEMANTIC_COLORS.warning}4D` }}
    >
      <span style={{ color: SEMANTIC_COLORS.warning, fontSize: '13px' }}>
        You are offline. Showing cached data.
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════

// ── Query Error Display Component ─────────────────────────────────
function QueryErrorDisplay({ error, queryName, onRetry }: { 
  error: string; 
  queryName: string;
  onRetry?: () => void;
}) {
  const theme = useThemeColors();
  return (
    <div 
      className="p-4 rounded-lg mb-4"
      style={{ 
        backgroundColor: `${SEMANTIC_COLORS.negative}1A`, 
        border: `1px solid ${SEMANTIC_COLORS.negative}4D` 
      }}
    >
      <div className="flex items-start gap-3">
        <span style={{ color: SEMANTIC_COLORS.negative, fontSize: '20px' }}>⚠</span>
        <div className="flex-1">
          <p className="font-medium" style={{ color: SEMANTIC_COLORS.negative, fontSize: '14px' }}>
            Failed to load {queryName}
          </p>
          <p className="mt-1" style={{ color: theme.text.low, fontSize: '12px' }}>
            {error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-3 py-1 rounded text-sm font-medium"
              style={{ 
                backgroundColor: theme.accent, 
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────
// Redesigned for POC: Focus on value delivery metrics
function AdminDashboard() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const [queryError, setQueryError] = useState<string | null>(null);
  
  // Time range for analytics - last 24 hours from mount time
  const [since] = useState(() => Date.now() - 24 * 60 * 60 * 1000);
  
  // Lazy queries for admin dashboard - only refresh on demand
  const { 
    data: dashboardStats, 
    isLoading: dashboardLoading, 
    refresh: refreshDashboard,
    lastRefreshTime: dashboardRefreshTime,
    isPaused: dashboardPaused,
  } = useLazyQuery(api.analytics.dashboardStats, { since });
  
  const { 
    data: learningStats, 
    refresh: refreshLearning,
  } = useLazyQuery(api.corrections.getLearningStats, { since });
  
  const { 
    data: hourlyBreakdown,
    refresh: refreshHourly, 
  } = useLazyQuery(api.analytics.hourlyBreakdown, { since });
  
  const { 
    data: recentSessions,
    refresh: refreshSessions, 
  } = useLazyQuery(api.sessions.getRecent, { limit: 5 });
  
  // Combined refresh for all dashboard data
  const refreshAll = useCallback(() => {
    refreshDashboard();
    refreshLearning();
    refreshHourly();
    refreshSessions();
  }, [refreshDashboard, refreshLearning, refreshHourly, refreshSessions]);
  
  // Format hourly data for charts (legacy format)
  const hourlyChartData = useMemo(() => {
    if (!hourlyBreakdown) return [];
    try {
      return hourlyBreakdown.map(h => ({
        label: `${h.hour.toString().padStart(2, '0')}`,
        value: h.count,
      }));
    } catch (err) {
      console.error('[AdminDashboard] Error formatting hourly data:', err);
      return [];
    }
  }, [hourlyBreakdown]);

  // Format hourly data for DS VerticalBarChart
  const hourlyBarChartData = useMemo(() => {
    return hourlyChartData.map((d, i) => ({
      id: String(i),
      category: d.label,
      value: d.value,
    }));
  }, [hourlyChartData]);
  
  // Loading state - show skeleton while data is loading
  if (dashboardLoading || (dashboardStats === undefined && learningStats === undefined)) {
    return <AdminLoadingSkeleton />;
  }
  
  // Handle null responses (query returned but no data - could indicate Convex issue)
  if (dashboardStats === null) {
    console.error('[AdminDashboard] dashboardStats returned null - possible Convex connection issue');
    return (
      <QueryErrorDisplay 
        error="dashboard stats query returned no data. check convex connection and deployment." 
        queryName="dashboard stats"
        onRetry={() => window.location.reload()}
      />
    );
  }
  
  if (learningStats === null) {
    console.error('[AdminDashboard] learningStats returned null - possible Convex connection issue');
    return (
      <QueryErrorDisplay 
        error="learning stats query returned no data. check convex connection and deployment." 
        queryName="learning stats"
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Calculate completion rate safely
  const completionRate = dashboardStats.totalSessions > 0
    ? Math.round((dashboardStats.completedSessions / dashboardStats.totalSessions) * 100)
    : 0;

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <div className="flex justify-between items-center mb-4">
        <PageHeader title="Dashboard" description="System health and value delivery — last 24 hours" />
        <AdminRefreshControls
          lastRefresh={dashboardRefreshTime}
          isLoading={dashboardLoading}
          isPaused={dashboardPaused}
          onRefresh={refreshAll}
          label="dashboard"
        />
      </div>

      {/* Overview Section */}
      <div 
        className="rounded-xl mb-5"
        style={{ 
          border: `1px solid ${theme.stroke.medium}`,
          padding: '16px',
        }}
      >
        <h2 
          style={{ 
            fontWeight: 800, 
            lineHeight: 1, 
            fontFamily: 'JioType Var', 
            color: theme.text.high, 
            margin: 0,
            paddingBottom: '16px',
            fontSize: '14px',
          }}
        >
          Overview
        </h2>
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.totalGenerations.description} position="bottom">
              <div>
                <DataCard 
                  title="total generations"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(dashboardStats.totalGenerations ?? 0),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.avgTrustScore.description} position="bottom">
              <div>
                <DataCard 
                  title="avg trust score"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: dashboardStats.avgTrustScore !== null ? String(dashboardStats.avgTrustScore) : '—',
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.copyCount.description} position="bottom">
              <div>
                <DataCard 
                  title="content copied"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(dashboardStats.copyCount ?? 0),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.learningsApplied.description} position="bottom">
              <div>
                <DataCard 
                  title="learnings applied"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(learningStats.totalPatternsApplied ?? 0),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
        </div>
      </div>

      {/* Content Quality Section */}
      <div 
        className="rounded-xl mb-5"
        style={{ 
          border: `1px solid ${theme.stroke.medium}`,
          padding: '16px',
        }}
      >
        <h2 
          style={{ 
            fontWeight: 800, 
            lineHeight: 1, 
            fontFamily: 'JioType Var', 
            color: theme.text.high, 
            margin: 0,
            paddingBottom: '16px',
            fontSize: '14px',
          }}
        >
          Content quality
        </h2>
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.regenerationRate.description} position="bottom">
              <div>
                <DataCard 
                  title="regeneration rate"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: `${dashboardStats.regenerationRate}%`,
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.completionRate.description} position="bottom">
              <div>
                <DataCard 
                  title="completion rate"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: `${completionRate}%`,
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.regenerations.description} position="bottom">
              <div>
                <DataCard 
                  title="regenerations"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(dashboardStats.regenerationCount),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.errorCount.description} position="bottom">
              <div>
                <DataCard 
                  title="errors"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(dashboardStats.errorCount),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
        </div>
      </div>

      {/* Hourly Activity Chart - using DS VerticalBarChart */}
      <div className="mb-5">
        {hourlyBarChartData.length > 0 && !hourlyBarChartData.every(d => d.value === 0) ? (
          <div 
            className="rounded-xl"
            style={{ 
              border: `1px solid ${theme.stroke.medium}`,
              padding: '16px',
            }}
          >
            <VerticalBarChart
              data={hourlyBarChartData}
              chartHeader={{
                title: "hourly activity",
                subtitle: "content generations over time",
              }}
              chartFooter={{
                source: "",
                notes: "",
              }}
              barGroup={{
                showYAxis: true,
                showHoverBadge: true,
              }}
              modes={{ 
                colourMode: theme.colorMode, 
                colourTheme: 'MyJio',
                fullWidth: true,
              }}
            />
          </div>
        ) : (
          <ChartContainer
            title="hourly activity"
            subtitle="content generations over time"
            empty={true}
            emptyMessage="no activity in selected time range"
          >
            <div />
          </ChartContainer>
        )}
      </div>

      {/* Recent Sessions (collapsed view) */}
      {recentSessions && recentSessions.length > 0 && (
        <AdminCard className="p-4">
          <CardLabel>Recent sessions</CardLabel>
          <AdminTable
            columns={[
              { key: 'project', label: 'Project' },
              { key: 'status', label: 'Status' },
              { key: 'messages', label: 'Messages' },
              { key: 'duration', label: 'Duration' },
              { key: 'time', label: 'Started' },
            ]}
            isEmpty={recentSessions.length === 0}
            emptyMessage="No sessions yet"
          >
            {recentSessions.map((session) => (
              <AdminTableRow key={session._id}>
                <AdminTableCell>{session.projectName}</AdminTableCell>
                <AdminTableCell>
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: session.status === 'active' 
                        ? (theme.isLight ? '#DCFCE7' : 'rgba(34, 197, 94, 0.2)')
                        : session.status === 'completed'
                          ? (theme.isLight ? '#DBEAFE' : 'rgba(59, 130, 246, 0.2)')
                          : (theme.isLight ? '#FEF3C7' : 'rgba(234, 179, 8, 0.2)'),
                      borderRadius: '4px',
                      padding: '2px 6px',
                    }}
                  >
                    <Label size="XS" weight="medium" attention="high" as="span">
                      {session.status}
                    </Label>
                  </span>
                </AdminTableCell>
                <AdminTableCell>{session.messageCount}</AdminTableCell>
                <AdminTableCell>{formatDuration(session.durationSeconds ?? null)}</AdminTableCell>
                <AdminTableCell>
                  <span style={{ color: theme.text.low, fontSize: '12px' }}>
                    {formatRelativeTime(session.startedAt)}
                  </span>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTable>
        </AdminCard>
      )}
    </>
  );
}

// ── CorrectionDiff Component ───────────────────────────────────────
// Shows before/after comparison for edit corrections
function CorrectionDiff({
  original,
  edited,
  ecosystem,
  channel,
  timestamp,
  expanded,
  onToggle,
}: {
  original: string;
  edited: string;
  ecosystem: string;
  channel: string;
  timestamp: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useThemeColors();
  
  return (
    <div 
      className="mb-3 p-3 rounded-lg cursor-pointer transition-all"
      style={{ 
        backgroundColor: theme.background.ghost,
        border: `1px solid ${expanded ? theme.accent : theme.stroke.low}`,
      }}
      onClick={onToggle}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2">
          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low }}>
            {ecosystem}
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low }}>
            {channel}
          </span>
        </div>
        <span className="text-xs" style={{ color: theme.text.low }}>
          {formatRelativeTime(timestamp)}
        </span>
      </div>
      
      {expanded ? (
        <div className="space-y-2">
          <div>
            <span className="block text-xs font-medium mb-1" style={{ color: SEMANTIC_COLORS.negative }}>
              Before (AI generated):
            </span>
            <p className="text-sm p-2 rounded" style={{ 
              backgroundColor: `${SEMANTIC_COLORS.negative}14`, 
              color: theme.text.high,
              textDecoration: 'line-through',
              opacity: 0.7,
            }}>
              {original}
            </p>
          </div>
          <div>
            <span className="block text-xs font-medium mb-1" style={{ color: SEMANTIC_COLORS.positive }}>
              After (user edited):
            </span>
            <p className="text-sm p-2 rounded" style={{ 
              backgroundColor: `${SEMANTIC_COLORS.positive}14`, 
              color: theme.text.high,
            }}>
              {edited}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm truncate" style={{ color: theme.text.medium }}>
          {original.slice(0, 100)}{original.length > 100 ? '...' : ''}
        </p>
      )}
    </div>
  );
}

// ── Learning Center (renamed from Memory) ────────────────────────────
// Purpose: Prove the system learns and improves from user feedback
function AdminLearningCenter() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  
  // Get user profile for deviceId (needed for admin mutations)
  const userProfile = loadUserProfile();
  
  // Lazy queries for learning center - only refresh on demand
  const { 
    data: corrections, 
    isLoading: correctionsLoading,
    refresh: refreshCorrections,
    lastRefreshTime: correctionsRefreshTime,
    isPaused: correctionsPaused,
  } = useLazyQuery(
    api.corrections.listAll,
    userProfile?.deviceId ? { limit: 200, deviceId: userProfile.deviceId } : "skip"
  );
  
  const { 
    data: learningStats,
    refresh: refreshLearningStats, 
  } = useLazyQuery(api.corrections.getLearningStats, {});
  
  const { 
    data: feedbackCounts,
    refresh: refreshFeedbackCounts, 
  } = useLazyQuery(api.corrections.countByFeedbackType, {});
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>('all');
  
  // Combined refresh for all learning center data
  const refreshAll = useCallback(() => {
    refreshCorrections();
    refreshLearningStats();
    refreshFeedbackCounts();
  }, [refreshCorrections, refreshLearningStats, refreshFeedbackCounts]);

  // Debug logging for production troubleshooting
  useEffect(() => {
    console.log('[AdminLearningCenter] Query states:', {
      corrections: corrections === undefined ? 'loading' : corrections === null ? 'null' : `loaded (${corrections?.length ?? 0})`,
      learningStats: learningStats === undefined ? 'loading' : learningStats === null ? 'null' : 'loaded',
      feedbackCounts: feedbackCounts === undefined ? 'loading' : feedbackCounts === null ? 'null' : 'loaded',
    });
  }, [corrections, learningStats, feedbackCounts]);

  // Loading state
  if (correctionsLoading || (corrections === undefined && learningStats === undefined)) {
    return <AdminLoadingSkeleton />;
  }
  
  // Handle null responses
  if (corrections === null || learningStats === null) {
    console.error('[AdminLearningCenter] Query returned null - possible Convex issue');
    return (
      <QueryErrorDisplay 
        error="learning center data query returned no data. check convex connection." 
        queryName="learning center"
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Get edit corrections for the diff view
  const editCorrections = corrections.filter(c => c.feedbackType === 'edit' && c.editedContent);

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <div className="flex justify-between items-center mb-4">
        <PageHeader 
          title="Learning center" 
          description="How user feedback improves content generation" 
        />
        <AdminRefreshControls
          lastRefresh={correctionsRefreshTime}
          isLoading={correctionsLoading}
          isPaused={correctionsPaused}
          onRefresh={refreshAll}
          label="learning data"
        />
      </div>

      {/* Learning Stats Hero */}
      <div 
        className="rounded-xl mb-5"
        style={{ 
          border: `1px solid ${theme.stroke.medium}`,
          padding: '16px',
        }}
      >
        <h2 
          style={{ 
            fontWeight: 800, 
            lineHeight: 1, 
            fontFamily: 'JioType Var', 
            color: theme.text.high, 
            margin: 0,
            paddingBottom: '16px',
            fontSize: '14px',
          }}
        >
          Overview
        </h2>
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.learningsApplied.description} position="bottom">
              <div>
                <DataCard 
                  title="learnings applied"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(learningStats.totalPatternsApplied ?? 0),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.editCorrections.description} position="bottom">
              <div>
                <DataCard 
                  title="edit corrections"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(learningStats.byFeedbackType.edits ?? 0),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.avoidPatterns.description} position="bottom">
              <div>
                <DataCard 
                  title="avoid patterns"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(learningStats.uniqueAvoidPatterns ?? 0),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
          <div className="flex-1">
            <DelayedTooltip content={KPI_DESCRIPTIONS.totalFeedback.description} position="bottom">
              <div>
                <DataCard 
                  title="total feedback"
                  fillEmphasis="Ghost"
                  width="100%"
                  dataHead={{
                    leadValue: String(corrections.length ?? 0),
                    showDataSupporting: false,
                    showSupportingLabel: false,
                  }}
                  modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
                />
              </div>
            </DelayedTooltip>
          </div>
        </div>
      </div>

      {/* Top Avoid Patterns */}
      {learningStats.topAvoidReasons.length > 0 && (
        <AdminCard className="p-4 mb-5">
          <CardLabel>Top patterns to avoid (from negative feedback)</CardLabel>
          <div className="flex flex-wrap gap-2">
            {learningStats.topAvoidReasons.map((reason, i) => (
              <Badge key={i} variant="negative">
                {reason}
              </Badge>
            ))}
          </div>
        </AdminCard>
      )}

      {/* Full Feedback Table */}
      <AdminCard className="p-4 mb-5">
        <CardLabel>
          All feedback ({corrections.length} items)
        </CardLabel>
        
        {/* Filter SegmentedControl */}
        <div style={{ marginBottom: '16px' }}>
          <SegmentedControl 
            value={feedbackTypeFilter} 
            onChange={setFeedbackTypeFilter}
            aria-label="filter by feedback type"
            size="S"
            emphasis="low"
            className="segmented-no-gap"
          >
            <SegmentedControlItem value="all">all</SegmentedControlItem>
            <SegmentedControlItem value="thumbs_up">thumbs up</SegmentedControlItem>
            <SegmentedControlItem value="thumbs_down">thumbs down</SegmentedControlItem>
            <SegmentedControlItem value="edit">edit</SegmentedControlItem>
            <SegmentedControlItem value="comment">comment</SegmentedControlItem>
          </SegmentedControl>
        </div>

        <AdminTable
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'original', label: 'Original content' },
            { key: 'edited', label: 'Edited / comment' },
            { key: 'eco', label: 'Ecosystem' },
            { key: 'channel', label: 'Channel' },
            { key: 'time', label: 'Time' },
          ]}
          isEmpty={(feedbackTypeFilter === 'all' ? corrections : corrections.filter(c => c.feedbackType === feedbackTypeFilter)).length === 0}
          emptyMessage="No feedback recorded yet."
        >
          {(feedbackTypeFilter === 'all' ? corrections : corrections.filter(c => c.feedbackType === feedbackTypeFilter)).slice(0, 50).map((c, i) => {
            const idStr = c._id?.toString() || String(i);
            
            return (
              <AdminTableRow key={idStr}>
                <AdminTableCell><FeedbackBadge type={c.feedbackType} /></AdminTableCell>
                <AdminTableCell className="max-w-[200px] truncate">{(c.originalContent || '').slice(0, 100)}</AdminTableCell>
                <AdminTableCell className="max-w-[200px] truncate">{c.editedContent || c.comment || '—'}</AdminTableCell>
                <AdminTableCell>{(c as Record<string, unknown>).ecosystem as string || '—'}</AdminTableCell>
                <AdminTableCell>{(c as Record<string, unknown>).channel as string || '—'}</AdminTableCell>
                <AdminTableCell className="whitespace-nowrap" muted>{formatRelativeTime(c.timestamp)}</AdminTableCell>
              </AdminTableRow>
            );
          })}
        </AdminTable>
        {(feedbackTypeFilter === 'all' ? corrections : corrections.filter(c => c.feedbackType === feedbackTypeFilter)).length > 50 && (
          <span className="block mt-2" style={{ color: theme.text.low, fontSize: '12px' }}>
            showing 50 of {(feedbackTypeFilter === 'all' ? corrections : corrections.filter(c => c.feedbackType === feedbackTypeFilter)).length} items.
          </span>
        )}
      </AdminCard>

      {/* Correction Approval Section */}
      <AdminCard className="p-4">
        <CardLabel>Correction approval queue</CardLabel>
        <p className="text-xs mb-4" style={{ color: theme.text.low }}>
          Review and approve/reject user feedback to control what the system learns from.
        </p>
        <CorrectionApprovalList deviceId={userProfile?.deviceId} feedbackCounts={feedbackCounts} />
      </AdminCard>
    </>
  );
}

// ── Knowledge Type Configuration ─────────────────────────────────
// Comprehensive type definitions with accurate descriptions and badge variants
const KNOWLEDGE_TYPE_CONFIG: Record<string, {
  label: string;
  description: string;
  badge: 'positive' | 'negative' | 'warning' | 'informative' | 'neutral';
  priority: 'high' | 'medium' | 'low';
}> = {
  avoid_word: {
    label: 'Avoid Words',
    description: 'Words and phrases that should NOT be used in Jio content. Includes complex jargon, robotic language, fear-based messaging, bureaucratic terms, and shame-inducing phrases.',
    badge: 'negative',
    priority: 'high'
  },
  auto_fix: {
    label: 'Auto-Fix Rules',
    description: 'Automatic text replacements for common issues including gender-neutral alternatives, simplified jargon, British spelling corrections, and format fixes.',
    badge: 'informative',
    priority: 'high'
  },
  approved_example: {
    label: 'Approved Examples',
    description: 'Curated content examples for reference and few-shot prompting. Used to guide the AI model with style and tone during generation.',
    badge: 'informative',
    priority: 'high'
  },
  preferred_word: {
    label: 'Preferred Vocabulary',
    description: 'Recommended vocabulary terms organized by intent: care & connection, action & progress, clarity & safety, fixing & resolution, community first, learning & discovery.',
    badge: 'positive',
    priority: 'medium'
  },
  product_definition: {
    label: 'Product Definitions',
    description: 'Official ecosystem definitions with recommended tone. Each ecosystem (Connectivity, Home, Entertainment, etc.) has a specific voice personality.',
    badge: 'informative',
    priority: 'low'
  },
  festival: {
    label: 'Festivals',
    description: 'Festival dates and cultural context for India-specific content. Includes greeting templates and tone guidance for each festival.',
    badge: 'warning',
    priority: 'low'
  }
};

// Order of types for display
const KNOWLEDGE_TYPE_ORDER = ['avoid_word', 'auto_fix', 'preferred_word', 'product_definition', 'festival'];

// ── Knowledge Base ───────────────────────────────────────────────
// Redesigned: SegmentedControl for type navigation, single content view
function AdminKnowledge() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  
  // Type selection and search state
  const [selectedType, setSelectedType] = useState<string>('avoid_word');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lazy queries for knowledge - only refresh on demand
  const { 
    data: knowledgeCounts,
    isLoading: countsLoading,
    refresh: refreshCounts,
    lastRefreshTime: countsRefreshTime,
    isPaused: countsPaused,
  } = useLazyQuery(api.knowledge.countByType, {});
  
  const { 
    data: knowledgeItems,
    isLoading: itemsLoading,
    refresh: refreshItems, 
  } = useLazyQuery(
    api.knowledge.listAll, 
    { limit: 500 }
  );
  
  // Combined refresh for all knowledge data
  const refreshAll = useCallback(() => {
    refreshCounts();
    refreshItems();
  }, [refreshCounts, refreshItems]);
  
  // Debug logging for production troubleshooting
  useEffect(() => {
    console.log('[AdminKnowledge] Query states:', {
      knowledgeCounts: knowledgeCounts === undefined ? 'loading' : knowledgeCounts === null ? 'null' : 'loaded',
      knowledgeItems: knowledgeItems === undefined ? 'loading' : knowledgeItems === null ? 'null' : `loaded (${knowledgeItems?.length ?? 0})`,
    });
  }, [knowledgeCounts, knowledgeItems]);
  
  // Calculate total active rules
  const totalActiveRules = useMemo(() => {
    if (!knowledgeCounts) return 0;
    return Object.values(knowledgeCounts).reduce(
      (sum, counts) => sum + (counts.active || 0), 0
    );
  }, [knowledgeCounts]);

  // Group ALL items by type, then by category
  const groupedByType = useMemo(() => {
    if (!knowledgeItems) return {};
    
    const result: Record<string, Record<string, typeof knowledgeItems>> = {};
    
    for (const type of KNOWLEDGE_TYPE_ORDER) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = knowledgeItems.filter((item: any) => item.type === type && item.isActive);
      const grouped: Record<string, typeof filtered> = {};
      
      for (const item of filtered) {
        const cat = item.category || 'uncategorized';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      }
      result[type] = grouped;
    }
    return result;
  }, [knowledgeItems]);

  // Get items for a specific type
  const getItemsForType = (type: string) => {
    if (!knowledgeItems) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return knowledgeItems.filter((item: any) => item.type === type && item.isActive);
  };

  // Get count for type
  const getTypeCount = (type: string): number => {
    return knowledgeCounts?.[type]?.active || 0;
  };

  // Get available categories for a specific type
  const getCategoriesForType = (type: string): string[] => {
    const grouped = groupedByType[type] || {};
    return Object.keys(grouped).sort((a, b) => {
      if (a === 'uncategorized') return 1;
      if (b === 'uncategorized') return -1;
      const countDiff = (grouped[b]?.length || 0) - (grouped[a]?.length || 0);
      return countDiff !== 0 ? countDiff : a.localeCompare(b);
    });
  };

  // Filter items based on search query (must be before early returns)
  const filterItems = useCallback((items: typeof knowledgeItems) => {
    if (!searchQuery || !items) return items;
    return items.filter(item => 
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.metadata?.suggestion?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery]);

  // Loading state
  if (knowledgeCounts === undefined) {
    return <AdminLoadingSkeleton />;
  }
  
  // Handle null response
  if (knowledgeCounts === null) {
    console.error('[AdminKnowledge] knowledgeCounts returned null - possible Convex issue');
    return (
      <QueryErrorDisplay 
        error="knowledge base data query returned no data. check convex connection." 
        queryName="knowledge base"
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Render grouped content (avoid_word, auto_fix, preferred_word, festival)
  const renderGroupedContent = (type: string) => {
    const categories = getCategoriesForType(type);
    const grouped = groupedByType[type] || {};

    // Calculate filtered count
    const filteredCount = categories.reduce((sum, cat) => {
      return sum + filterItems(grouped[cat] || []).length;
    }, 0);

    if (filteredCount === 0) {
      return (
        <div className="text-center py-12" style={{ color: theme.text.low }}>
          {searchQuery 
            ? 'No items match your search.'
            : `No ${KNOWLEDGE_TYPE_CONFIG[type].label} configured yet.`}
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {categories.map(category => {
          const items = filterItems(grouped[category] || []);
          if (!items || items.length === 0) return null;
          return (
            <CategorySection
              key={category}
              category={category}
              items={items}
              type={type}
              searchQuery={searchQuery}
            />
          );
        })}
      </div>
    );
  };

  // Render product definitions table content
  const renderProductDefinitionsContent = () => {
    const allItems = getItemsForType('product_definition');
    
    // Filter by search query
    const items = searchQuery 
      ? allItems.filter(item => 
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : allItems;

    // Parse content field which contains "Name: Tone" format
    const parseContent = (content: string) => {
      const colonIndex = content.indexOf(':');
      if (colonIndex === -1) return { name: content, tone: '—' };
      return {
        name: content.slice(0, colonIndex).trim(),
        tone: content.slice(colonIndex + 1).trim()
      };
    };

    // Get keywords from tags (filter out system tags)
    const getKeywords = (tags: string[]) => {
      const systemTags = ['product', 'ecosystem', 'tier1'];
      return tags.filter(tag => !systemTags.includes(tag) && tag !== allItems.find(i => i.tags.includes(tag))?.category);
    };

    if (items.length === 0) {
      return (
        <div className="text-center py-12" style={{ color: theme.text.low }}>
          {searchQuery ? 'No items match your search.' : 'No Product Definitions configured yet.'}
        </div>
      );
    }

    return (
      <AdminTable
        columns={[
          { key: 'ecosystem', label: 'Ecosystem' },
          { key: 'tone', label: 'Recommended Tone' },
          { key: 'keywords', label: 'Keywords' },
        ]}
        isEmpty={items.length === 0}
        emptyMessage="No Product Definitions configured."
      >
        {items.map((item, i) => {
          const parsed = parseContent(item.content);
          const keywords = getKeywords(item.tags || []);
          return (
            <AdminTableRow key={i}>
              <AdminTableCell>
                <span className="font-semibold" style={{ color: theme.text.high }}>
                  {parsed.name}
                </span>
              </AdminTableCell>
              <AdminTableCell>
                <span style={{ color: theme.text.medium }}>
                  {parsed.tone}
                </span>
              </AdminTableCell>
              <AdminTableCell>
                <div className="flex flex-wrap gap-1">
                  {keywords.slice(0, 5).map((kw, ki) => (
                    <Badge key={ki} variant="neutral">
                      {kw}
                    </Badge>
                  ))}
                  {keywords.length > 5 && (
                    <Badge variant="neutral">
                      +{keywords.length - 5}
                    </Badge>
                  )}
                </div>
              </AdminTableCell>
            </AdminTableRow>
          );
        })}
      </AdminTable>
    );
  };

  // Render approved examples table content
  const renderApprovedExamplesContent = () => {
    const allItems = getItemsForType('approved_example');
    
    // Filter by search query
    const items = searchQuery 
      ? allItems.filter(item => 
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.metadata?.ecosystem as string)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.metadata?.channel as string)?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allItems;

    if (items.length === 0) {
      return (
        <div className="text-center py-12" style={{ color: theme.text.low }}>
          {searchQuery ? 'No items match your search.' : 'No Approved Examples yet.'}
        </div>
      );
    }

    return (
      <AdminTable
        columns={[
          { key: 'content', label: 'Content' },
          { key: 'ecosystem', label: 'Ecosystem' },
          { key: 'channel', label: 'Channel' },
        ]}
        isEmpty={items.length === 0}
        emptyMessage="No examples saved yet."
      >
        {items.map((item, i) => (
          <AdminTableRow key={i}>
            <AdminTableCell className="max-w-md truncate">
              {item.content.slice(0, 120)}
            </AdminTableCell>
            <AdminTableCell>
              {(item.metadata?.ecosystem as string) || '—'}
            </AdminTableCell>
            <AdminTableCell>
              {(item.metadata?.channel as string) || '—'}
            </AdminTableCell>
          </AdminTableRow>
        ))}
      </AdminTable>
    );
  };

  // Render auto-fix rules as table showing from -> to replacements
  const renderAutoFixContent = () => {
    const allItems = getItemsForType('auto_fix');
    
    // Filter by search query - check from (content), to (suggestion), and category
    const items = searchQuery 
      ? allItems.filter(item => 
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.metadata?.suggestion as string)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allItems;

    if (items.length === 0) {
      return (
        <div className="text-center py-12" style={{ color: theme.text.low }}>
          {searchQuery ? 'No items match your search.' : 'No Auto-Fix Rules configured yet.'}
        </div>
      );
    }

    // Format category for display
    const formatCategory = (cat: string) => 
      cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
      <AdminTable
        columns={[
          { key: 'from', label: 'From' },
          { key: 'to', label: 'To' },
          { key: 'category', label: 'Category' },
        ]}
        isEmpty={items.length === 0}
        emptyMessage="No Auto-Fix Rules configured."
      >
        {items.map((item, i) => (
          <AdminTableRow key={i}>
            <AdminTableCell>
              <span className="font-mono" style={{ color: '#dc2626', textDecoration: 'line-through', opacity: 0.8 }}>
                {item.content}
              </span>
            </AdminTableCell>
            <AdminTableCell>
              <span className="font-mono" style={{ color: '#16a34a' }}>
                {(item.metadata?.suggestion as string) || '—'}
              </span>
            </AdminTableCell>
            <AdminTableCell>
              <span style={{ color: theme.text.medium }}>
                {formatCategory(item.category || 'uncategorized')}
              </span>
            </AdminTableCell>
          </AdminTableRow>
        ))}
      </AdminTable>
    );
  };

  // Render festivals as table with name, greeting, category, and tone
  const renderFestivalsContent = () => {
    const allItems = getItemsForType('festival');
    
    // Filter by search query
    const items = searchQuery 
      ? allItems.filter(item => 
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.metadata?.suggestion as string)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : allItems;

    if (items.length === 0) {
      return (
        <div className="text-center py-12" style={{ color: theme.text.low }}>
          {searchQuery ? 'No items match your search.' : 'No Festivals configured yet.'}
        </div>
      );
    }

    // Extract tone from tags (filter out system tags)
    const extractTone = (tags: string[]) => {
      const systemTags = ['festival', 'pan_india', 'regional', 'tier1'];
      const toneTags = tags.filter(tag => !systemTags.includes(tag));
      return toneTags.join(', ') || '—';
    };

    // Format category for display
    const formatCategory = (cat: string) => 
      cat === 'pan_india' ? 'Pan India' : cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
      <AdminTable
        columns={[
          { key: 'festival', label: 'Festival' },
          { key: 'greeting', label: 'Greeting' },
          { key: 'category', label: 'Category' },
          { key: 'tone', label: 'Tone' },
        ]}
        isEmpty={items.length === 0}
        emptyMessage="No Festivals configured."
      >
        {items.map((item, i) => (
          <AdminTableRow key={i}>
            <AdminTableCell>
              <span className="font-semibold" style={{ color: theme.text.high }}>
                {item.content}
              </span>
            </AdminTableCell>
            <AdminTableCell>
              <span style={{ color: theme.text.medium }}>
                {(item.metadata?.suggestion as string) || '—'}
              </span>
            </AdminTableCell>
            <AdminTableCell>
              <Badge variant={item.category === 'pan_india' ? 'informative' : 'neutral'}>
                {formatCategory(item.category || 'uncategorized')}
              </Badge>
            </AdminTableCell>
            <AdminTableCell>
              <span className="text-xs" style={{ color: theme.text.low }}>
                {extractTone(item.tags || [])}
              </span>
            </AdminTableCell>
          </AdminTableRow>
        ))}
      </AdminTable>
    );
  };

  // Unified content renderer based on selected type
  const renderTypeContent = (type: string) => {
    switch (type) {
      case 'product_definition':
        return renderProductDefinitionsContent();
      case 'auto_fix':
        return renderAutoFixContent();
      case 'festival':
        return renderFestivalsContent();
      case 'approved_example':
        return renderApprovedExamplesContent();
      default:
        return renderGroupedContent(type);
    }
  };

  // Get current type config for description
  const currentConfig = KNOWLEDGE_TYPE_CONFIG[selectedType];

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <PageHeader title="Knowledge Base" description="Brand rules, vocabulary, and content guidelines" />

      {/* Summary Bar with Stats and Search */}
      <div 
        className="flex items-center justify-between mb-4"
        style={{ backgroundColor: 'transparent' }}
      >
        {/* Left: Stats Card */}
        <div className="flex items-center gap-4">
          <DataCard 
            title="active rules"
            fillEmphasis="Ghost"
            width="auto"
            dataHead={{
              leadValue: String(totalActiveRules),
              showDataSupporting: false,
              showSupportingLabel: false,
            }}
            modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
          />
        </div>

        {/* Right: Search */}
        <div style={{ width: '280px' }}>
          <SearchField
            size="S"
            placeholder={`Search ${currentConfig.label}...`}
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </div>
      </div>

      {/* Type Navigation - SegmentedControl */}
      <div className="mb-4">
        <SegmentedControl
          value={selectedType}
          onChange={setSelectedType}
          aria-label="Knowledge type"
          size="S"
          emphasis="low"
          className="segmented-no-gap"
        >
          {KNOWLEDGE_TYPE_ORDER.map(type => (
            <SegmentedControlItem key={type} value={type}>
              {KNOWLEDGE_TYPE_CONFIG[type].label} ({getTypeCount(type)})
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      {/* Type Description */}
      <p 
        className="mb-4"
        style={{ 
          fontSize: '12px', 
          color: theme.text.medium,
          lineHeight: 1.5,
        }}
      >
        {currentConfig.description}
      </p>

      {/* Loading state for items */}
      {knowledgeItems === undefined && (
        <AdminCard className="p-4 mb-5">
          <div className="animate-pulse space-y-3">
            <div className="h-5 rounded w-1/4" style={{ backgroundColor: theme.stroke.low }} />
            <div className="h-4 rounded w-3/4" style={{ backgroundColor: theme.stroke.low }} />
            <div className="h-20 rounded" style={{ backgroundColor: theme.stroke.low }} />
          </div>
        </AdminCard>
      )}

      {/* Single Type Content */}
      {knowledgeItems && (
        <div className="p-0">
          {renderTypeContent(selectedType)}
        </div>
      )}
    </>
  );
}

// ── ARCHIVED: Usage Analytics ─────────────────────────────────────────
// Temporarily disabled to reduce query load. Can be restored by uncommenting.
// This component made 2 expensive queries: analytics.statsByEcosystemChannel + users.listAll
/*
function AdminUsageAnalytics() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const userProfile = loadUserProfile();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const since = useMemo(() => getTimestampForRange(timeRange), [timeRange]);
  
  // Lazy queries for usage analytics - only refresh on demand
  const { 
    data: contextStats,
    isLoading: contextLoading,
    refresh: refreshContext,
    lastRefreshTime: contextRefreshTime,
    isPaused: contextPaused,
  } = useLazyQuery(api.analytics.statsByEcosystemChannel, { since });
  
  const { 
    data: users,
    refresh: refreshUsers, 
  } = useLazyQuery(
    api.users.listAll,
    userProfile?.deviceId ? { deviceId: userProfile.deviceId } : "skip"
  );
  
  // Combined refresh for all usage analytics data
  const refreshAll = useCallback(() => {
    refreshContext();
    refreshUsers();
  }, [refreshContext, refreshUsers]);
  
  // Debug logging for production troubleshooting
  useEffect(() => {
    console.log('[AdminUsageAnalytics] Query states:', {
      contextStats: contextStats === undefined ? 'loading' : contextStats === null ? 'null' : `loaded (${contextStats?.length ?? 0})`,
      users: users === undefined ? 'loading' : users === null ? 'null' : `loaded (${users?.length ?? 0})`,
      timeRange,
    });
  }, [contextStats, users, timeRange]);
  
  // Group by ecosystem and channel
  const byEcosystem = useMemo(() => {
    if (!contextStats) return [];
    const counts: Record<string, number> = {};
    for (const stat of contextStats) {
      counts[stat.ecosystem] = (counts[stat.ecosystem] || 0) + stat.count;
    }
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [contextStats]);
  
  const byChannel = useMemo(() => {
    if (!contextStats) return [];
    const counts: Record<string, number> = {};
    for (const stat of contextStats) {
      counts[stat.channel] = (counts[stat.channel] || 0) + stat.count;
    }
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [contextStats]);

  // Loading state
  if (contextLoading || contextStats === undefined) {
    return <AdminLoadingSkeleton />;
  }
  
  // Handle null response
  if (contextStats === null) {
    console.error('[AdminUsageAnalytics] contextStats returned null - possible Convex issue');
    return (
      <QueryErrorDisplay 
        error="usage analytics data query returned no data. check convex connection." 
        queryName="usage analytics"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <>
      {!isOnline && <OfflineBanner />}
      
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-4">
          <PageHeader 
            title="Usage analytics" 
            description="Adoption across Jio ecosystem and content channels" 
          />
          <AdminRefreshControls
            lastRefresh={contextRefreshTime}
            isLoading={contextLoading}
            isPaused={contextPaused}
            onRefresh={refreshAll}
            label="analytics"
          />
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <AdminCard className="p-4 mb-5">
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold" style={{ color: theme.accent }}>
            {users?.length ?? 0}
          </span>
          <span style={{ color: theme.text.low, fontSize: '13px' }}>
            Registered users across Jio products
          </span>
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <ChartContainer
          title="By ecosystem"
          subtitle="Content generations per Jio product"
          empty={byEcosystem.length === 0}
          emptyMessage="No ecosystem data available"
        >
          <HorizontalBarChart data={byEcosystem} color={CHART_ACCENT} />
        </ChartContainer>

        <ChartContainer
          title="By channel"
          subtitle="Content generations per channel type"
          empty={byChannel.length === 0}
          emptyMessage="No channel data available"
        >
          <HorizontalBarChart data={byChannel} color={SEMANTIC_COLORS.informative} />
        </ChartContainer>
      </div>

      <AdminCard className="p-4">
        <CardLabel>Quality by context</CardLabel>
        <AdminTable
          columns={[
            { key: 'ecosystem', label: 'Ecosystem' },
            { key: 'channel', label: 'Channel' },
            { key: 'count', label: 'Generations' },
            { key: 'trustScore', label: 'Avg trust score' },
          ]}
          isEmpty={!contextStats || contextStats.length === 0}
          emptyMessage="No usage data in selected time range"
        >
          {contextStats?.slice(0, 15).map((stat, i) => (
            <AdminTableRow key={i}>
              <AdminTableCell>{stat.ecosystem}</AdminTableCell>
              <AdminTableCell>{stat.channel}</AdminTableCell>
              <AdminTableCell>{stat.count}</AdminTableCell>
              <AdminTableCell>
                <span style={{
                  color: (stat.avgTrustScore ?? 0) >= 90 ? SEMANTIC_COLORS.positive : 
                         (stat.avgTrustScore ?? 0) >= 80 ? SEMANTIC_COLORS.warning : SEMANTIC_COLORS.negative,
                  fontWeight: 500,
                }}>
                  {stat.avgTrustScore ?? '—'}
                </span>
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </AdminTable>
      </AdminCard>
    </>
  );
}
*/

// ── Users ────────────────────────────────────────────────────────
function AdminUsers() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const userProfile = loadUserProfile();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Lazy query for users - only refresh on demand
  const { 
    data: users,
    isLoading: usersLoading,
    refresh: refreshUsers,
    lastRefreshTime: usersRefreshTime,
    isPaused: usersPaused,
  } = useLazyQuery(
    api.users.listAll,
    userProfile?.deviceId ? { deviceId: userProfile.deviceId } : "skip"
  );

  // Debug logging for production troubleshooting
  useEffect(() => {
    console.log('[AdminUsers] Query states:', {
      users: users === undefined ? 'loading' : users === null ? 'null' : `loaded (${users?.length ?? 0})`,
    });
  }, [users]);

  // Loading state
  if (usersLoading || users === undefined) {
    return <AdminLoadingSkeleton />;
  }
  
  // Handle null response
  if (users === null) {
    console.error('[AdminUsers] users query returned null - possible Convex issue');
    return (
      <QueryErrorDisplay 
        error="users data query returned no data. check convex connection." 
        queryName="users"
        onRetry={() => window.location.reload()}
      />
    );
  }

  const filteredUsers = (() => {
    if (!searchQuery) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.product.toLowerCase().includes(query) ||
      user.deviceId.toLowerCase().includes(query)
    );
  })();

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <div className="flex justify-between items-center mb-4">
        <PageHeader title="Users" description="Registered user profiles (device-based)" />
        <AdminRefreshControls
          lastRefresh={usersRefreshTime}
          isLoading={usersLoading}
          isPaused={usersPaused}
          onRefresh={refreshUsers}
          label="users"
        />
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          id="user-search"
          name="user-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          aria-label="search users"
          className="rounded-lg px-3 outline-none"
          style={{
            height: '28px',
            width: '200px',
            fontSize: '12px',
            backgroundColor: theme.background.ghost,
            color: theme.text.high,
            border: `1px solid ${theme.stroke.low}`,
          }}
        />
      </div>

      {/* Users Table */}
      <AdminCard className="p-4">
        <AdminTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'product', label: 'Product' },
            { key: 'deviceId', label: 'Device ID' },
            { key: 'lastSeen', label: 'Last seen' },
          ]}
          isEmpty={filteredUsers.length === 0}
          emptyMessage={searchQuery ? 'No users match your search.' : 'No users registered yet.'}
        >
          {filteredUsers.map((user) => (
            <AdminTableRow key={user._id}>
              <AdminTableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                    style={{
                      backgroundColor: theme.accent,
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  >
                    {(user.name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', color: theme.text.high }}>
                    {user.name || 'Unknown'}
                  </span>
                </div>
              </AdminTableCell>
              <AdminTableCell>
                <FeedbackBadge type={user.role || 'unknown'} />
              </AdminTableCell>
              <AdminTableCell>{user.product || '—'}</AdminTableCell>
              <AdminTableCell>
                <span className="font-mono" style={{ fontSize: '11px', color: theme.text.low }}>
                  {user.deviceId ? `${user.deviceId.slice(0, 20)}...` : '—'}
                </span>
              </AdminTableCell>
              <AdminTableCell className="whitespace-nowrap">
                <span style={{ color: theme.text.low, fontSize: '12px' }}>
                  {user.lastSeenAt ? formatRelativeTime(user.lastSeenAt) : '—'}
                </span>
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </AdminTable>
      </AdminCard>
    </>
  );
}

// ── System Config ────────────────────────────────────────────────
function AdminConfig() {
  const theme = useThemeColors();

  const featureFlagsList = [
    { key: 'VITE_ENABLE_CONVEX_SYNC', label: 'Convex Sync', value: import.meta.env.VITE_ENABLE_CONVEX_SYNC === 'true' },
    { key: 'VITE_ENABLE_PERSONA', label: 'Persona Engine', value: import.meta.env.VITE_ENABLE_PERSONA === 'true' },
    { key: 'VITE_ENABLE_KNOWLEDGE_BASE', label: 'Knowledge Base', value: import.meta.env.VITE_ENABLE_KNOWLEDGE_BASE === 'true' },
    { key: 'VITE_ENABLE_LEARNING', label: 'Learning Engine', value: import.meta.env.VITE_ENABLE_LEARNING === 'true' },
    { key: 'RAG_ALWAYS_ON', label: 'RAG (Vector Search)', value: true }, // Always enabled
  ];

  const envInfo = [
    { label: 'Convex URL', value: import.meta.env.VITE_CONVEX_URL || 'Not configured' },
    { label: 'Default LLM', value: import.meta.env.VITE_DEFAULT_LLM_PROVIDER || 'qwen-text' },
    { label: 'HuggingFace Model', value: import.meta.env.VITE_HUGGINGFACE_MODEL || 'qwen25-7b' },
    { label: 'Fallback Chain', value: import.meta.env.VITE_LLM_FALLBACK_CHAIN || 'qwen-text,huggingface' },
  ];

  return (
    <>
      <PageHeader title="System config" description="Feature flags and environment configuration" />

      {/* Feature Flags */}
      <AdminCard className="p-4 mb-5">
        <CardLabel>Feature Flags</CardLabel>
        <div className="space-y-0">
          {featureFlagsList.map((ff) => (
            <div
              key={ff.key}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: `1px solid ${theme.stroke.low}` }}
            >
              <div>
                <span className="block font-medium" style={{ fontSize: '13px', color: theme.text.high }}>
                  {ff.label}
                </span>
                <span className="block font-mono" style={{ fontSize: '11px', color: theme.text.low }}>
                  {ff.key}
                </span>
              </div>
              <Badge variant={ff.value ? 'positive' : 'neutral'}>
                {ff.value ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          ))}
        </div>
        <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
          Feature flags are set via environment variables. Change them in <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '10px' }}>.env</code> and restart the dev server.
        </span>
      </AdminCard>

      {/* Environment Info */}
      <AdminCard className="p-4">
        <CardLabel>Environment</CardLabel>
        <div className="grid grid-cols-[140px_1fr] gap-y-1.5 gap-x-3" style={{ fontSize: '13px' }}>
          {envInfo.map((info) => (
            <div key={info.label} className="contents">
              <span style={{ color: theme.text.low }}>{info.label}</span>
              <span className="font-mono" style={{ color: theme.text.high, fontSize: '12px' }}>
                {info.value}
              </span>
            </div>
          ))}
        </div>
      </AdminCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ═══════════════════════════════════════════════════════════════════

interface AdminLayoutProps {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

export default function AdminLayout({ colorMode, onColorModeChange }: AdminLayoutProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const theme = useThemeColors();
  
  // User profile state for the user menu
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => loadUserProfile());
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Handle profile save from OnboardingModal
  const handleProfileSave = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    setShowEditProfile(false);
  }, []);
  
  // Handle settings open (navigate to System Config section)
  const handleSettingsOpen = useCallback(() => {
    setActiveSection('config');
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <AdminDashboard />;
      case 'learning': return <AdminLearningCenter />;
      case 'knowledge': return <AdminKnowledge />;
      case 'tokens': return <TokensDisplay />;
      // ARCHIVED: Usage analytics temporarily disabled to reduce query load
      // case 'usage': return <AdminUsageAnalytics />;
      case 'users': return <AdminUsers />;
      case 'config': return <AdminConfig />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Left Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userName={userProfile?.name}
        userRole={userProfile?.role}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        onEditProfile={() => setShowEditProfile(true)}
        onSettingsOpen={handleSettingsOpen}
        onNavigateToHowItWorks={() => { window.location.href = '/how-it-works'; }}
      />

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          {renderContent()}
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <OnboardingModal
          isOpen={showEditProfile}
          onComplete={handleProfileSave}
          initialProfile={userProfile || undefined}
          isEditMode={true}
        />
      )}
    </div>
  );
}
