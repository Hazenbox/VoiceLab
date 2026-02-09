import { useState, useCallback, useEffect, useMemo } from 'react';
import { useThemeColors } from '../theme/useColors';

// ── Admin Auth Gate ──────────────────────────────────────────────
// SECURITY NOTE (POC limitation): This passphrase is bundled into client-side JS
// via the VITE_ prefix and is visible in browser DevTools / source maps.
// The sessionStorage-based auth is trivially bypassable (sessionStorage.setItem('voicelab_admin_auth','true')).
// For production, this MUST move to server-side authentication (e.g., Convex auth, OAuth, or a backend session).
const ADMIN_PASSPHRASE = import.meta.env.VITE_ADMIN_PASSPHRASE || 'voicelab-admin';
const SESSION_KEY = 'voicelab_admin_auth';

function AdminAuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const colors = useThemeColors();

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase === ADMIN_PASSPHRASE) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      onAuthenticated();
    } else {
      setError('Incorrect passphrase');
      setPassphrase('');
    }
  }, [passphrase, onAuthenticated]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: colors.background.ghost,
    }}>
      <div style={{
        padding: '2rem', borderRadius: '12px',
        border: `1px solid ${colors.stroke.medium}`,
        background: colors.background.subtle, maxWidth: '400px', width: '100%',
      }}>
        <h2 style={{ color: colors.text.high, marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          Voice Lab Admin
        </h2>
        <p style={{ color: colors.text.medium, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Enter the admin passphrase to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password" value={passphrase}
            onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
            placeholder="Passphrase" autoFocus
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '8px',
              border: `1px solid ${error ? '#ef4444' : colors.stroke.medium}`,
              background: colors.background.ghost, color: colors.text.high,
              fontSize: '0.875rem', outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{error}</p>}
          <button type="submit" style={{
            width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none',
            background: colors.accent, color: '#fff', fontSize: '0.875rem',
            fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem',
          }}>
            Enter Admin Panel
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────
type AdminSection = 'dashboard' | 'analytics' | 'memory' | 'knowledge' | 'users' | 'config';

const NAV_ITEMS: { id: AdminSection; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'memory', label: 'Memory & Learnings', icon: '🧠' },
  { id: 'knowledge', label: 'Knowledge Base', icon: '📚' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'config', label: 'System Config', icon: '⚙️' },
];

// ── Shared Styles ────────────────────────────────────────────────
function useAdminStyles() {
  const colors = useThemeColors();
  return useMemo(() => ({
    card: {
      padding: '1.25rem', borderRadius: '10px',
      border: `1px solid ${colors.stroke.low}`,
      background: colors.background.subtle,
    } as React.CSSProperties,
    heading: {
      color: colors.text.high, fontSize: '1.25rem', fontWeight: 600, margin: 0,
    } as React.CSSProperties,
    subheading: {
      color: colors.text.medium, fontSize: '0.875rem', margin: '0.25rem 0 0',
    } as React.CSSProperties,
    label: {
      color: colors.text.low, fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    } as React.CSSProperties,
    stat: {
      color: colors.text.high, fontSize: '2rem', fontWeight: 700, lineHeight: 1,
    } as React.CSSProperties,
    table: {
      width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8125rem',
    } as React.CSSProperties,
    th: {
      textAlign: 'left' as const, padding: '0.625rem 0.75rem',
      color: colors.text.low, fontSize: '0.75rem', fontWeight: 500,
      borderBottom: `1px solid ${colors.stroke.low}`,
      textTransform: 'uppercase' as const, letterSpacing: '0.04em',
    } as React.CSSProperties,
    td: {
      padding: '0.625rem 0.75rem', color: colors.text.high,
      borderBottom: `1px solid ${colors.stroke.low}`,
    } as React.CSSProperties,
    badge: (variant: 'green' | 'red' | 'yellow' | 'blue' | 'gray') => {
      const map = { green: '#22c55e', red: '#ef4444', yellow: '#f59e0b', blue: '#3b82f6', gray: '#6b7280' };
      return {
        display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '999px',
        fontSize: '0.6875rem', fontWeight: 500,
        background: map[variant] + '20', color: map[variant],
      } as React.CSSProperties;
    },
    btn: (variant: 'primary' | 'secondary' | 'danger') => {
      const bg = { primary: colors.accent, secondary: 'transparent', danger: '#ef4444' };
      const fg = { primary: '#fff', secondary: colors.text.medium, danger: '#fff' };
      const brd = { primary: 'none', secondary: `1px solid ${colors.stroke.medium}`, danger: 'none' };
      return {
        padding: '0.5rem 1rem', borderRadius: '6px', border: brd[variant],
        background: bg[variant], color: fg[variant], fontSize: '0.8125rem',
        fontWeight: 500, cursor: 'pointer',
      } as React.CSSProperties;
    },
  }), [colors]);
}

// ── Local data hooks (localStorage-based for offline/no-Convex) ──
function useLocalData<T>(key: string, fallback: T): T {
  const [data, setData] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch { return fallback; }
  });
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) setData(JSON.parse(stored));
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [key]);
  return data;
}

// ── Dashboard ────────────────────────────────────────────────────
function AdminDashboard() {
  const colors = useThemeColors();
  const s = useAdminStyles();
  const corrections = useLocalData<Array<{ feedbackType: string; timestamp: number }>>('voicelab_corrections_cache', []);
  const examples = useLocalData<Array<{ timestamp: number }>>('voicelab_saved_examples', []);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }, []);
  const week = useMemo(() => Date.now() - 7 * 24 * 60 * 60 * 1000, []);

  const todayCorrections = corrections.filter(c => c.timestamp >= today).length;
  const weekCorrections = corrections.filter(c => c.timestamp >= week).length;
  const thumbsUp = corrections.filter(c => c.feedbackType === 'thumbs_up').length;
  const thumbsDown = corrections.filter(c => c.feedbackType === 'thumbs_down').length;
  const edits = corrections.filter(c => c.feedbackType === 'edit').length;
  const comments = corrections.filter(c => c.feedbackType === 'comment').length;

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>
      <h2 style={s.heading}>Dashboard</h2>
      <p style={{ ...s.subheading, marginBottom: '1.5rem' }}>System overview and recent activity</p>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Today\'s Feedback', value: todayCorrections, color: colors.accent },
          { label: 'This Week', value: weekCorrections, color: '#3b82f6' },
          { label: 'Total Feedback', value: corrections.length, color: '#8b5cf6' },
          { label: 'Saved Examples', value: examples.length, color: '#22c55e' },
        ].map((stat) => (
          <div key={stat.label} style={s.card}>
            <p style={s.label}>{stat.label}</p>
            <p style={{ ...s.stat, color: stat.color, marginTop: '0.5rem' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Feedback Breakdown */}
      <div style={{ ...s.card, marginBottom: '2rem' }}>
        <p style={{ ...s.label, marginBottom: '1rem' }}>Feedback Breakdown</p>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Thumbs Up', value: thumbsUp, icon: '👍', pct: corrections.length ? Math.round(thumbsUp / corrections.length * 100) : 0 },
            { label: 'Thumbs Down', value: thumbsDown, icon: '👎', pct: corrections.length ? Math.round(thumbsDown / corrections.length * 100) : 0 },
            { label: 'Edits', value: edits, icon: '✏️', pct: corrections.length ? Math.round(edits / corrections.length * 100) : 0 },
            { label: 'Comments', value: comments, icon: '💬', pct: corrections.length ? Math.round(comments / corrections.length * 100) : 0 },
          ].map((fb) => (
            <div key={fb.label} style={{ textAlign: 'center', minWidth: '100px' }}>
              <p style={{ fontSize: '1.5rem', margin: 0 }}>{fb.icon}</p>
              <p style={{ color: colors.text.high, fontWeight: 600, margin: '0.25rem 0 0', fontSize: '1.25rem' }}>{fb.value}</p>
              <p style={{ color: colors.text.low, fontSize: '0.75rem' }}>{fb.label} ({fb.pct}%)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={s.card}>
        <p style={{ ...s.label, marginBottom: '1rem' }}>Recent Feedback</p>
        {corrections.length === 0 ? (
          <p style={{ color: colors.text.low, fontSize: '0.875rem' }}>No feedback recorded yet.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Type</th>
                <th style={s.th}>Content (preview)</th>
                <th style={s.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {corrections.slice(0, 10).map((c: Record<string, unknown>, i: number) => (
                <tr key={i}>
                  <td style={s.td}>
                    <span style={s.badge(
                      (c.feedbackType as string) === 'thumbs_up' ? 'green' :
                      (c.feedbackType as string) === 'thumbs_down' ? 'red' :
                      (c.feedbackType as string) === 'edit' ? 'blue' : 'yellow'
                    )}>
                      {c.feedbackType as string}
                    </span>
                  </td>
                  <td style={{ ...s.td, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(c.originalContent as string || '').slice(0, 80)}
                  </td>
                  <td style={{ ...s.td, color: colors.text.low, fontSize: '0.75rem' }}>
                    {new Date(c.timestamp as number).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Analytics ────────────────────────────────────────────────────
function AdminAnalytics() {
  const colors = useThemeColors();
  const s = useAdminStyles();
  const corrections = useLocalData<Array<Record<string, unknown>>>('voicelab_corrections_cache', []);

  const byEcosystem = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { counts[c.ecosystem as string] = (counts[c.ecosystem as string] || 0) + 1; }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

  const byChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { counts[c.channel as string] = (counts[c.channel as string] || 0) + 1; }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

  const byType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { counts[c.feedbackType as string] = (counts[c.feedbackType as string] || 0) + 1; }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>
      <h2 style={s.heading}>Analytics</h2>
      <p style={{ ...s.subheading, marginBottom: '1.5rem' }}>Content quality metrics and usage patterns</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        {/* By Ecosystem */}
        <div style={s.card}>
          <p style={{ ...s.label, marginBottom: '0.75rem' }}>Feedback by Ecosystem</p>
          {byEcosystem.length === 0 ? (
            <p style={{ color: colors.text.low, fontSize: '0.875rem' }}>No data yet</p>
          ) : byEcosystem.map(([eco, count]) => (
            <div key={eco} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: `1px solid ${colors.stroke.low}` }}>
              <span style={{ color: colors.text.high, fontSize: '0.8125rem' }}>{eco}</span>
              <span style={{ color: colors.accent, fontWeight: 600, fontSize: '0.8125rem' }}>{count}</span>
            </div>
          ))}
        </div>

        {/* By Channel */}
        <div style={s.card}>
          <p style={{ ...s.label, marginBottom: '0.75rem' }}>Feedback by Channel</p>
          {byChannel.length === 0 ? (
            <p style={{ color: colors.text.low, fontSize: '0.875rem' }}>No data yet</p>
          ) : byChannel.map(([ch, count]) => (
            <div key={ch} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: `1px solid ${colors.stroke.low}` }}>
              <span style={{ color: colors.text.high, fontSize: '0.8125rem' }}>{ch}</span>
              <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.8125rem' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Type */}
      <div style={s.card}>
        <p style={{ ...s.label, marginBottom: '0.75rem' }}>Feedback Type Distribution</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {byType.map(([type, count]) => (
            <div key={type} style={{ flex: 1, minWidth: '120px', padding: '0.75rem', borderRadius: '8px', background: colors.background.ghost, textAlign: 'center' }}>
              <p style={{ color: colors.text.high, fontWeight: 600, fontSize: '1.5rem', margin: 0 }}>{count}</p>
              <p style={{ color: colors.text.low, fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{type}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Memory & Learnings ───────────────────────────────────────────
function AdminMemory() {
  const colors = useThemeColors();
  const s = useAdminStyles();
  const corrections = useLocalData<Array<Record<string, unknown>>>('voicelab_corrections_cache', []);
  const [filter, setFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return corrections;
    return corrections.filter(c => c.feedbackType === filter);
  }, [corrections, filter]);

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>
      <h2 style={s.heading}>Memory & Learnings</h2>
      <p style={{ ...s.subheading, marginBottom: '1.5rem' }}>All user feedback and corrections across users</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['all', 'thumbs_up', 'thumbs_down', 'edit', 'comment'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...s.btn(filter === f ? 'primary' : 'secondary'),
            padding: '0.375rem 0.75rem', fontSize: '0.75rem',
          }}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
            {f !== 'all' && ` (${corrections.filter(c => c.feedbackType === f).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={s.card}>
        {filtered.length === 0 ? (
          <p style={{ color: colors.text.low, fontSize: '0.875rem' }}>No feedback matches this filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Original Content</th>
                  <th style={s.th}>Edited / Comment</th>
                  <th style={s.th}>Ecosystem</th>
                  <th style={s.th}>Channel</th>
                  <th style={s.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((c, i) => (
                  <tr key={i}>
                    <td style={s.td}>
                      <span style={s.badge(
                        (c.feedbackType as string) === 'thumbs_up' ? 'green' :
                        (c.feedbackType as string) === 'thumbs_down' ? 'red' :
                        (c.feedbackType as string) === 'edit' ? 'blue' : 'yellow'
                      )}>
                        {c.feedbackType as string}
                      </span>
                    </td>
                    <td style={{ ...s.td, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(c.originalContent as string || '').slice(0, 100)}
                    </td>
                    <td style={{ ...s.td, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(c.editedContent as string) || (c.comment as string) || '—'}
                    </td>
                    <td style={s.td}>{c.ecosystem as string || '—'}</td>
                    <td style={s.td}>{c.channel as string || '—'}</td>
                    <td style={{ ...s.td, fontSize: '0.75rem', color: colors.text.low, whiteSpace: 'nowrap' }}>
                      {new Date(c.timestamp as number).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 50 && (
              <p style={{ color: colors.text.low, fontSize: '0.75rem', marginTop: '0.75rem' }}>
                Showing 50 of {filtered.length} items.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Knowledge Base ───────────────────────────────────────────────
function AdminKnowledge() {
  const colors = useThemeColors();
  const s = useAdminStyles();

  // Static counts from the seed data categories
  const knowledgeTypes = [
    { type: 'avoid_word', label: 'Avoid Words', count: '~283', color: '#ef4444' },
    { type: 'preferred_word', label: 'Preferred Vocabulary', count: '~200', color: '#22c55e' },
    { type: 'auto_fix', label: 'Auto-Fix Rules', count: '~33', color: '#3b82f6' },
    { type: 'product_definition', label: 'Product Definitions', count: '14', color: '#8b5cf6' },
    { type: 'festival', label: 'Festivals', count: '11', color: '#f59e0b' },
    { type: 'approved_example', label: 'Approved Examples', count: '—', color: '#06b6d4' },
  ];

  const examples = useLocalData<Array<Record<string, unknown>>>('voicelab_saved_examples', []);

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>
      <h2 style={s.heading}>Knowledge Base</h2>
      <p style={{ ...s.subheading, marginBottom: '1.5rem' }}>Managed rules, vocabulary, and content examples</p>

      {/* Type Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {knowledgeTypes.map((kt) => (
          <div key={kt.type} style={s.card}>
            <p style={s.label}>{kt.label}</p>
            <p style={{ ...s.stat, color: kt.color, marginTop: '0.5rem', fontSize: '1.5rem' }}>{kt.count}</p>
            <p style={{ color: colors.text.low, fontSize: '0.6875rem', marginTop: '0.25rem' }}>{kt.type}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ ...s.card, marginBottom: '1.5rem', background: colors.accent + '08', borderColor: colors.accent + '30' }}>
        <p style={{ color: colors.text.high, fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          How to manage knowledge
        </p>
        <ul style={{ color: colors.text.medium, fontSize: '0.8125rem', paddingLeft: '1.25rem', lineHeight: 1.6, margin: 0 }}>
          <li><strong>Seed data:</strong> Run <code style={{ background: colors.stroke.low, padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem' }}>npx convex run seed:seedAll</code> to populate the knowledge base</li>
          <li><strong>Embeddings:</strong> Run <code style={{ background: colors.stroke.low, padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem' }}>npx convex run embeddings:backfillEmbeddings</code> to enable RAG search</li>
          <li><strong>Vocab rules</strong> (avoid words, preferred words) are managed here — no code deploy needed</li>
          <li><strong>Regex rules</strong> require a code deploy to <code style={{ background: colors.stroke.low, padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem' }}>allAgents.ts</code></li>
        </ul>
      </div>

      {/* Saved Examples */}
      <div style={s.card}>
        <p style={{ ...s.label, marginBottom: '0.75rem' }}>Locally Saved Examples ({examples.length})</p>
        {examples.length === 0 ? (
          <p style={{ color: colors.text.low, fontSize: '0.875rem' }}>No examples saved yet. Users can save approved content via the bookmark icon.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Content</th>
                <th style={s.th}>Ecosystem</th>
                <th style={s.th}>Channel</th>
                <th style={s.th}>Saved</th>
              </tr>
            </thead>
            <tbody>
              {examples.slice(0, 20).map((ex, i) => (
                <tr key={i}>
                  <td style={{ ...s.td, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(ex.content as string || '').slice(0, 120)}
                  </td>
                  <td style={s.td}>{ex.ecosystem as string || '—'}</td>
                  <td style={s.td}>{ex.channel as string || '—'}</td>
                  <td style={{ ...s.td, fontSize: '0.75rem', color: colors.text.low }}>
                    {new Date(ex.timestamp as number).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Users ────────────────────────────────────────────────────────
function AdminUsers() {
  const colors = useThemeColors();
  const s = useAdminStyles();

  // Read local user profile + any synced profiles
  const [localProfile, setLocalProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('voicelab_user_profile');
      if (stored) setLocalProfile(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>
      <h2 style={s.heading}>Users</h2>
      <p style={{ ...s.subheading, marginBottom: '1.5rem' }}>Registered user profiles (device-based)</p>

      {/* Info */}
      <div style={{ ...s.card, marginBottom: '1.5rem', background: '#3b82f6' + '08', borderColor: '#3b82f6' + '30' }}>
        <p style={{ color: colors.text.medium, fontSize: '0.8125rem' }}>
          Users are identified by device UUID (no login required). Profile data is collected during onboarding
          and synced to Convex. When Convex is connected, this page will show all users across devices.
        </p>
      </div>

      {/* Local User */}
      <div style={s.card}>
        <p style={{ ...s.label, marginBottom: '1rem' }}>Current Device Profile</p>
        {localProfile ? (
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <span style={{ color: colors.text.low }}>Name</span>
            <span style={{ color: colors.text.high, fontWeight: 500 }}>{localProfile.name as string}</span>
            <span style={{ color: colors.text.low }}>Role</span>
            <span style={{ color: colors.text.high }}><span style={s.badge('blue')}>{localProfile.role as string}</span></span>
            <span style={{ color: colors.text.low }}>Product</span>
            <span style={{ color: colors.text.high }}>{localProfile.product as string}</span>
            <span style={{ color: colors.text.low }}>Device ID</span>
            <span style={{ color: colors.text.low, fontSize: '0.75rem', fontFamily: 'monospace' }}>{localProfile.deviceId as string}</span>
          </div>
        ) : (
          <p style={{ color: colors.text.low, fontSize: '0.875rem' }}>No local profile found. Complete onboarding first.</p>
        )}
      </div>
    </div>
  );
}

// ── System Config ────────────────────────────────────────────────
function AdminConfig() {
  const colors = useThemeColors();
  const s = useAdminStyles();

  const featureFlags = [
    { key: 'VITE_ENABLE_CONVEX_SYNC', label: 'Convex Sync', value: import.meta.env.VITE_ENABLE_CONVEX_SYNC === 'true' },
    { key: 'VITE_ENABLE_PERSONA', label: 'Persona Engine', value: import.meta.env.VITE_ENABLE_PERSONA === 'true' },
    { key: 'VITE_ENABLE_KNOWLEDGE_BASE', label: 'Knowledge Base', value: import.meta.env.VITE_ENABLE_KNOWLEDGE_BASE === 'true' },
    { key: 'VITE_ENABLE_LEARNING', label: 'Learning Engine', value: import.meta.env.VITE_ENABLE_LEARNING === 'true' },
    { key: 'VITE_ENABLE_RAG', label: 'RAG (Vector Search)', value: import.meta.env.VITE_ENABLE_RAG === 'true' },
  ];

  const envInfo = [
    { label: 'Convex URL', value: import.meta.env.VITE_CONVEX_URL || 'Not configured' },
    { label: 'Default LLM', value: import.meta.env.VITE_DEFAULT_LLM_PROVIDER || 'qwen-text' },
    { label: 'HuggingFace Model', value: import.meta.env.VITE_HUGGINGFACE_MODEL || 'qwen25-7b' },
    { label: 'Fallback Chain', value: import.meta.env.VITE_LLM_FALLBACK_CHAIN || 'qwen-text,huggingface' },
  ];

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>
      <h2 style={s.heading}>System Config</h2>
      <p style={{ ...s.subheading, marginBottom: '1.5rem' }}>Feature flags and environment configuration</p>

      {/* Feature Flags */}
      <div style={{ ...s.card, marginBottom: '1.5rem' }}>
        <p style={{ ...s.label, marginBottom: '1rem' }}>Feature Flags</p>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Feature</th>
              <th style={s.th}>Env Variable</th>
              <th style={s.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {featureFlags.map((ff) => (
              <tr key={ff.key}>
                <td style={{ ...s.td, fontWeight: 500 }}>{ff.label}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '0.75rem', color: colors.text.low }}>{ff.key}</td>
                <td style={s.td}>
                  <span style={s.badge(ff.value ? 'green' : 'gray')}>
                    {ff.value ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: colors.text.low, fontSize: '0.75rem', marginTop: '0.75rem' }}>
          Feature flags are set via environment variables. Change them in <code style={{ background: colors.stroke.low, padding: '0.125rem 0.375rem', borderRadius: '4px' }}>.env</code> and restart the dev server.
        </p>
      </div>

      {/* Environment Info */}
      <div style={s.card}>
        <p style={{ ...s.label, marginBottom: '1rem' }}>Environment</p>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem 1rem', fontSize: '0.8125rem' }}>
          {envInfo.map((info) => (
            <div key={info.label} style={{ display: 'contents' }}>
              <span style={{ color: colors.text.low }}>{info.label}</span>
              <span style={{ color: colors.text.high, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {info.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Admin Layout ─────────────────────────────────────────────────
export default function AdminLayout() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  );
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const colors = useThemeColors();

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
    <div style={{ display: 'flex', height: '100vh', background: colors.background.ghost, overflow: 'hidden' }}>
      {/* Nav Rail */}
      <nav style={{
        width: '220px', minWidth: '220px',
        borderRight: `1px solid ${colors.stroke.low}`,
        background: colors.background.subtle,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: `1px solid ${colors.stroke.low}` }}>
          <h1 style={{ color: colors.text.high, fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
            Voice Lab Admin
          </h1>
          <p style={{ color: colors.text.low, fontSize: '0.6875rem', margin: '0.25rem 0 0' }}>
            Content System Management
          </p>
        </div>

        {/* Nav Items */}
        <div style={{ flex: 1, padding: '0.375rem', overflow: 'auto' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px',
                border: 'none',
                background: activeSection === item.id ? colors.accent + '15' : 'transparent',
                color: activeSection === item.id ? colors.accent : colors.text.medium,
                fontSize: '0.8125rem', fontWeight: activeSection === item.id ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.75rem 1rem', borderTop: `1px solid ${colors.stroke.low}`,
          fontSize: '0.6875rem', color: colors.text.low,
        }}>
          <button onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthenticated(false); }}
            style={{ background: 'none', border: 'none', color: colors.text.low, cursor: 'pointer', fontSize: '0.6875rem', padding: 0 }}>
            Sign out
          </button>
          {' · '}
          <a href="/" style={{ color: colors.text.low, textDecoration: 'none' }}>Back to Voice Lab</a>
        </div>
      </nav>

      {/* Content Area */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {renderContent()}
      </main>
    </div>
  );
}
