import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useThemeColors } from '../theme/useColors';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { AdminSidebar, type AdminSection } from './components/AdminSidebar';
import { AdminStatCard } from './components/AdminStatCard';
import { AdminTable, AdminTableRow, AdminTableCell } from './components/AdminTable';
import { getApiBaseUrl } from '../config/providers';

// ── Admin Auth Gate ──────────────────────────────────────────────
const SESSION_TOKEN_KEY = 'voicelab_admin_token';

/**
 * Server-side admin authentication with dev mode fallback
 */
async function authenticateAdmin(passphrase: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const apiBase = getApiBaseUrl();
    const response = await fetch(`${apiBase}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', passphrase }),
    });
    
    const data = await response.json();
    
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
          <input
            type="password"
            value={passphrase}
            onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
            placeholder="Passphrase"
            autoFocus
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

// ── Utility: Admin Status badge ──────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    pending: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    approved: { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    rejected: { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
  };
  const c = colorMap[status] || { bg: 'rgba(107,114,128,0.12)', fg: '#6b7280' };
  return (
    <span
      className="inline-block rounded-full font-medium whitespace-nowrap"
      style={{
        fontSize: '10px',
        padding: '1px 6px',
        backgroundColor: c.bg,
        color: c.fg,
      }}
    >
      {status}
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

// ── Dashboard ────────────────────────────────────────────────────
function AdminDashboard() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  
  // Direct Convex queries - no localStorage fallback
  const corrections = useQuery(api.corrections.listAll, { limit: 100 });
  const knowledgeCounts = useQuery(api.knowledge.countByType);
  
  // Loading state - show skeleton while Convex data is loading
  if (corrections === undefined || knowledgeCounts === undefined) {
    return <AdminLoadingSkeleton />;
  }

  // Derived values
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const savedExamplesCount = knowledgeCounts?.approved_example?.active ?? 0;

  const todayCount = corrections.filter(c => c.timestamp >= today.getTime()).length;
  const weekCount = corrections.filter(c => c.timestamp >= week).length;
  const thumbsUp = corrections.filter(c => c.feedbackType === 'thumbs_up').length;
  const thumbsDown = corrections.filter(c => c.feedbackType === 'thumbs_down').length;
  const edits = corrections.filter(c => c.feedbackType === 'edit').length;
  const comments = corrections.filter(c => c.feedbackType === 'comment').length;

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <SectionHeader title="Dashboard" subtitle="System overview and recent activity" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard label="today" value={todayCount} colorClass="text-orange-500" />
        <AdminStatCard label="this week" value={weekCount} colorClass="text-blue-500" />
        <AdminStatCard label="total feedback" value={corrections.length} colorClass="text-purple-500" />
        <AdminStatCard label="saved examples" value={savedExamplesCount} colorClass="text-green-500" />
      </div>

      {/* Feedback Breakdown */}
      <AdminCard className="p-4 mb-5">
        <CardLabel>feedback breakdown</CardLabel>
        <div className="flex flex-wrap gap-6">
          {[
            { label: 'thumbs up', value: thumbsUp, pct: corrections.length ? Math.round(thumbsUp / corrections.length * 100) : 0 },
            { label: 'thumbs down', value: thumbsDown, pct: corrections.length ? Math.round(thumbsDown / corrections.length * 100) : 0 },
            { label: 'edits', value: edits, pct: corrections.length ? Math.round(edits / corrections.length * 100) : 0 },
            { label: 'comments', value: comments, pct: corrections.length ? Math.round(comments / corrections.length * 100) : 0 },
          ].map((fb) => (
            <div key={fb.label} className="text-center min-w-[80px]">
              <span className="block font-semibold" style={{ fontSize: '20px', color: theme.text.high }}>{fb.value}</span>
              <span className="block" style={{ fontSize: '11px', color: theme.text.low }}>{fb.label} ({fb.pct}%)</span>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Recent Activity */}
      <AdminCard className="p-4">
        <CardLabel>recent feedback</CardLabel>
        <AdminTable
          columns={[
            { key: 'type', label: 'type' },
            { key: 'content', label: 'content (preview)' },
            { key: 'time', label: 'time' },
          ]}
          isEmpty={corrections.length === 0}
          emptyMessage="no feedback recorded yet."
        >
          {corrections.slice(0, 10).map((c, i) => (
            <AdminTableRow key={i}>
              <AdminTableCell><FeedbackBadge type={c.feedbackType} /></AdminTableCell>
              <AdminTableCell className="max-w-sm truncate">{(c.originalContent || '').slice(0, 80)}</AdminTableCell>
              <AdminTableCell className="whitespace-nowrap">
                <span style={{ color: theme.text.low, fontSize: '12px' }}>
                  {new Date(c.timestamp).toLocaleString()}
                </span>
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </AdminTable>
      </AdminCard>
    </>
  );
}

// ── Analytics ────────────────────────────────────────────────────
function AdminAnalytics() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  
  // Direct Convex queries - no localStorage fallback
  const corrections = useQuery(api.corrections.listAll, { limit: 500 });
  const feedbackCounts = useQuery(api.corrections.countByFeedbackType);
  
  // Loading state
  if (corrections === undefined || feedbackCounts === undefined) {
    return <AdminLoadingSkeleton />;
  }

  const byEcosystem = (() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { const eco = (c as Record<string, unknown>).ecosystem as string || 'unknown'; counts[eco] = (counts[eco] || 0) + 1; }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  })();

  const byChannel = (() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { const ch = (c as Record<string, unknown>).channel as string || 'unknown'; counts[ch] = (counts[ch] || 0) + 1; }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  })();

  const byType = Object.entries(feedbackCounts).sort(([, a], [, b]) => b - a);

  const BarRow = ({ label, count, color }: { label: string; count: number; color: string }) => {
    const max = Math.max(...(byEcosystem.length ? byEcosystem.map(([, c]) => c) : [1]));
    const pct = max > 0 ? (count / max) * 100 : 0;
    return (
      <div className="flex items-center gap-3 py-1" style={{ borderBottom: `1px solid ${theme.stroke.low}` }}>
        <span className="w-28 truncate" style={{ fontSize: '13px', color: theme.text.high }}>{label}</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.stroke.low }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="font-semibold w-8 text-right" style={{ fontSize: '13px', color }}>{count}</span>
      </div>
    );
  };

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <SectionHeader title="Analytics" subtitle="content quality metrics and usage patterns" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <AdminCard className="p-4">
          <CardLabel>by ecosystem</CardLabel>
          {byEcosystem.length === 0
            ? <span style={{ color: theme.text.low, fontSize: '13px' }}>no data yet</span>
            : byEcosystem.map(([eco, count]) => <BarRow key={eco} label={eco} count={count} color={theme.accent} />)
          }
        </AdminCard>

        <AdminCard className="p-4">
          <CardLabel>by channel</CardLabel>
          {byChannel.length === 0
            ? <span style={{ color: theme.text.low, fontSize: '13px' }}>no data yet</span>
            : byChannel.map(([ch, count]) => <BarRow key={ch} label={ch} count={count} color="#3b82f6" />)
          }
        </AdminCard>
      </div>

      <AdminCard className="p-4">
        <CardLabel>feedback type distribution</CardLabel>
        <div className="flex flex-wrap gap-3">
          {byType.map(([type, count]) => (
            <div
              key={type}
              className="flex-1 min-w-[100px] text-center py-2 px-3 rounded-lg"
              style={{ backgroundColor: theme.background.ghost }}
            >
              <span className="block font-semibold" style={{ fontSize: '20px', color: theme.text.high }}>{count}</span>
              <span className="block" style={{ fontSize: '11px', color: theme.text.low }}>{type}</span>
            </div>
          ))}
        </div>
      </AdminCard>
    </>
  );
}

// ── Memory & Learnings ───────────────────────────────────────────
function AdminMemory() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  
  // Direct Convex query - no localStorage fallback
  const corrections = useQuery(api.corrections.listAll, { limit: 200 });
  
  // Mutation for updating admin status
  const updateAdminStatus = useMutation(api.corrections.updateAdminStatus);
  
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  // Handle approve/reject
  const handleStatusUpdate = async (correctionId: Id<"corrections">, newStatus: string) => {
    const idStr = correctionId.toString();
    setProcessingIds(prev => new Set(prev).add(idStr));
    
    try {
      await updateAdminStatus({ correctionId, adminStatus: newStatus });
    } catch (error) {
      console.error('[AdminMemory] Failed to update status:', error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(idStr);
        return next;
      });
    }
  };

  // Loading state
  if (corrections === undefined) {
    return <AdminLoadingSkeleton />;
  }

  const filtered = (() => {
    let result = filter === 'all' ? corrections : corrections.filter(c => c.feedbackType === filter);
    
    // Filter by admin status
    if (statusFilter !== 'all') {
      result = result.filter(c => c.adminStatus === statusFilter);
    }
    
    if (searchQuery) {
      result = result.filter(c =>
        (c.originalContent || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.editedContent || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.comment || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  })();

  const filterOptions = ['all', 'thumbs_up', 'thumbs_down', 'edit', 'comment'];
  const statusOptions = ['all', 'pending', 'approved', 'rejected'];
  
  // Count by status for display
  const statusCounts = {
    pending: corrections?.filter(c => c.adminStatus === 'pending').length ?? 0,
    approved: corrections?.filter(c => c.adminStatus === 'approved').length ?? 0,
    rejected: corrections?.filter(c => c.adminStatus === 'rejected').length ?? 0,
  };

  return (
    <>
      {!isOnline && <OfflineBanner />}
      <SectionHeader title="Memory & Learnings" subtitle="all user feedback and corrections" />

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Type filters */}
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-md px-2.5 cursor-pointer transition-colors"
                style={{
                  height: '28px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? theme.accent : 'transparent',
                  color: isActive ? '#fff' : theme.text.medium,
                  border: isActive ? 'none' : `1px solid ${theme.stroke.low}`,
                }}
              >
                {f === 'all' ? 'all' : f.replace('_', ' ')}
                {f !== 'all' && ` (${corrections.filter(c => c.feedbackType === f).length})`}
              </button>
            );
          })}
        </div>
        
        {/* Status filters and search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map((s) => {
              const isActive = statusFilter === s;
              const count = s === 'all' ? corrections.length : statusCounts[s as keyof typeof statusCounts];
              const statusColors: Record<string, string> = {
                pending: '#f59e0b',
                approved: '#10b981',
                rejected: '#ef4444',
              };
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="rounded-md px-2.5 cursor-pointer transition-colors"
                  style={{
                    height: '28px',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 400,
                    backgroundColor: isActive ? (statusColors[s] || theme.accent) : 'transparent',
                    color: isActive ? '#fff' : theme.text.medium,
                    border: isActive ? 'none' : `1px solid ${theme.stroke.low}`,
                  }}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>

          <div className="sm:ml-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search feedback..."
              aria-label="search feedback"
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
        </div>
      </div>

      {/* Table */}
      <AdminCard className="p-4">
        <AdminTable
          columns={[
            { key: 'type', label: 'type' },
            { key: 'status', label: 'status' },
            { key: 'original', label: 'original content' },
            { key: 'edited', label: 'edited / comment' },
            { key: 'eco', label: 'ecosystem' },
            { key: 'time', label: 'time' },
            { key: 'actions', label: 'actions' },
          ]}
          isEmpty={filtered.length === 0}
          emptyMessage={searchQuery ? 'no feedback matches your search.' : 'no feedback matches this filter.'}
        >
          {filtered.slice(0, 50).map((c, i) => {
            const correctionId = c._id;
            const idStr = correctionId?.toString() || String(i);
            const isProcessing = processingIds.has(idStr);
            const currentStatus = c.adminStatus || 'pending';
            
            return (
              <AdminTableRow key={idStr}>
                <AdminTableCell><FeedbackBadge type={c.feedbackType} /></AdminTableCell>
                <AdminTableCell>
                  <StatusBadge status={currentStatus} />
                </AdminTableCell>
                <AdminTableCell className="max-w-[180px] truncate">{(c.originalContent || '').slice(0, 80)}</AdminTableCell>
                <AdminTableCell className="max-w-[180px] truncate">{c.editedContent || c.comment || '—'}</AdminTableCell>
                <AdminTableCell>{(c as Record<string, unknown>).ecosystem as string || '—'}</AdminTableCell>
                <AdminTableCell className="whitespace-nowrap">
                  <span style={{ color: theme.text.low, fontSize: '12px' }}>
                    {new Date(c.timestamp).toLocaleDateString()}
                  </span>
                </AdminTableCell>
                <AdminTableCell>
                  {correctionId && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStatusUpdate(correctionId, 'approved')}
                        disabled={isProcessing || currentStatus === 'approved'}
                        className="px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: currentStatus === 'approved' ? '#10b981' : 'transparent',
                          color: currentStatus === 'approved' ? '#fff' : '#10b981',
                          border: currentStatus === 'approved' ? 'none' : '1px solid #10b981',
                        }}
                        title="approve for learning"
                      >
                        {isProcessing ? '...' : 'approve'}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(correctionId, 'rejected')}
                        disabled={isProcessing || currentStatus === 'rejected'}
                        className="px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: currentStatus === 'rejected' ? '#ef4444' : 'transparent',
                          color: currentStatus === 'rejected' ? '#fff' : '#ef4444',
                          border: currentStatus === 'rejected' ? 'none' : '1px solid #ef4444',
                        }}
                        title="reject from learning"
                      >
                        {isProcessing ? '...' : 'reject'}
                      </button>
                    </div>
                  )}
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
    </>
  );
}

// ── Knowledge Base ───────────────────────────────────────────────
function AdminKnowledge() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  // Direct Convex queries - no localStorage fallback
  const knowledgeCounts = useQuery(api.knowledge.countByType);
  const knowledgeItems = useQuery(api.knowledge.listAll, selectedType ? { type: selectedType, limit: 50 } : { limit: 50 });
  
  // Loading state
  if (knowledgeCounts === undefined) {
    return <AdminLoadingSkeleton />;
  }

  const knowledgeTypes = (() => {
    const getCount = (type: string): string => {
      if (knowledgeCounts?.[type]) {
        return `${knowledgeCounts[type].active}/${knowledgeCounts[type].total}`;
      }
      return '—';
    };
    
    return [
      { type: 'avoid_word', label: 'avoid words', count: getCount('avoid_word'), colorClass: 'text-red-500' },
      { type: 'preferred_word', label: 'preferred vocab', count: getCount('preferred_word'), colorClass: 'text-green-500' },
      { type: 'auto_fix', label: 'auto-fix rules', count: getCount('auto_fix'), colorClass: 'text-blue-500' },
      { type: 'product_definition', label: 'product defs', count: getCount('product_definition'), colorClass: 'text-purple-500' },
      { type: 'festival', label: 'festivals', count: getCount('festival'), colorClass: 'text-yellow-500' },
      { type: 'approved_example', label: 'examples', count: getCount('approved_example'), colorClass: 'text-cyan-500' },
    ];
  })();

  const handleCardClick = (type: string) => {
    setSelectedType(prev => prev === type ? null : type);
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
      case 'avoid_word':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>avoid words</CardLabel>
            <div className="flex flex-wrap gap-2">
              {items.slice(0, 30).map((item, i) => (
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
            {items.length > 30 && (
              <span className="block mt-2" style={{ color: theme.text.low, fontSize: '11px' }}>
                showing 30 of {items.length} items.
              </span>
            )}
            {items.length === 0 && (
              <span style={{ color: theme.text.low, fontSize: '13px' }}>no avoid words configured yet.</span>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              these words trigger warnings in the content editor.
            </span>
          </AdminCard>
        );

      case 'preferred_word':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>preferred vocabulary</CardLabel>
            <div className="flex flex-wrap gap-2">
              {items.slice(0, 30).map((item, i) => (
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
            {items.length > 30 && (
              <span className="block mt-2" style={{ color: theme.text.low, fontSize: '11px' }}>
                showing 30 of {items.length} items.
              </span>
            )}
            {items.length === 0 && (
              <span style={{ color: theme.text.low, fontSize: '13px' }}>no preferred words configured yet.</span>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              these are recommended alternatives suggested by the content editor.
            </span>
          </AdminCard>
        );

      case 'auto_fix':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>auto-fix rules</CardLabel>
            <AdminTable
              columns={[
                { key: 'from', label: 'original' },
                { key: 'to', label: 'replacement' },
              ]}
              isEmpty={items.length === 0}
              emptyMessage="no auto-fix rules configured."
            >
              {items.slice(0, 20).map((item, i) => (
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
            {items.length > 20 && (
              <span className="block mt-2" style={{ color: theme.text.low, fontSize: '11px' }}>
                showing 20 of {items.length} items.
              </span>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              these rules automatically correct common typos and formatting issues.
            </span>
          </AdminCard>
        );

      case 'product_definition':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>product definitions</CardLabel>
            <AdminTable
              columns={[
                { key: 'name', label: 'product' },
                { key: 'def', label: 'definition' },
              ]}
              isEmpty={items.length === 0}
              emptyMessage="no product definitions configured."
            >
              {items.slice(0, 20).map((item, i) => (
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
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              official product definitions used for consistent messaging.
            </span>
          </AdminCard>
        );

      case 'festival':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>festivals</CardLabel>
            <div className="flex flex-wrap gap-2">
              {items.slice(0, 20).map((item, i) => (
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
            {items.length === 0 && (
              <span style={{ color: theme.text.low, fontSize: '13px' }}>no festivals configured yet.</span>
            )}
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              festival dates and cultural context for content planning.
            </span>
          </AdminCard>
        );

      case 'approved_example': {
        const examples = getItemsForType('approved_example');
        
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>approved examples ({examples.length})</CardLabel>
            <AdminTable
              columns={[
                { key: 'content', label: 'content' },
                { key: 'eco', label: 'ecosystem' },
                { key: 'ch', label: 'channel' },
              ]}
              isEmpty={examples.length === 0}
              emptyMessage="no examples saved yet. users can save via the bookmark icon."
            >
              {examples.slice(0, 20).map((ex, i) => (
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
      <SectionHeader title="Knowledge Base" subtitle="managed rules, vocabulary, and content examples" />

      {/* Type Overview */}
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
            <li><strong>seed data:</strong> run <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>npx convex run seed:seedAll</code></li>
            <li><strong>embeddings:</strong> run <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>npx convex run embeddings:backfillEmbeddings</code></li>
            <li><strong>vocab rules</strong> are managed here -- no code deploy needed</li>
            <li><strong>regex rules</strong> require a code deploy to <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>allAgents.ts</code></li>
          </ul>
        </AdminCard>
      )}
    </>
  );
}

// ── Utility: Format relative time ────────────────────────────────
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// ── Users ────────────────────────────────────────────────────────
function AdminUsers() {
  const theme = useThemeColors();
  const { isOnline } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Direct Convex query - no localStorage fallback
  const users = useQuery(api.users.listAll);

  // Loading state
  if (users === undefined) {
    return <AdminLoadingSkeleton />;
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
                    {user.name[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', color: theme.text.high }}>
                    {user.name}
                  </span>
                </div>
              </AdminTableCell>
              <AdminTableCell>
                <FeedbackBadge type={user.role} />
              </AdminTableCell>
              <AdminTableCell>{user.product}</AdminTableCell>
              <AdminTableCell>
                <span className="font-mono" style={{ fontSize: '11px', color: theme.text.low }}>
                  {user.deviceId.slice(0, 20)}...
                </span>
              </AdminTableCell>
              <AdminTableCell className="whitespace-nowrap">
                <span style={{ color: theme.text.low, fontSize: '12px' }}>
                  {formatRelativeTime(user.lastSeenAt)}
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
      case 'analytics': return <AdminAnalytics />;
      case 'memory': return <AdminMemory />;
      case 'knowledge': return <AdminKnowledge />;
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
