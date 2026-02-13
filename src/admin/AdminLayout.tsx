import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useThemeColors } from '../theme/useColors';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { AdminSidebar, type AdminSection } from './components/AdminSidebar';
import { AdminStatCard } from './components/AdminStatCard';
import { AdminTable, AdminTableRow, AdminTableCell } from './components/AdminTable';
import { KPICard } from './components/KPICard';
import { TimeRangeSelector, getTimestampForRange, type TimeRange } from './components/TimeRangeSelector';
import { ChartContainer, HorizontalBarChart, VerticalBars, StatBreakdown, SentimentBar } from './components/AnalyticsCharts';
import { KPI_DESCRIPTIONS } from './constants/kpiDescriptions';
import { formatDuration, formatRelativeTime } from './utils/formatters';
import { getApiBaseUrl } from '../config/providers';
import { KnowledgeItemEditor, DeleteConfirmModal } from './components/KnowledgeCRUD';
import { CorrectionApprovalList } from './components/CorrectionApproval';
import type { Id } from '../../convex/_generated/dataModel';

// ── Admin Auth Gate ──────────────────────────────────────────────
const SESSION_TOKEN_KEY = 'voicelab_admin_token';

/**
 * Server-side admin authentication with dev mode fallback
 */
async function authenticateAdmin(passphrase: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const apiBase = getApiBaseUrl();
    console.log('[Admin Auth] Attempting login to:', `${apiBase}/api/admin/auth`);
    
    const response = await fetch(`${apiBase}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', passphrase }),
    });
    
    console.log('[Admin Auth] Response status:', response.status);
    const data = await response.json();
    console.log('[Admin Auth] Response data:', { success: data.success, hasToken: !!data.token, error: data.error });
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Authentication failed' };
    }
    
    return { success: true, token: data.token };
  } catch (error) {
    console.error('[Admin Auth] Server auth failed:', error);
    
    // Dev mode fallback: if API is unreachable and we're in dev mode, use client-side check
    if (import.meta.env.DEV) {
      const devPassphrase = import.meta.env.VITE_ADMIN_PASSPHRASE || 'voicelab-admin';
      if (passphrase === devPassphrase) {
        console.warn('[Admin Auth] Using dev mode fallback (client-side auth)');
        // Generate a pseudo-token for dev mode
        const devToken = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return { success: true, token: devToken };
      }
      return { success: false, error: 'Invalid passphrase (dev mode)' };
    }
    
    return { success: false, error: 'Network error. Please try again.' };
  }
}

async function verifyAdminToken(token: string): Promise<boolean> {
  // Dev mode tokens are always valid (they start with 'dev_')
  if (import.meta.env.DEV && token.startsWith('dev_')) {
    return true;
  }
  
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', token }),
    });
    
    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.warn('[AdminAuth] Token verification failed:', error);
    return false;
  }
}

async function logoutAdmin(token: string): Promise<void> {
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout', token }),
    });
  } catch (error) {
    // Log but don't block logout
    console.warn('[AdminAuth] Logout request failed:', error);
  }
}

function AdminAuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const theme = useThemeColors();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const result = await authenticateAdmin(passphrase);
    
    if (result.success && result.token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, result.token);
      onAuthenticated();
    } else {
      setError(result.error || 'Authentication failed');
      setPassphrase('');
    }
    
    setIsLoading(false);
  }, [passphrase, onAuthenticated]);

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ backgroundColor: theme.background.ghost }}
    >
      <div
        className="w-full max-w-sm rounded-xl px-6 py-8"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <div className="mb-1">
          <img
            src={theme.isLight ? '/jio-voice-lab-light.svg?v=3' : '/jio-voice-lab-dark.svg?v=3'}
            alt="Jio Voice Lab"
            className="h-7"
          />
        </div>
        <span
          className="block mb-6"
          style={{ color: theme.text.low, fontSize: '13px' }}
        >
          Enter the admin passphrase to continue.
        </span>

        <form onSubmit={handleSubmit}>
          {/* Hidden username field for accessibility (password managers expect this) */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            defaultValue="admin"
            aria-hidden="true"
            style={{ display: 'none' }}
          />
          <input
            id="admin-passphrase"
            name="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
            placeholder="Passphrase"
            autoFocus
            autoComplete="current-password"
            aria-label="Admin passphrase"
            className="w-full rounded-lg px-3 outline-none"
            style={{
              height: '36px',
              fontSize: '13px',
              backgroundColor: theme.background.ghost,
              color: theme.text.high,
              border: `1px solid ${error ? '#ef4444' : theme.stroke.medium}`,
            }}
          />
          {error && (
            <span className="block mt-1" style={{ color: '#ef4444', fontSize: '12px' }}>
              {error}
            </span>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg mt-4 font-medium cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              height: '36px',
              fontSize: '13px',
              backgroundColor: theme.accent,
              color: '#fff',
              border: 'none',
            }}
          >
            {isLoading ? 'Authenticating...' : 'Enter Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Utility: Feedback badge ──────────────────────────────────────
function FeedbackBadge({ type }: { type: string }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    thumbs_up: { bg: 'rgba(34,197,94,0.12)', fg: '#22c55e' },
    thumbs_down: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
    edit: { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6' },
    comment: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
  };
  const c = colorMap[type] || { bg: 'rgba(107,114,128,0.12)', fg: '#6b7280' };
  return (
    <span
      className="inline-block rounded-full font-medium whitespace-nowrap"
      style={{
        fontSize: '11px',
        padding: '1px 8px',
        backgroundColor: c.bg,
        color: c.fg,
      }}
    >
      {type.replace('_', ' ')}
    </span>
  );
}

// ── Utility: Section Header ──────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useThemeColors();
  return (
    <div className="mb-5">
      <h2
        className="font-semibold"
        style={{ color: theme.text.high, fontSize: '16px', letterSpacing: '-0.3px', margin: 0 }}
      >
        {title}
      </h2>
      <span
        className="block mt-0.5"
        style={{ color: theme.text.low, fontSize: '12px' }}
      >
        {subtitle}
      </span>
    </div>
  );
}

// ── Utility: Card wrapper ────────────────────────────────────────
function AdminCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const theme = useThemeColors();
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        border: `1px solid ${theme.stroke.low}`,
        backgroundColor: 'transparent',
      }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  const theme = useThemeColors();
  return (
    <span
      className="block font-medium mb-3"
      style={{ color: theme.text.low, fontSize: '11px' }}
    >
      {children}
    </span>
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
      style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
    >
      <span style={{ color: '#f59e0b', fontSize: '13px' }}>
        you are offline. showing cached data.
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
        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
        border: '1px solid rgba(239, 68, 68, 0.3)' 
      }}
    >
      <div className="flex items-start gap-3">
        <span style={{ color: '#ef4444', fontSize: '20px' }}>⚠</span>
        <div className="flex-1">
          <p className="font-medium" style={{ color: '#ef4444', fontSize: '14px' }}>
            failed to load {queryName}
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
              retry
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
  
  // Direct Convex queries
  const dashboardStats = useQuery(api.analytics.dashboardStats, { since });
  const learningStats = useQuery(api.corrections.getLearningStats, { since });
  const hourlyBreakdown = useQuery(api.analytics.hourlyBreakdown, { since });
  const recentSessions = useQuery(api.sessions.getRecent, { limit: 5 });
  
  // Format hourly data for charts
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
  
  // Loading state - show skeleton while data is loading
  if (dashboardStats === undefined || learningStats === undefined) {
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
      <SectionHeader title="dashboard" subtitle="system health and value delivery — last 24 hours" />

      {/* Hero KPIs - 4 cards, most important metrics for POC */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPICard 
          label="total generations" 
          value={dashboardStats.totalGenerations}
          description={KPI_DESCRIPTIONS.totalGenerations.description}
          colorClass="text-orange-500"
        />
        <KPICard 
          label="avg trust score" 
          value={dashboardStats.avgTrustScore}
          description={KPI_DESCRIPTIONS.avgTrustScore.description}
          target={KPI_DESCRIPTIONS.avgTrustScore.target}
          colorClass="text-blue-500"
        />
        <KPICard 
          label="content copied" 
          value={dashboardStats.copyCount}
          description={KPI_DESCRIPTIONS.copyCount.description}
          colorClass="text-purple-500"
        />
        <KPICard 
          label="learnings applied" 
          value={learningStats.totalPatternsApplied}
          description={KPI_DESCRIPTIONS.learningsApplied.description}
          colorClass="text-green-500"
        />
      </div>

      {/* Quality & Engagement Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Sentiment Widget */}
        <AdminCard className="p-4">
          <CardLabel>feedback sentiment</CardLabel>
          <SentimentBar 
            likes={dashboardStats.likeCount}
            dislikes={dashboardStats.dislikeCount}
          />
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.stroke.low}` }}>
            <span className="text-xs" style={{ color: theme.text.low }}>
              {dashboardStats.sentimentRatio !== null ? `${dashboardStats.sentimentRatio}% positive feedback` : 'no feedback yet'}
            </span>
          </div>
        </AdminCard>

        {/* Quality Metrics */}
        <AdminCard className="p-4">
          <CardLabel>content quality</CardLabel>
          <StatBreakdown
            items={[
              { 
                label: 'regeneration rate', 
                value: `${dashboardStats.regenerationRate}%`, 
                color: dashboardStats.regenerationRate > 15 ? '#ef4444' : '#22c55e' 
              },
              { 
                label: 'completion rate', 
                value: `${completionRate}%`,
                color: '#3b82f6' 
              },
            ]}
          />
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${theme.stroke.low}` }}>
            <div className="flex justify-between text-xs" style={{ color: theme.text.low }}>
              <span>regenerations: {dashboardStats.regenerationCount}</span>
              <span>errors: {dashboardStats.errorCount}</span>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Hourly Activity Chart */}
      <ChartContainer
        title="hourly activity"
        subtitle="content generations over time"
        empty={hourlyChartData.every(d => d.value === 0)}
        emptyMessage="no activity in selected time range"
        className="mb-5"
      >
        <VerticalBars data={hourlyChartData} height={140} />
      </ChartContainer>

      {/* Recent Sessions (collapsed view) */}
      {recentSessions && recentSessions.length > 0 && (
        <AdminCard className="p-4">
          <CardLabel>recent sessions</CardLabel>
          <AdminTable
            columns={[
              { key: 'project', label: 'project' },
              { key: 'status', label: 'status' },
              { key: 'messages', label: 'messages' },
              { key: 'duration', label: 'duration' },
              { key: 'time', label: 'started' },
            ]}
            isEmpty={recentSessions.length === 0}
            emptyMessage="no sessions yet"
          >
            {recentSessions.map((session) => (
              <AdminTableRow key={session._id}>
                <AdminTableCell>{session.projectName}</AdminTableCell>
                <AdminTableCell>
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: session.status === 'active' 
                        ? 'rgba(34,197,94,0.12)' 
                        : session.status === 'completed'
                          ? 'rgba(59,130,246,0.12)'
                          : 'rgba(245,158,11,0.12)',
                      color: session.status === 'active' 
                        ? '#22c55e' 
                        : session.status === 'completed'
                          ? '#3b82f6'
                          : '#f59e0b',
                    }}
                  >
                    {session.status}
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
            <span className="block text-xs font-medium mb-1" style={{ color: '#ef4444' }}>
              before (ai generated):
            </span>
            <p className="text-sm p-2 rounded" style={{ 
              backgroundColor: 'rgba(239,68,68,0.08)', 
              color: theme.text.high,
              textDecoration: 'line-through',
              opacity: 0.7,
            }}>
              {original}
            </p>
          </div>
          <div>
            <span className="block text-xs font-medium mb-1" style={{ color: '#22c55e' }}>
              after (user edited):
            </span>
            <p className="text-sm p-2 rounded" style={{ 
              backgroundColor: 'rgba(34,197,94,0.08)', 
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
  
  // Direct Convex queries
  const corrections = useQuery(api.corrections.listAll, { limit: 200 });
  const learningStats = useQuery(api.corrections.getLearningStats, {});
  const feedbackCounts = useQuery(api.corrections.countByFeedbackType, {});
  
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debug logging for production troubleshooting
  useEffect(() => {
    console.log('[AdminLearningCenter] Query states:', {
      corrections: corrections === undefined ? 'loading' : corrections === null ? 'null' : `loaded (${corrections?.length ?? 0})`,
      learningStats: learningStats === undefined ? 'loading' : learningStats === null ? 'null' : 'loaded',
      feedbackCounts: feedbackCounts === undefined ? 'loading' : feedbackCounts === null ? 'null' : 'loaded',
    });
  }, [corrections, learningStats, feedbackCounts]);

  // Loading state
  if (corrections === undefined || learningStats === undefined) {
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

  // Filter corrections for the table
  const filtered = filter === 'all' 
    ? corrections 
    : corrections.filter(c => c.feedbackType === filter);

  // Get edit corrections for the diff view
  const editCorrections = corrections.filter(c => c.feedbackType === 'edit' && c.editedContent);

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <SectionHeader 
        title="learning center" 
        subtitle="how user feedback improves content generation" 
      />

      {/* Learning Stats Hero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPICard 
          label="learnings applied" 
          value={learningStats.totalPatternsApplied}
          description={KPI_DESCRIPTIONS.learningsApplied.description}
          colorClass="text-green-500"
        />
        <KPICard 
          label="edit corrections" 
          value={learningStats.byFeedbackType.edits}
          description={KPI_DESCRIPTIONS.editCorrections.description}
          colorClass="text-blue-500"
        />
        <KPICard 
          label="avoid patterns" 
          value={learningStats.uniqueAvoidPatterns}
          description={KPI_DESCRIPTIONS.avoidPatterns.description}
          colorClass="text-red-500"
        />
        <KPICard 
          label="total feedback" 
          value={corrections.length}
          description={KPI_DESCRIPTIONS.totalFeedback.description}
          colorClass="text-purple-500"
        />
      </div>

      {/* Feedback Distribution */}
      <AdminCard className="p-4 mb-5">
        <CardLabel>feedback distribution</CardLabel>
        <div className="grid grid-cols-4 gap-4">
          {['thumbs_up', 'thumbs_down', 'edit', 'comment'].map(type => (
            <div 
              key={type}
              className="text-center p-3 rounded-lg cursor-pointer transition-all"
              style={{ 
                backgroundColor: filter === type ? theme.accent : theme.background.ghost,
                opacity: filter === type ? 1 : 0.7,
              }}
              onClick={() => setFilter(filter === type ? 'all' : type)}
            >
              <span 
                className="block text-2xl font-bold" 
                style={{ color: filter === type ? '#fff' : theme.text.high }}
              >
                {feedbackCounts?.[type] ?? 0}
              </span>
              <span 
                className="text-xs" 
                style={{ color: filter === type ? '#fff' : theme.text.low }}
              >
                {type.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Before/After Comparison View */}
      <AdminCard className="p-4 mb-5">
        <CardLabel>recent edit corrections (before → after)</CardLabel>
        {editCorrections.length > 0 ? (
          editCorrections.slice(0, 5).map((c, i) => (
            <CorrectionDiff 
              key={c._id?.toString() || i}
              original={c.originalContent}
              edited={c.editedContent!}
              ecosystem={(c as Record<string, unknown>).ecosystem as string || 'unknown'}
              channel={(c as Record<string, unknown>).channel as string || 'unknown'}
              timestamp={c.timestamp}
              expanded={expandedId === (c._id?.toString() || String(i))}
              onToggle={() => setExpandedId(
                expandedId === (c._id?.toString() || String(i)) 
                  ? null 
                  : (c._id?.toString() || String(i))
              )}
            />
          ))
        ) : (
          <span style={{ color: theme.text.low, fontSize: '13px' }}>
            no edit corrections yet. users can edit AI responses to teach better outputs.
          </span>
        )}
      </AdminCard>

      {/* Top Avoid Patterns */}
      {learningStats.topAvoidReasons.length > 0 && (
        <AdminCard className="p-4 mb-5">
          <CardLabel>top patterns to avoid (from negative feedback)</CardLabel>
          <div className="flex flex-wrap gap-2">
            {learningStats.topAvoidReasons.map((reason, i) => (
              <span
                key={i}
                className="inline-block rounded-md px-2 py-1"
                style={{
                  fontSize: '12px',
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  color: '#ef4444',
                }}
              >
                {reason}
              </span>
            ))}
          </div>
        </AdminCard>
      )}

      {/* Full Feedback Table */}
      <AdminCard className="p-4 mb-5">
        <CardLabel>
          {filter === 'all' ? 'all feedback' : `${filter.replace('_', ' ')} feedback`} 
          {' '}({filtered.length} items)
        </CardLabel>
        <AdminTable
          columns={[
            { key: 'type', label: 'type' },
            { key: 'original', label: 'original content' },
            { key: 'edited', label: 'edited / comment' },
            { key: 'eco', label: 'ecosystem' },
            { key: 'channel', label: 'channel' },
            { key: 'time', label: 'time' },
          ]}
          isEmpty={filtered.length === 0}
          emptyMessage="no feedback recorded yet."
        >
          {filtered.slice(0, 50).map((c, i) => {
            const idStr = c._id?.toString() || String(i);
            
            return (
              <AdminTableRow key={idStr}>
                <AdminTableCell><FeedbackBadge type={c.feedbackType} /></AdminTableCell>
                <AdminTableCell className="max-w-[200px] truncate">{(c.originalContent || '').slice(0, 100)}</AdminTableCell>
                <AdminTableCell className="max-w-[200px] truncate">{c.editedContent || c.comment || '—'}</AdminTableCell>
                <AdminTableCell>{(c as Record<string, unknown>).ecosystem as string || '—'}</AdminTableCell>
                <AdminTableCell>{(c as Record<string, unknown>).channel as string || '—'}</AdminTableCell>
                <AdminTableCell className="whitespace-nowrap">
                  <span style={{ color: theme.text.low, fontSize: '12px' }}>
                    {formatRelativeTime(c.timestamp)}
                  </span>
                </AdminTableCell>
              </AdminTableRow>
            );
          })}
        </AdminTable>
        {filtered.length > 50 && (
          <span className="block mt-2" style={{ color: theme.text.low, fontSize: '12px' }}>
            showing 50 of {filtered.length} items.
          </span>
        )}
      </AdminCard>

      {/* Correction Approval Section */}
      <AdminCard className="p-4">
        <CardLabel>correction approval queue</CardLabel>
        <p className="text-xs mb-4" style={{ color: theme.text.low }}>
          review and approve/reject user feedback to control what the system learns from.
        </p>
        <CorrectionApprovalList />
      </AdminCard>
    </>
  );
}

// ── Knowledge Base ───────────────────────────────────────────────
// Updated for POC: High-priority rules first, total counter, RAG status, CRUD UI
function AdminKnowledge() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(30);
  
  // CRUD state
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<{ _id: Id<"knowledgeItems">; type: string; category: string; content: string; metadata: Record<string, string | undefined>; tags: string[]; isActive: boolean } | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"knowledgeItems">; content: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Mutations for CRUD
  const softDeleteItem = useMutation(api.knowledge.softDelete);
  
  // Direct Convex queries - no localStorage fallback
  const knowledgeCounts = useQuery(api.knowledge.countByType);
  // Fetch more items when a type is selected (up to 500 for viewing)
  const knowledgeItems = useQuery(api.knowledge.listAll, selectedType ? { type: selectedType, limit: 500 } : { limit: 50 });
  
  // Debug logging for production troubleshooting
  useEffect(() => {
    console.log('[AdminKnowledge] Query states:', {
      knowledgeCounts: knowledgeCounts === undefined ? 'loading' : knowledgeCounts === null ? 'null' : 'loaded',
      knowledgeItems: knowledgeItems === undefined ? 'loading' : knowledgeItems === null ? 'null' : `loaded (${knowledgeItems?.length ?? 0})`,
      selectedType,
    });
  }, [knowledgeCounts, knowledgeItems, selectedType]);
  
  // Calculate total active rules - moved BEFORE early return to avoid conditional hook
  const totalActiveRules = useMemo(() => {
    if (!knowledgeCounts) return 0;
    return Object.values(knowledgeCounts).reduce(
      (sum, counts) => sum + (counts.active || 0), 0
    );
  }, [knowledgeCounts]);

  // Reordered knowledge types - high priority first for POC demo
  const knowledgeTypes = useMemo(() => {
    const getCount = (type: string): string => {
      if (knowledgeCounts?.[type]) {
        return `${knowledgeCounts[type].active}/${knowledgeCounts[type].total}`;
      }
      return '—';
    };
    
    // Reordered: high-priority types first (avoid, auto-fix, examples)
    return [
      { type: 'avoid_word', label: 'avoid words', count: getCount('avoid_word'), colorClass: 'text-red-500', priority: 'high' },
      { type: 'auto_fix', label: 'auto-fix rules', count: getCount('auto_fix'), colorClass: 'text-blue-500', priority: 'high' },
      { type: 'approved_example', label: 'approved examples', count: getCount('approved_example'), colorClass: 'text-cyan-500', priority: 'high' },
      { type: 'preferred_word', label: 'preferred vocab', count: getCount('preferred_word'), colorClass: 'text-green-500', priority: 'medium' },
      { type: 'product_definition', label: 'product defs', count: getCount('product_definition'), colorClass: 'text-purple-500', priority: 'low' },
      { type: 'festival', label: 'festivals', count: getCount('festival'), colorClass: 'text-yellow-500', priority: 'low' },
    ];
  }, [knowledgeCounts]);

  // Loading state - after all hooks
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

  const handleCardClick = (type: string) => {
    setSelectedType(prev => prev === type ? null : type);
    setDisplayLimit(30); // Reset display limit when switching types
  };
  
  // CRUD handlers
  const handleAddNew = () => {
    setEditingItem(undefined);
    setShowEditor(true);
  };
  
  const handleEdit = (item: typeof editingItem) => {
    setEditingItem(item);
    setShowEditor(true);
  };
  
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await softDeleteItem({ id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Get total count for selected type from knowledgeCounts
  const getTotalCount = (type: string): number => {
    return knowledgeCounts?.[type]?.active || 0;
  };

  // Get items for selected type from Convex (with full data for CRUD)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getFullItemsForType = (type: string): any[] => {
    if (knowledgeItems && knowledgeItems.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return knowledgeItems.filter((item: any) => item.type === type && item.isActive);
    }
    return [];
  };

  // Get items for selected type from Convex
  const getItemsForType = (type: string): Array<{ content: string; metadata?: Record<string, unknown> }> => {
    if (knowledgeItems && knowledgeItems.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = knowledgeItems.filter((item: any) => item.type === type && item.isActive);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return filtered.map((item: any) => ({
        content: item.content,
        metadata: item.metadata as Record<string, unknown>,
      }));
    }
    return [];
  };

  const renderDetailPanel = () => {
    if (!selectedType) return null;

    // Show loading state when items are loading for selected type
    if (knowledgeItems === undefined) {
      return (
        <AdminCard className="p-4 mt-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 rounded w-1/4" style={{ backgroundColor: theme.stroke.low }} />
            <div className="h-20 rounded" style={{ backgroundColor: theme.stroke.low }} />
          </div>
        </AdminCard>
      );
    }

    const items = getItemsForType(selectedType);

    switch (selectedType) {
      case 'avoid_word': {
        const totalCount = getTotalCount('avoid_word');
        const displayedItems = items.slice(0, displayLimit);
        const hasMore = items.length > displayLimit || totalCount > items.length;
        
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>avoid words ({totalCount} total)</CardLabel>
            <div className="flex flex-wrap gap-2">
              {displayedItems.map((item, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md px-2 py-1"
                  style={{
                    fontSize: '12px',
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    color: '#ef4444',
                  }}
                >
                  {item.content}
                </span>
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 flex items-center gap-3">
                <span style={{ color: theme.text.low, fontSize: '11px' }}>
                  showing {displayedItems.length} of {totalCount}
                </span>
                {items.length > displayLimit && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ 
                      backgroundColor: theme.accent, 
                      color: '#fff',
                    }}
                  >
                    load more
                  </button>
                )}
              </div>
            )}
            {items.length === 0 && (
              <span style={{ color: theme.text.low, fontSize: '13px' }}>no avoid words configured yet.</span>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              these words trigger warnings in the content editor.
            </span>
          </AdminCard>
        );
      }

      case 'preferred_word': {
        const totalCount = getTotalCount('preferred_word');
        const displayedItems = items.slice(0, displayLimit);
        const hasMore = items.length > displayLimit || totalCount > items.length;
        
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>preferred vocabulary ({totalCount} total)</CardLabel>
            <div className="flex flex-wrap gap-2">
              {displayedItems.map((item, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md px-2 py-1"
                  style={{
                    fontSize: '12px',
                    backgroundColor: 'rgba(34,197,94,0.12)',
                    color: '#22c55e',
                  }}
                >
                  {item.content}
                </span>
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 flex items-center gap-3">
                <span style={{ color: theme.text.low, fontSize: '11px' }}>
                  showing {displayedItems.length} of {totalCount}
                </span>
                {items.length > displayLimit && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ 
                      backgroundColor: theme.accent, 
                      color: '#fff',
                    }}
                  >
                    load more
                  </button>
                )}
              </div>
            )}
            {items.length === 0 && (
              <span style={{ color: theme.text.low, fontSize: '13px' }}>no preferred words configured yet.</span>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              these are recommended alternatives suggested by the content editor.
            </span>
          </AdminCard>
        );
      }

      case 'auto_fix': {
        const totalCount = getTotalCount('auto_fix');
        const displayedItems = items.slice(0, displayLimit);
        const hasMore = items.length > displayLimit || totalCount > items.length;
        
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>auto-fix rules ({totalCount} total)</CardLabel>
            <AdminTable
              columns={[
                { key: 'from', label: 'original' },
                { key: 'to', label: 'replacement' },
              ]}
              isEmpty={items.length === 0}
              emptyMessage="no auto-fix rules configured."
            >
              {displayedItems.map((item, i) => (
                <AdminTableRow key={i}>
                  <AdminTableCell>
                    <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '12px' }}>
                      {item.content}
                    </code>
                  </AdminTableCell>
                  <AdminTableCell>
                    <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '12px' }}>
                      {(item.metadata?.suggestion as string) || '—'}
                    </code>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTable>
            {hasMore && (
              <div className="mt-3 flex items-center gap-3">
                <span style={{ color: theme.text.low, fontSize: '11px' }}>
                  showing {displayedItems.length} of {totalCount}
                </span>
                {items.length > displayLimit && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ 
                      backgroundColor: theme.accent, 
                      color: '#fff',
                    }}
                  >
                    load more
                  </button>
                )}
              </div>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              these rules automatically correct common typos and formatting issues.
            </span>
          </AdminCard>
        );
      }

      case 'product_definition': {
        const totalCount = getTotalCount('product_definition');
        const displayedItems = items.slice(0, displayLimit);
        const hasMore = items.length > displayLimit || totalCount > items.length;
        
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>product definitions ({totalCount} total)</CardLabel>
            <AdminTable
              columns={[
                { key: 'name', label: 'product' },
                { key: 'def', label: 'definition' },
              ]}
              isEmpty={items.length === 0}
              emptyMessage="no product definitions configured."
            >
              {displayedItems.map((item, i) => (
                <AdminTableRow key={i}>
                  <AdminTableCell>
                    <span className="font-semibold" style={{ color: theme.text.high }}>
                      {item.content}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>{(item.metadata?.definition as string) || '—'}</AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTable>
            {hasMore && (
              <div className="mt-3 flex items-center gap-3">
                <span style={{ color: theme.text.low, fontSize: '11px' }}>
                  showing {displayedItems.length} of {totalCount}
                </span>
                {items.length > displayLimit && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ 
                      backgroundColor: theme.accent, 
                      color: '#fff',
                    }}
                  >
                    load more
                  </button>
                )}
              </div>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              official product definitions used for consistent messaging.
            </span>
          </AdminCard>
        );
      }

      case 'festival': {
        const totalCount = getTotalCount('festival');
        const displayedItems = items.slice(0, displayLimit);
        const hasMore = items.length > displayLimit || totalCount > items.length;
        
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>festivals ({totalCount} total)</CardLabel>
            <div className="flex flex-wrap gap-2">
              {displayedItems.map((item, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md px-2 py-1"
                  style={{
                    fontSize: '12px',
                    backgroundColor: 'rgba(245,158,11,0.12)',
                    color: '#f59e0b',
                  }}
                >
                  {item.content}
                </span>
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 flex items-center gap-3">
                <span style={{ color: theme.text.low, fontSize: '11px' }}>
                  showing {displayedItems.length} of {totalCount}
                </span>
                {items.length > displayLimit && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ 
                      backgroundColor: theme.accent, 
                      color: '#fff',
                    }}
                  >
                    load more
                  </button>
                )}
              </div>
            )}
            {items.length === 0 && (
              <span style={{ color: theme.text.low, fontSize: '13px' }}>no festivals configured yet.</span>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              festival dates and cultural context for content planning.
            </span>
          </AdminCard>
        );
      }

      case 'approved_example': {
        const totalCount = getTotalCount('approved_example');
        const displayedItems = items.slice(0, displayLimit);
        const hasMore = items.length > displayLimit || totalCount > items.length;
        
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>approved examples ({totalCount} total)</CardLabel>
            <AdminTable
              columns={[
                { key: 'content', label: 'content' },
                { key: 'eco', label: 'ecosystem' },
                { key: 'ch', label: 'channel' },
              ]}
              isEmpty={items.length === 0}
              emptyMessage="no examples saved yet. users can save via the bookmark icon."
            >
              {displayedItems.map((ex, i) => (
                <AdminTableRow key={i}>
                  <AdminTableCell className="max-w-md truncate">
                    {ex.content.slice(0, 120)}
                  </AdminTableCell>
                  <AdminTableCell>
                    {(ex.metadata?.ecosystem as string) || '—'}
                  </AdminTableCell>
                  <AdminTableCell>
                    {(ex.metadata?.channel as string) || '—'}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTable>
            {hasMore && (
              <div className="mt-3 flex items-center gap-3">
                <span style={{ color: theme.text.low, fontSize: '11px' }}>
                  showing {displayedItems.length} of {totalCount}
                </span>
                {items.length > displayLimit && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ 
                      backgroundColor: theme.accent, 
                      color: '#fff',
                    }}
                  >
                    load more
                  </button>
                )}
              </div>
            )}
          </AdminCard>
        );
      }

      default:
        return null;
    }
  };

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <SectionHeader title="knowledge base" subtitle="brand rules, vocabulary, and content guidelines" />

      {/* Total Rules Counter with RAG Status + Add Button */}
      <AdminCard className="p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-3xl font-bold" style={{ color: theme.accent }}>
              {totalActiveRules}
            </span>
            <span className="ml-2 text-sm" style={{ color: theme.text.low }}>
              active rules enforcing Jio brand guidelines
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="block text-xs" style={{ color: theme.text.low }}>
                semantic search enabled (RAG)
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
                backgroundColor: 'rgba(34,197,94,0.12)', 
                color: '#22c55e' 
              }}>
                vector index active
              </span>
            </div>
            {selectedType && (
              <button
                onClick={handleAddNew}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                style={{
                  backgroundColor: theme.accent,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                + add {selectedType.replace('_', ' ')}
              </button>
            )}
          </div>
        </div>
      </AdminCard>

      {/* Type Overview - Reordered with high-priority first */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
        {knowledgeTypes.map((kt) => (
          <AdminStatCard
            key={kt.type}
            label={kt.label}
            value={kt.count}
            colorClass={kt.colorClass}
            onClick={() => handleCardClick(kt.type)}
            isSelected={selectedType === kt.type}
          />
        ))}
      </div>

      {/* Detail Panel */}
      {renderDetailPanel()}

      {/* Info - only show when no detail panel is open */}
      {!selectedType && (
        <AdminCard className="p-4 mb-5">
          <span className="block font-medium mb-2" style={{ color: theme.text.high, fontSize: '13px' }}>
            how to manage knowledge
          </span>
          <ul className="space-y-1 pl-4" style={{ fontSize: '12px', color: theme.text.medium, listStyleType: 'disc' }}>
            <li><strong>add items:</strong> select a category above, then click "+ add" to create new rules</li>
            <li><strong>seed data:</strong> run <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>npx convex run seed:seedAll</code></li>
            <li><strong>embeddings:</strong> run <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>npx convex run embeddings:backfillEmbeddings</code></li>
            <li><strong>vocab rules</strong> are managed here -- no code deploy needed</li>
          </ul>
        </AdminCard>
      )}

      {/* CRUD Modals */}
      {showEditor && selectedType && (
        <KnowledgeItemEditor
          selectedType={selectedType}
          onClose={() => { setShowEditor(false); setEditingItem(undefined); }}
          existingItem={editingItem}
        />
      )}
      
      {deleteTarget && (
        <DeleteConfirmModal
          itemContent={deleteTarget.content}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}

// ── Usage Analytics (simplified from Analytics) ─────────────────────
// Purpose: Show adoption across Jio ecosystem for POC demo
function AdminUsageAnalytics() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const since = useMemo(() => getTimestampForRange(timeRange), [timeRange]);
  
  // Direct Convex queries
  const contextStats = useQuery(api.analytics.statsByEcosystemChannel, { since });
  const users = useQuery(api.users.listAll);
  
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
  if (contextStats === undefined) {
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
        <SectionHeader 
          title="usage analytics" 
          subtitle="adoption across Jio ecosystem and content channels" 
        />
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* User Count */}
      <AdminCard className="p-4 mb-5">
        <div className="flex items-center gap-4">
          <span className="text-3xl font-bold" style={{ color: theme.accent }}>
            {users?.length ?? 0}
          </span>
          <span style={{ color: theme.text.low, fontSize: '13px' }}>
            registered users across Jio products
          </span>
        </div>
      </AdminCard>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <ChartContainer
          title="by ecosystem"
          subtitle="content generations per Jio product"
          empty={byEcosystem.length === 0}
          emptyMessage="no ecosystem data available"
        >
          <HorizontalBarChart data={byEcosystem} color="#f97316" />
        </ChartContainer>

        <ChartContainer
          title="by channel"
          subtitle="content generations per channel type"
          empty={byChannel.length === 0}
          emptyMessage="no channel data available"
        >
          <HorizontalBarChart data={byChannel} color="#3b82f6" />
        </ChartContainer>
      </div>

      {/* Context Performance Table */}
      <AdminCard className="p-4">
        <CardLabel>quality by context</CardLabel>
        <AdminTable
          columns={[
            { key: 'ecosystem', label: 'ecosystem' },
            { key: 'channel', label: 'channel' },
            { key: 'count', label: 'generations' },
            { key: 'trustScore', label: 'avg trust score' },
          ]}
          isEmpty={!contextStats || contextStats.length === 0}
          emptyMessage="no usage data in selected time range"
        >
          {contextStats?.slice(0, 15).map((stat, i) => (
            <AdminTableRow key={i}>
              <AdminTableCell>{stat.ecosystem}</AdminTableCell>
              <AdminTableCell>{stat.channel}</AdminTableCell>
              <AdminTableCell>{stat.count}</AdminTableCell>
              <AdminTableCell>
                <span style={{
                  color: (stat.avgTrustScore ?? 0) >= 90 ? '#22c55e' : 
                         (stat.avgTrustScore ?? 0) >= 80 ? '#f59e0b' : '#ef4444',
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

// ── Users ────────────────────────────────────────────────────────
function AdminUsers() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Direct Convex query - no localStorage fallback
  const users = useQuery(api.users.listAll);

  // Debug logging for production troubleshooting
  useEffect(() => {
    console.log('[AdminUsers] Query states:', {
      users: users === undefined ? 'loading' : users === null ? 'null' : `loaded (${users?.length ?? 0})`,
    });
  }, [users]);

  // Loading state
  if (users === undefined) {
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
      <SectionHeader title="Users" subtitle="registered user profiles (device-based)" />

      {/* Search */}
      <div className="mb-4">
        <input
          id="user-search"
          name="user-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="search users..."
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
            { key: 'name', label: 'name' },
            { key: 'role', label: 'role' },
            { key: 'product', label: 'product' },
            { key: 'deviceId', label: 'device id' },
            { key: 'lastSeen', label: 'last seen' },
          ]}
          isEmpty={filteredUsers.length === 0}
          emptyMessage={searchQuery ? 'no users match your search.' : 'no users registered yet.'}
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
                    {user.name || 'unknown'}
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
      <SectionHeader title="System Config" subtitle="Feature flags and environment configuration" />

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
              <span
                className="inline-block rounded-full font-medium"
                style={{
                  fontSize: '11px',
                  padding: '1px 8px',
                  backgroundColor: ff.value ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.12)',
                  color: ff.value ? '#22c55e' : '#6b7280',
                }}
              >
                {ff.value ? 'Enabled' : 'Disabled'}
              </span>
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

export default function AdminLayout() {
  const [authenticated, setAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const theme = useThemeColors();

  // Verify existing token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        const isValid = await verifyAdminToken(token);
        if (isValid) {
          setAuthenticated(true);
        } else {
          // Clear invalid token
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
        }
      }
      setIsVerifying(false);
    };
    verifyToken();
  }, []);

  const handleSignOut = useCallback(async () => {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      await logoutAdmin(token);
    }
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setAuthenticated(false);
  }, []);

  // Show loading while verifying token
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.background.ghost }}>
        <span style={{ color: theme.text.low }}>Verifying session...</span>
      </div>
    );
  }

  if (!authenticated) {
    return <AdminAuthGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <AdminDashboard />;
      case 'learning': return <AdminLearningCenter />;
      case 'knowledge': return <AdminKnowledge />;
      case 'usage': return <AdminUsageAnalytics />;
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
        onSignOut={handleSignOut}
      />

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
