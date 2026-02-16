import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useThemeColors, SEMANTIC_COLORS } from '../theme/useColors';
import { Title, Text, Label, Chip, Divider, Button } from '@marcelinodzn/ds-react';
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
import { KPI_DESCRIPTIONS } from './constants/kpiDescriptions';
import { formatDuration, formatRelativeTime } from './utils/formatters';
import { getApiBaseUrl } from '../config/providers';
import { KnowledgeItemEditor, DeleteConfirmModal } from './components/KnowledgeCRUD';
import { CorrectionApprovalList } from './components/CorrectionApproval';
import { CategorySection, SearchFilterBar, type KnowledgeItem } from './components/CategorySection';
import { TokensDisplay } from './components/TokensDisplay';
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
              border: `1px solid ${error ? SEMANTIC_COLORS.negative : theme.stroke.medium}`,
            }}
          />
          {error && (
            <span className="block mt-1" style={{ color: SEMANTIC_COLORS.negative, fontSize: '12px' }}>
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
  
  // Direct Convex queries
  const dashboardStats = useQuery(api.analytics.dashboardStats, { since });
  const learningStats = useQuery(api.corrections.getLearningStats, { since });
  const hourlyBreakdown = useQuery(api.analytics.hourlyBreakdown, { since });
  const recentSessions = useQuery(api.sessions.getRecent, { limit: 5 });
  
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
      <PageHeader title="Dashboard" description="System health and value delivery — last 24 hours" />

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
          <div className="flex-1">
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
          <div className="flex-1">
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
          <div className="flex-1">
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
          <div className="flex-1">
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
          <div className="flex-1">
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
          <div className="flex-1">
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
  
  // Direct Convex queries
  const corrections = useQuery(api.corrections.listAll, { limit: 200 });
  const learningStats = useQuery(api.corrections.getLearningStats, {});
  const feedbackCounts = useQuery(api.corrections.countByFeedbackType, {});
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>('all');

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

  // Get edit corrections for the diff view
  const editCorrections = corrections.filter(c => c.feedbackType === 'edit' && c.editedContent);

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <PageHeader 
        title="Learning center" 
        description="How user feedback improves content generation" 
      />

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
          <div className="flex-1">
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
          <div className="flex-1">
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
          <div className="flex-1">
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
        
        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
          <Chip
            size="S"
            appearance="neutral"
            isSelected={feedbackTypeFilter === 'all'}
            onPress={() => setFeedbackTypeFilter('all')}
          >
            all
          </Chip>
          <Divider orientation="vertical" />
          {['thumbs_up', 'thumbs_down', 'edit', 'comment'].map(type => (
            <Chip
              key={type}
              size="S"
              appearance="neutral"
              isSelected={feedbackTypeFilter === type}
              onPress={() => setFeedbackTypeFilter(feedbackTypeFilter === type ? 'all' : type)}
            >
              {feedbackCounts?.[type] ?? 0} {type.replace('_', ' ')}
            </Chip>
          ))}
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

// ── Knowledge Base ───────────────────────────────────────────────
// Updated for POC: High-priority rules first, total counter, RAG status, CRUD UI
function AdminKnowledge() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(30);
  
  // Search and filter state for enhanced knowledge display
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
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

  // Group items by category for enhanced display
  const groupedByCategory = useMemo(() => {
    if (!selectedType || !knowledgeItems) return {};
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = knowledgeItems.filter((item: any) => item.type === selectedType && item.isActive);
    const grouped: Record<string, typeof filtered> = {};
    
    for (const item of filtered) {
      const cat = item.category || 'uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return grouped;
  }, [selectedType, knowledgeItems]);

  // Get available categories for the filter dropdown
  const availableCategories = useMemo(() => {
    return Object.keys(groupedByCategory).sort((a, b) => {
      // Put 'uncategorized' last
      if (a === 'uncategorized') return 1;
      if (b === 'uncategorized') return -1;
      // Sort by count (descending) then alphabetically
      const countDiff = (groupedByCategory[b]?.length || 0) - (groupedByCategory[a]?.length || 0);
      return countDiff !== 0 ? countDiff : a.localeCompare(b);
    });
  }, [groupedByCategory]);

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
      { type: 'avoid_word', label: 'Avoid words', count: getCount('avoid_word'), colorClass: 'text-red-500', priority: 'high' },
      { type: 'auto_fix', label: 'Auto-fix rules', count: getCount('auto_fix'), colorClass: 'text-blue-500', priority: 'high' },
      { type: 'approved_example', label: 'Approved examples', count: getCount('approved_example'), colorClass: 'text-cyan-500', priority: 'high' },
      { type: 'preferred_word', label: 'Preferred vocab', count: getCount('preferred_word'), colorClass: 'text-green-500', priority: 'medium' },
      { type: 'product_definition', label: 'Product defs', count: getCount('product_definition'), colorClass: 'text-purple-500', priority: 'low' },
      { type: 'festival', label: 'Festivals', count: getCount('festival'), colorClass: 'text-yellow-500', priority: 'low' },
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
    // Reset search and filter when switching types
    setSearchQuery('');
    setCategoryFilter(null);
    setCollapsedCategories(new Set());
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

  // Toggle category expansion
  const toggleCategoryExpand = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Calculate filtered count for search/filter bar
  const getFilteredCount = (): number => {
    if (!groupedByCategory) return 0;
    
    const categories = categoryFilter 
      ? [categoryFilter] 
      : Object.keys(groupedByCategory);
    
    let count = 0;
    for (const cat of categories) {
      const items = groupedByCategory[cat] || [];
      if (searchQuery) {
        count += items.filter(item => 
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.metadata?.suggestion?.toLowerCase().includes(searchQuery.toLowerCase()))
        ).length;
      } else {
        count += items.length;
      }
    }
    return count;
  };

  // Handle edit from CategorySection
  const handleCategoryEdit = (item: KnowledgeItem) => {
    handleEdit({
      _id: item._id,
      type: item.type,
      category: item.category,
      content: item.content,
      metadata: item.metadata || {},
      tags: item.tags,
      isActive: item.isActive,
    });
  };

  // Handle delete from CategorySection
  const handleCategoryDelete = (target: { id: Id<"knowledgeItems">; content: string }) => {
    setDeleteTarget(target);
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

    const totalCount = getTotalCount(selectedType);
    const filteredCount = getFilteredCount();
    const typeLabel = selectedType.replace(/_/g, ' ');

    // Get description for type
    const typeDescriptions: Record<string, string> = {
      avoid_word: 'These words trigger warnings in the content editor.',
      preferred_word: 'These are recommended alternatives suggested by the content editor.',
      auto_fix: 'These rules automatically correct common typos and formatting issues.',
      product_definition: 'Official product definitions used for consistent messaging.',
      festival: 'Festival dates and cultural context for content planning.',
      approved_example: 'Approved content examples for reference and training.',
    };

    // Check if there are any categories to display
    const hasCategories = Object.keys(groupedByCategory).length > 0;

    // For types that work better with grouped display (avoid_word, preferred_word, festival)
    const useGroupedDisplay = ['avoid_word', 'preferred_word', 'festival', 'auto_fix'].includes(selectedType);

    if (useGroupedDisplay && hasCategories) {
      return (
        <AdminCard className="p-4 mt-4">
          <CardLabel>{typeLabel} ({totalCount} total)</CardLabel>
          
          {/* Search and Filter Bar */}
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            availableCategories={availableCategories}
            selectedType={selectedType}
            totalCount={totalCount}
            filteredCount={filteredCount}
          />

          {/* Grouped Category Sections */}
          <div className="space-y-0">
            {availableCategories
              .filter(cat => !categoryFilter || cat === categoryFilter)
              .map(category => (
                <CategorySection
                  key={category}
                  category={category}
                  items={groupedByCategory[category] || []}
                  type={selectedType}
                  onEdit={handleCategoryEdit}
                  onDelete={handleCategoryDelete}
                  searchQuery={searchQuery}
                  isExpanded={!collapsedCategories.has(category)}
                  onToggleExpand={() => toggleCategoryExpand(category)}
                />
              ))}
          </div>

          {/* Empty state */}
          {filteredCount === 0 && (
            <div className="text-center py-8" style={{ color: theme.text.low }}>
              {searchQuery || categoryFilter 
                ? 'No items match your search criteria.'
                : `No ${typeLabel} configured yet.`}
            </div>
          )}

          {/* Description */}
          <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
            {typeDescriptions[selectedType]}
          </span>
        </AdminCard>
      );
    }

    // Fallback to original display for other types (product_definition, approved_example)
    const items = getItemsForType(selectedType);
    const displayedItems = items.slice(0, displayLimit);
    const hasMore = items.length > displayLimit || totalCount > items.length;

    switch (selectedType) {
      case 'product_definition': {
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>Product definitions ({totalCount} total)</CardLabel>
            <AdminTable
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'def', label: 'Definition' },
              ]}
              isEmpty={items.length === 0}
              emptyMessage="No product definitions configured."
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
                    Load more
                  </button>
                )}
              </div>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              {typeDescriptions[selectedType]}
            </span>
          </AdminCard>
        );
      }

      case 'approved_example': {
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>Approved examples ({totalCount} total)</CardLabel>
            <AdminTable
              columns={[
                { key: 'content', label: 'Content' },
                { key: 'eco', label: 'Ecosystem' },
                { key: 'ch', label: 'Channel' },
              ]}
              isEmpty={items.length === 0}
              emptyMessage="No examples saved yet. Users can save via the bookmark icon."
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
                    Load more
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
      <PageHeader title="Knowledge base" description="Brand rules, vocabulary, and content guidelines" />

      {/* Total Rules Counter with Add Button */}
      <div className="flex items-center justify-between mb-5">
        <div 
          className="rounded-xl"
          style={{ border: `1px solid ${theme.stroke.medium}` }}
        >
          <DataCard 
            title="Active rules"
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
        {selectedType && (
          <Button
            appearance="primary"
            size="S"
            onPress={handleAddNew}
          >
            + add {selectedType.replace('_', ' ')}
          </Button>
        )}
      </div>

      {/* Type Overview - Reordered with high-priority first */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-5">
        {knowledgeTypes.map((kt) => (
          <button
            key={kt.type}
            onClick={() => handleCardClick(kt.type)}
            className="rounded-lg cursor-pointer transition-all hover:shadow-sm text-left"
            style={{ 
              border: `1px solid ${selectedType === kt.type ? theme.accent : theme.stroke.low}`,
              backgroundColor: 'transparent',
            }}
          >
            <DataCard 
              title={kt.label}
              fillEmphasis="Ghost"
              width="100%"
              dataHead={{
                leadValue: String(kt.count),
                showDataSupporting: false,
                showSupportingLabel: false,
              }}
              modes={{ colourMode: theme.colorMode, colourTheme: 'MyJio' }}
            />
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      {renderDetailPanel()}

      {/* Info - only show when no detail panel is open */}
      {!selectedType && (
        <AdminCard className="p-4 mb-5">
          <span className="block font-medium mb-2" style={{ color: theme.text.high, fontSize: '13px' }}>
            How to manage knowledge
          </span>
          <ul className="space-y-1 pl-4" style={{ fontSize: '12px', color: theme.text.medium, listStyleType: 'disc' }}>
            <li><strong>Add items:</strong> select a category above, then click "+ add" to create new rules</li>
            <li><strong>Seed data:</strong> run <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>npx convex run seed:seedAll</code></li>
            <li><strong>Embeddings:</strong> run <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>npx convex run embeddings:backfillEmbeddings</code></li>
            <li><strong>Vocab rules</strong> are managed here -- no code deploy needed</li>
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
        <PageHeader 
          title="Usage analytics" 
          description="Adoption across Jio ecosystem and content channels" 
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
            Registered users across Jio products
          </span>
        </div>
      </AdminCard>

      {/* Charts */}
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

      {/* Context Performance Table */}
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
      <PageHeader title="Users" description="Registered user profiles (device-based)" />

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
  const [authenticated, setAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const theme = useThemeColors();
  
  // User profile state for the user menu
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => loadUserProfile());
  const [showEditProfile, setShowEditProfile] = useState(false);

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

  // Handle profile save from OnboardingModal
  const handleProfileSave = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    setShowEditProfile(false);
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
      case 'tokens': return <TokensDisplay />;
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
        userName={userProfile?.name}
        userRole={userProfile?.role}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        onEditProfile={() => setShowEditProfile(true)}
        onNavigateToHowItWorks={() => { window.location.href = '/?view=how-it-works'; }}
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
