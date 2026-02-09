import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useThemeColors } from '../theme/useColors';
import { AdminSidebar, type AdminSection } from './components/AdminSidebar';
import { AdminStatCard } from './components/AdminStatCard';
import { AdminTable, AdminTableRow, AdminTableCell } from './components/AdminTable';

// ── Admin Auth Gate ──────────────────────────────────────────────
const ADMIN_PASSPHRASE = import.meta.env.VITE_ADMIN_PASSPHRASE || 'voicelab-admin';
const SESSION_KEY = 'voicelab_admin_auth';

function AdminAuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const theme = useThemeColors();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');

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
            className="w-full rounded-lg mt-4 font-medium cursor-pointer transition-opacity hover:opacity-90"
            style={{
              height: '36px',
              fontSize: '13px',
              backgroundColor: theme.accent,
              color: '#fff',
              border: 'none',
            }}
          >
            Enter Admin Panel
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

// ── Local data hooks ─────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════════

// ── Dashboard ────────────────────────────────────────────────────
function AdminDashboard() {
  const theme = useThemeColors();
  const corrections = useLocalData<Array<{ feedbackType: string; timestamp: number; originalContent?: string }>>('voicelab_corrections_cache', []);
  const examples = useLocalData<Array<{ timestamp: number }>>('voicelab_saved_examples', []);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const week = useMemo(() => Date.now() - 7 * 24 * 60 * 60 * 1000, []);

  const todayCount = corrections.filter(c => c.timestamp >= today).length;
  const weekCount = corrections.filter(c => c.timestamp >= week).length;
  const thumbsUp = corrections.filter(c => c.feedbackType === 'thumbs_up').length;
  const thumbsDown = corrections.filter(c => c.feedbackType === 'thumbs_down').length;
  const edits = corrections.filter(c => c.feedbackType === 'edit').length;
  const comments = corrections.filter(c => c.feedbackType === 'comment').length;

  return (
    <>
      <SectionHeader title="Dashboard" subtitle="System overview and recent activity" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <AdminStatCard label="Today" value={todayCount} colorClass="text-orange-500" />
        <AdminStatCard label="This Week" value={weekCount} colorClass="text-blue-500" />
        <AdminStatCard label="Total Feedback" value={corrections.length} colorClass="text-purple-500" />
        <AdminStatCard label="Saved Examples" value={examples.length} colorClass="text-green-500" />
      </div>

      {/* Feedback Breakdown */}
      <AdminCard className="p-4 mb-5">
        <CardLabel>Feedback Breakdown</CardLabel>
        <div className="flex flex-wrap gap-6">
          {[
            { label: 'Thumbs Up', value: thumbsUp, pct: corrections.length ? Math.round(thumbsUp / corrections.length * 100) : 0 },
            { label: 'Thumbs Down', value: thumbsDown, pct: corrections.length ? Math.round(thumbsDown / corrections.length * 100) : 0 },
            { label: 'Edits', value: edits, pct: corrections.length ? Math.round(edits / corrections.length * 100) : 0 },
            { label: 'Comments', value: comments, pct: corrections.length ? Math.round(comments / corrections.length * 100) : 0 },
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
        <CardLabel>Recent Feedback</CardLabel>
        <AdminTable
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'content', label: 'Content (preview)' },
            { key: 'time', label: 'Time' },
          ]}
          isEmpty={corrections.length === 0}
          emptyMessage="No feedback recorded yet."
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
  const corrections = useLocalData<Array<Record<string, unknown>>>('voicelab_corrections_cache', []);

  const byEcosystem = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { const eco = c.ecosystem as string || 'Unknown'; counts[eco] = (counts[eco] || 0) + 1; }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

  const byChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { const ch = c.channel as string || 'Unknown'; counts[ch] = (counts[ch] || 0) + 1; }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

  const byType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { const t = c.feedbackType as string || 'Unknown'; counts[t] = (counts[t] || 0) + 1; }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

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
      <SectionHeader title="Analytics" subtitle="Content quality metrics and usage patterns" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <AdminCard className="p-4">
          <CardLabel>By Ecosystem</CardLabel>
          {byEcosystem.length === 0
            ? <span style={{ color: theme.text.low, fontSize: '13px' }}>No data yet</span>
            : byEcosystem.map(([eco, count]) => <BarRow key={eco} label={eco} count={count} color={theme.accent} />)
          }
        </AdminCard>

        <AdminCard className="p-4">
          <CardLabel>By Channel</CardLabel>
          {byChannel.length === 0
            ? <span style={{ color: theme.text.low, fontSize: '13px' }}>No data yet</span>
            : byChannel.map(([ch, count]) => <BarRow key={ch} label={ch} count={count} color="#3b82f6" />)
          }
        </AdminCard>
      </div>

      <AdminCard className="p-4">
        <CardLabel>Feedback Type Distribution</CardLabel>
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
  const corrections = useLocalData<Array<Record<string, unknown>>>('voicelab_corrections_cache', []);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let result = filter === 'all' ? corrections : corrections.filter(c => c.feedbackType === filter);
    if (searchQuery) {
      result = result.filter(c =>
        (c.originalContent as string || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.editedContent as string || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.comment as string || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [corrections, filter, searchQuery]);

  const filterOptions = ['all', 'thumbs_up', 'thumbs_down', 'edit', 'comment'];

  return (
    <>
      <SectionHeader title="Memory & Learnings" subtitle="All user feedback and corrections" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
                {f === 'all' ? 'All' : f.replace('_', ' ')}
                {f !== 'all' && ` (${corrections.filter(c => c.feedbackType === f).length})`}
              </button>
            );
          })}
        </div>

        <div className="sm:ml-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feedback..."
            aria-label="Search feedback"
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

      {/* Table */}
      <AdminCard className="p-4">
        <AdminTable
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'original', label: 'Original Content' },
            { key: 'edited', label: 'Edited / Comment' },
            { key: 'eco', label: 'Ecosystem' },
            { key: 'ch', label: 'Channel' },
            { key: 'time', label: 'Time' },
          ]}
          isEmpty={filtered.length === 0}
          emptyMessage={searchQuery ? 'No feedback matches your search.' : 'No feedback matches this filter.'}
        >
          {filtered.slice(0, 50).map((c, i) => (
            <AdminTableRow key={i}>
              <AdminTableCell><FeedbackBadge type={c.feedbackType as string} /></AdminTableCell>
              <AdminTableCell className="max-w-[200px] truncate">{(c.originalContent as string || '').slice(0, 100)}</AdminTableCell>
              <AdminTableCell className="max-w-[200px] truncate">{(c.editedContent as string) || (c.comment as string) || '—'}</AdminTableCell>
              <AdminTableCell>{c.ecosystem as string || '—'}</AdminTableCell>
              <AdminTableCell>{c.channel as string || '—'}</AdminTableCell>
              <AdminTableCell className="whitespace-nowrap">
                <span style={{ color: theme.text.low, fontSize: '12px' }}>
                  {new Date(c.timestamp as number).toLocaleString()}
                </span>
              </AdminTableCell>
            </AdminTableRow>
          ))}
        </AdminTable>
        {filtered.length > 50 && (
          <span className="block mt-2" style={{ color: theme.text.low, fontSize: '12px' }}>
            Showing 50 of {filtered.length} items.
          </span>
        )}
      </AdminCard>
    </>
  );
}

// ── Knowledge Base ───────────────────────────────────────────────
function AdminKnowledge() {
  const theme = useThemeColors();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const knowledgeTypes = [
    { type: 'avoid_word', label: 'Avoid Words', count: '~283', colorClass: 'text-red-500' },
    { type: 'preferred_word', label: 'Preferred Vocab', count: '~200', colorClass: 'text-green-500' },
    { type: 'auto_fix', label: 'Auto-Fix Rules', count: '~33', colorClass: 'text-blue-500' },
    { type: 'product_definition', label: 'Product Defs', count: '14', colorClass: 'text-purple-500' },
    { type: 'festival', label: 'Festivals', count: '11', colorClass: 'text-yellow-500' },
    { type: 'approved_example', label: 'Examples', count: '—', colorClass: 'text-cyan-500' },
  ];

  const examples = useLocalData<Array<Record<string, unknown>>>('voicelab_saved_examples', []);

  const handleCardClick = (type: string) => {
    setSelectedType(prev => prev === type ? null : type);
  };

  // Sample data for drill-down views
  const sampleAvoidWords = ['giveaway', 'free', 'cash', 'prize', 'winner', 'click here', 'urgent', 'limited time', 'act now', 'guarantee', 'risk-free', 'no obligation'];
  const samplePreferredWords = ['explore', 'discover', 'learn more', 'find out', 'get started', 'join us', 'welcome', 'benefit', 'advantage', 'feature'];
  const sampleAutoFix = [
    { from: 'dont', to: "don't" },
    { from: 'wont', to: "won't" },
    { from: 'cant', to: "can't" },
    { from: 'im', to: "I'm" },
    { from: 'youre', to: "you're" },
  ];
  const sampleProducts = [
    { name: 'JioFiber', definition: 'High-speed broadband internet service' },
    { name: 'JioPhone', definition: 'Affordable 4G feature phone' },
    { name: 'JioMart', definition: 'Online grocery and retail platform' },
    { name: 'JioCinema', definition: 'Streaming service for movies and shows' },
  ];
  const sampleFestivals = ['Diwali', 'Holi', 'Eid', 'Christmas', 'New Year', 'Independence Day', 'Republic Day', 'Raksha Bandhan'];

  const renderDetailPanel = () => {
    if (!selectedType) return null;

    switch (selectedType) {
      case 'avoid_word':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>Avoid Words - Sample</CardLabel>
            <div className="flex flex-wrap gap-2">
              {sampleAvoidWords.map((word, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md px-2 py-1"
                  style={{
                    fontSize: '12px',
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    color: '#ef4444',
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              These words trigger warnings in the content editor.
            </span>
          </AdminCard>
        );

      case 'preferred_word':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>Preferred Vocabulary - Sample</CardLabel>
            <div className="flex flex-wrap gap-2">
              {samplePreferredWords.map((word, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md px-2 py-1"
                  style={{
                    fontSize: '12px',
                    backgroundColor: 'rgba(34,197,94,0.12)',
                    color: '#22c55e',
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              These are recommended alternatives suggested by the content editor.
            </span>
          </AdminCard>
        );

      case 'auto_fix':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>Auto-Fix Rules - Sample</CardLabel>
            <AdminTable
              columns={[
                { key: 'from', label: 'Original' },
                { key: 'to', label: 'Replacement' },
              ]}
              isEmpty={false}
            >
              {sampleAutoFix.map((rule, i) => (
                <AdminTableRow key={i}>
                  <AdminTableCell>
                    <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '12px' }}>
                      {rule.from}
                    </code>
                  </AdminTableCell>
                  <AdminTableCell>
                    <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '12px' }}>
                      {rule.to}
                    </code>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTable>
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              These rules automatically correct common typos and formatting issues.
            </span>
          </AdminCard>
        );

      case 'product_definition':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>Product Definitions - Sample</CardLabel>
            <AdminTable
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'def', label: 'Definition' },
              ]}
              isEmpty={false}
            >
              {sampleProducts.map((prod, i) => (
                <AdminTableRow key={i}>
                  <AdminTableCell>
                    <span className="font-semibold" style={{ color: theme.text.high }}>
                      {prod.name}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>{prod.definition}</AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTable>
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              Official product definitions used for consistent messaging.
            </span>
          </AdminCard>
        );

      case 'festival':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>Festivals - Sample</CardLabel>
            <div className="flex flex-wrap gap-2">
              {sampleFestivals.map((fest, i) => (
                <span
                  key={i}
                  className="inline-block rounded-md px-2 py-1"
                  style={{
                    fontSize: '12px',
                    backgroundColor: 'rgba(245,158,11,0.12)',
                    color: '#f59e0b',
                  }}
                >
                  {fest}
                </span>
              ))}
            </div>
            <span className="block mt-3" style={{ color: theme.text.low, fontSize: '11px' }}>
              Festival dates and cultural context for content planning.
            </span>
          </AdminCard>
        );

      case 'approved_example':
        return (
          <AdminCard className="p-4 mt-4">
            <CardLabel>Locally Saved Examples ({examples.length})</CardLabel>
            <AdminTable
              columns={[
                { key: 'content', label: 'Content' },
                { key: 'eco', label: 'Ecosystem' },
                { key: 'ch', label: 'Channel' },
                { key: 'saved', label: 'Saved' },
              ]}
              isEmpty={examples.length === 0}
              emptyMessage="No examples saved yet. Users can save via the bookmark icon."
            >
              {examples.slice(0, 20).map((ex, i) => (
                <AdminTableRow key={i}>
                  <AdminTableCell className="max-w-md truncate">{(ex.content as string || '').slice(0, 120)}</AdminTableCell>
                  <AdminTableCell>{ex.ecosystem as string || '—'}</AdminTableCell>
                  <AdminTableCell>{ex.channel as string || '—'}</AdminTableCell>
                  <AdminTableCell>
                    <span style={{ color: theme.text.low, fontSize: '12px' }}>
                      {new Date(ex.timestamp as number).toLocaleDateString()}
                    </span>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTable>
          </AdminCard>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <SectionHeader title="Knowledge Base" subtitle="Managed rules, vocabulary, and content examples" />

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
            How to manage knowledge
          </span>
          <ul className="space-y-1 pl-4" style={{ fontSize: '12px', color: theme.text.medium, listStyleType: 'disc' }}>
            <li><strong>Seed data:</strong> Run <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>npx convex run seed:seedAll</code></li>
            <li><strong>Embeddings:</strong> Run <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>npx convex run embeddings:backfillEmbeddings</code></li>
            <li><strong>Vocab rules</strong> are managed here -- no code deploy needed</li>
            <li><strong>Regex rules</strong> require a code deploy to <code className="px-1 py-0.5 rounded" style={{ backgroundColor: theme.stroke.low, fontSize: '11px' }}>allAgents.ts</code></li>
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
  const [searchQuery, setSearchQuery] = useState('');
  const users = useQuery(api.users.listAll);
  const [localProfile, setLocalProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('voicelab_user_profile');
      if (stored) setLocalProfile(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      user.product.toLowerCase().includes(query) ||
      user.deviceId.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  return (
    <>
      <SectionHeader title="Users" subtitle="Registered user profiles (device-based)" />

      {/* If Convex not connected */}
      {users === undefined ? (
        <AdminCard className="p-4 mb-5">
          <span className="block font-medium mb-2" style={{ color: theme.text.high, fontSize: '13px' }}>
            Convex Not Connected
          </span>
          <span className="block mb-3" style={{ color: theme.text.medium, fontSize: '12px' }}>
            Users are identified by device UUID (no login required). Profile data is collected during onboarding and synced to Convex when available.
          </span>
          {localProfile && (
            <>
              <CardLabel>Current Device Profile</CardLabel>
              <div className="flex items-center gap-3 mt-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-semibold"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#fff',
                    fontSize: '12px',
                  }}
                >
                  {(localProfile.name as string || '?')[0].toUpperCase()}
                </div>
                <div>
                  <span className="block font-medium" style={{ fontSize: '13px', color: theme.text.high }}>
                    {localProfile.name as string}
                  </span>
                  <span className="block" style={{ fontSize: '11px', color: theme.text.low }}>
                    {localProfile.role as string} • {localProfile.product as string}
                  </span>
                </div>
              </div>
            </>
          )}
        </AdminCard>
      ) : (
        <>
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              aria-label="Search users"
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
                { key: 'lastSeen', label: 'Last Seen' },
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
      )}
    </>
  );
}

// ── System Config ────────────────────────────────────────────────
function AdminConfig() {
  const theme = useThemeColors();

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
    <>
      <SectionHeader title="System Config" subtitle="Feature flags and environment configuration" />

      {/* Feature Flags */}
      <AdminCard className="p-4 mb-5">
        <CardLabel>Feature Flags</CardLabel>
        <div className="space-y-0">
          {featureFlags.map((ff) => (
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
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  );
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const theme = useThemeColors();

  const handleSignOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  }, []);

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
