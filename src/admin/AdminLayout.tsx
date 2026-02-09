import { useState, useCallback, useEffect, useMemo } from 'react';
import { useThemeColors } from '../theme/useColors';
import { 
  Card, 
  Input, 
  Button, 
  Title, 
  Text, 
  Label,
  Display,
  Headline,
  Chip,
  Switch,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  SearchField,
  Avatar,
  Divider,
  Icon,
} from '@marcelinodzn/ds-react';
import { LazyIcon } from '@marcelinodzn/ds-react/icons';
import { SearchableDropdown } from '../components/SearchableDropdown';

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
    <div className="flex items-center justify-center min-h-screen">
      <Card variant="elevated" padding="L" className="w-full max-w-md">
        <div className="space-y-4">
          <div>
            <Title>Voice Lab Admin</Title>
            <Text variant="body" className="mt-2">
              Enter the admin passphrase to continue.
            </Text>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                value={passphrase}
                onChange={(e) => { 
                  setPassphrase(e.target.value); 
                  setError(''); 
                }}
                placeholder="Passphrase"
                autoFocus
                aria-label="Admin passphrase"
                className="w-full"
              />
              {error && (
                <Text variant="caption" className="text-red-500 mt-1">
                  {error}
                </Text>
              )}
            </div>
            
            <Button 
              type="submit" 
              appearance="primary" 
              size="L"
              onPress={() => {}}
              className="w-full"
            >
              Enter Admin Panel
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────
type AdminSection = 'dashboard' | 'analytics' | 'memory' | 'knowledge' | 'users' | 'config';

const NAV_ITEMS: { id: AdminSection; label: string; iconName: string }[] = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'IcBarChart3' },
  { id: 'analytics', label: 'Analytics', iconName: 'IcTrendingUp' },
  { id: 'memory', label: 'Memory & Learnings', iconName: 'IcDatabase' },
  { id: 'knowledge', label: 'Knowledge Base', iconName: 'IcBook' },
  { id: 'users', label: 'Users', iconName: 'IcUsers' },
  { id: 'config', label: 'System Config', iconName: 'IcSettings' },
];

// ── Utility Components ───────────────────────────────────────────

// Feedback badge color mapper
function getFeedbackChipAppearance(feedbackType: string): 'filled' | 'outlined' {
  return 'filled';
}

function getFeedbackChipColor(feedbackType: string): string {
  const colors: Record<string, string> = {
    'thumbs_up': 'text-green-600 bg-green-50 dark:bg-green-950',
    'thumbs_down': 'text-red-600 bg-red-50 dark:bg-red-950',
    'edit': 'text-blue-600 bg-blue-50 dark:bg-blue-950',
    'comment': 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
  };
  return colors[feedbackType] || 'text-gray-600 bg-gray-50 dark:bg-gray-950';
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
  const corrections = useLocalData<Array<{ feedbackType: string; timestamp: number; originalContent?: string }>>('voicelab_corrections_cache', []);
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

  const stats = [
    { label: 'Today\'s Feedback', value: todayCorrections, colorClass: 'text-orange-500' },
    { label: 'This Week', value: weekCorrections, colorClass: 'text-blue-500' },
    { label: 'Total Feedback', value: corrections.length, colorClass: 'text-purple-500' },
    { label: 'Saved Examples', value: examples.length, colorClass: 'text-green-500' },
  ];

  const feedbackBreakdown = [
    { label: 'Thumbs Up', value: thumbsUp, iconName: 'IcThumbsUp', pct: corrections.length ? Math.round(thumbsUp / corrections.length * 100) : 0 },
    { label: 'Thumbs Down', value: thumbsDown, iconName: 'IcThumbsDown', pct: corrections.length ? Math.round(thumbsDown / corrections.length * 100) : 0 },
    { label: 'Edits', value: edits, iconName: 'IcEdit', pct: corrections.length ? Math.round(edits / corrections.length * 100) : 0 },
    { label: 'Comments', value: comments, iconName: 'IcMessageSquare', pct: corrections.length ? Math.round(comments / corrections.length * 100) : 0 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Headline>Dashboard</Headline>
        <Text variant="body" className="mt-1">System overview and recent activity</Text>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} variant="outlined" padding="M">
            <Label className="uppercase text-xs opacity-60">{stat.label}</Label>
            <Display className={`mt-2 ${stat.colorClass}`}>{stat.value}</Display>
          </Card>
        ))}
      </div>

      {/* Feedback Breakdown */}
      <Card variant="outlined" padding="M">
        <Label className="uppercase text-xs opacity-60 mb-4">Feedback Breakdown</Label>
        <div className="flex flex-wrap gap-8">
          {feedbackBreakdown.map((fb) => (
            <div key={fb.label} className="text-center min-w-[100px]">
              <Icon size="L">
                <LazyIcon name={fb.iconName} />
              </Icon>
              <Headline className="mt-2">{fb.value}</Headline>
              <Text variant="caption" className="opacity-60">
                {fb.label} ({fb.pct}%)
              </Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card variant="outlined" padding="M">
        <Label className="uppercase text-xs opacity-60 mb-4">Recent Feedback</Label>
        {corrections.length === 0 ? (
          <Text variant="body" className="opacity-60">No feedback recorded yet.</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.stroke.low}` }}>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Type</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Content (preview)</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Time</Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {corrections.slice(0, 10).map((c, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.stroke.low}` }}>
                    <td className="py-2 px-3">
                      <Chip 
                        appearance="filled" 
                        isSelected={false}
                        className={getFeedbackChipColor(c.feedbackType)}
                      >
                        {c.feedbackType}
                      </Chip>
                    </td>
                    <td className="py-2 px-3 max-w-md truncate">
                      <Text variant="body">{(c.originalContent || '').slice(0, 80)}</Text>
                    </td>
                    <td className="py-2 px-3">
                      <Text variant="caption" className="opacity-60">
                        {new Date(c.timestamp).toLocaleString()}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Analytics ────────────────────────────────────────────────────
function AdminAnalytics() {
  const colors = useThemeColors();
  const corrections = useLocalData<Array<Record<string, unknown>>>('voicelab_corrections_cache', []);

  const byEcosystem = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { 
      const eco = c.ecosystem as string || 'Unknown';
      counts[eco] = (counts[eco] || 0) + 1; 
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

  const byChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { 
      const ch = c.channel as string || 'Unknown';
      counts[ch] = (counts[ch] || 0) + 1; 
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

  const byType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corrections) { 
      const type = c.feedbackType as string || 'Unknown';
      counts[type] = (counts[type] || 0) + 1; 
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [corrections]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Headline>Analytics</Headline>
        <Text variant="body" className="mt-1">Content quality metrics and usage patterns</Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Ecosystem */}
        <Card variant="outlined" padding="M">
          <Label className="uppercase text-xs opacity-60 mb-3">Feedback by Ecosystem</Label>
          {byEcosystem.length === 0 ? (
            <Text variant="body" className="opacity-60">No data yet</Text>
          ) : (
            <div className="space-y-2">
              {byEcosystem.map(([eco, count]) => (
                <div 
                  key={eco} 
                  className="flex justify-between items-center py-1.5"
                  style={{ borderBottom: `1px solid ${colors.stroke.low}` }}
                >
                  <Text variant="body">{eco}</Text>
                  <Text variant="body" className="text-orange-500 font-semibold">{count}</Text>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* By Channel */}
        <Card variant="outlined" padding="M">
          <Label className="uppercase text-xs opacity-60 mb-3">Feedback by Channel</Label>
          {byChannel.length === 0 ? (
            <Text variant="body" className="opacity-60">No data yet</Text>
          ) : (
            <div className="space-y-2">
              {byChannel.map(([ch, count]) => (
                <div 
                  key={ch} 
                  className="flex justify-between items-center py-1.5"
                  style={{ borderBottom: `1px solid ${colors.stroke.low}` }}
                >
                  <Text variant="body">{ch}</Text>
                  <Text variant="body" className="text-blue-500 font-semibold">{count}</Text>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* By Type */}
      <Card variant="outlined" padding="M">
        <Label className="uppercase text-xs opacity-60 mb-4">Feedback Type Distribution</Label>
        <div className="flex flex-wrap gap-4">
          {byType.map(([type, count]) => (
            <div 
              key={type} 
              className="flex-1 min-w-[120px] text-center p-3 rounded-lg"
              style={{ background: colors.background.ghost }}
            >
              <Headline>{count}</Headline>
              <Text variant="caption" className="opacity-60 mt-1">{type}</Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Memory & Learnings ───────────────────────────────────────────
function AdminMemory() {
  const colors = useThemeColors();
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Headline>Memory & Learnings</Headline>
        <Text variant="body" className="mt-1">All user feedback and corrections across users</Text>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((f) => (
            <Chip
              key={f}
              appearance="filled"
              isSelected={filter === f}
              onPress={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
              {f !== 'all' && ` (${corrections.filter(c => c.feedbackType === f).length})`}
            </Chip>
          ))}
        </div>
        
        <div className="sm:ml-auto sm:w-64">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search feedback..."
            onClear={() => setSearchQuery('')}
            aria-label="Search feedback"
          />
        </div>
      </div>

      {/* Table */}
      <Card variant="outlined" padding="M">
        {filtered.length === 0 ? (
          <Text variant="body" className="opacity-60">
            {searchQuery ? 'No feedback matches your search.' : 'No feedback matches this filter.'}
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.stroke.low}` }}>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Type</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Original Content</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Edited / Comment</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Ecosystem</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Channel</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Time</Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map((c, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.stroke.low}` }}>
                    <td className="py-2 px-3">
                      <Chip 
                        appearance="filled" 
                        isSelected={false}
                        className={getFeedbackChipColor(c.feedbackType as string)}
                      >
                        {c.feedbackType as string}
                      </Chip>
                    </td>
                    <td className="py-2 px-3 max-w-xs truncate">
                      <Text variant="body">{(c.originalContent as string || '').slice(0, 100)}</Text>
                    </td>
                    <td className="py-2 px-3 max-w-xs truncate">
                      <Text variant="body">{(c.editedContent as string) || (c.comment as string) || '—'}</Text>
                    </td>
                    <td className="py-2 px-3">
                      <Text variant="body">{c.ecosystem as string || '—'}</Text>
                    </td>
                    <td className="py-2 px-3">
                      <Text variant="body">{c.channel as string || '—'}</Text>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <Text variant="caption" className="opacity-60">
                        {new Date(c.timestamp as number).toLocaleString()}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 50 && (
              <Text variant="caption" className="opacity-60 mt-3">
                Showing 50 of {filtered.length} items.
              </Text>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Knowledge Base ───────────────────────────────────────────────
function AdminKnowledge() {
  const colors = useThemeColors();

  // Static counts from the seed data categories
  const knowledgeTypes = [
    { type: 'avoid_word', label: 'Avoid Words', count: '~283', colorClass: 'text-red-500' },
    { type: 'preferred_word', label: 'Preferred Vocabulary', count: '~200', colorClass: 'text-green-500' },
    { type: 'auto_fix', label: 'Auto-Fix Rules', count: '~33', colorClass: 'text-blue-500' },
    { type: 'product_definition', label: 'Product Definitions', count: '14', colorClass: 'text-purple-500' },
    { type: 'festival', label: 'Festivals', count: '11', colorClass: 'text-yellow-500' },
    { type: 'approved_example', label: 'Approved Examples', count: '—', colorClass: 'text-cyan-500' },
  ];

  const examples = useLocalData<Array<Record<string, unknown>>>('voicelab_saved_examples', []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Headline>Knowledge Base</Headline>
        <Text variant="body" className="mt-1">Managed rules, vocabulary, and content examples</Text>
      </div>

      {/* Type Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {knowledgeTypes.map((kt) => (
          <Card key={kt.type} variant="outlined" padding="M">
            <Label className="uppercase text-xs opacity-60">{kt.label}</Label>
            <Headline className={`mt-2 ${kt.colorClass}`}>{kt.count}</Headline>
            <Text variant="caption" className="opacity-60 mt-1">{kt.type}</Text>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card variant="outlined" padding="M" className="bg-orange-50 dark:bg-orange-950/20">
        <Text variant="body" className="font-medium mb-2">
          How to manage knowledge
        </Text>
        <ul className="space-y-1 pl-5 text-sm opacity-80">
          <li>
            <strong>Seed data:</strong> Run <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: colors.stroke.low }}>npx convex run seed:seedAll</code> to populate the knowledge base
          </li>
          <li>
            <strong>Embeddings:</strong> Run <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: colors.stroke.low }}>npx convex run embeddings:backfillEmbeddings</code> to enable RAG search
          </li>
          <li>
            <strong>Vocab rules</strong> (avoid words, preferred words) are managed here — no code deploy needed
          </li>
          <li>
            <strong>Regex rules</strong> require a code deploy to <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: colors.stroke.low }}>allAgents.ts</code>
          </li>
        </ul>
      </Card>

      {/* Saved Examples */}
      <Card variant="outlined" padding="M">
        <Label className="uppercase text-xs opacity-60 mb-3">Locally Saved Examples ({examples.length})</Label>
        {examples.length === 0 ? (
          <Text variant="body" className="opacity-60">
            No examples saved yet. Users can save approved content via the bookmark icon.
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.stroke.low}` }}>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Content</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Ecosystem</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Channel</Text>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Text variant="caption" className="uppercase opacity-60">Saved</Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {examples.slice(0, 20).map((ex, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${colors.stroke.low}` }}>
                    <td className="py-2 px-3 max-w-md truncate">
                      <Text variant="body">{(ex.content as string || '').slice(0, 120)}</Text>
                    </td>
                    <td className="py-2 px-3">
                      <Text variant="body">{ex.ecosystem as string || '—'}</Text>
                    </td>
                    <td className="py-2 px-3">
                      <Text variant="body">{ex.channel as string || '—'}</Text>
                    </td>
                    <td className="py-2 px-3">
                      <Text variant="caption" className="opacity-60">
                        {new Date(ex.timestamp as number).toLocaleDateString()}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Users ────────────────────────────────────────────────────────
function AdminUsers() {
  const colors = useThemeColors();

  // Read local user profile + any synced profiles
  const [localProfile, setLocalProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('voicelab_user_profile');
      if (stored) setLocalProfile(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Headline>Users</Headline>
        <Text variant="body" className="mt-1">Registered user profiles (device-based)</Text>
      </div>

      {/* Info */}
      <Card variant="outlined" padding="M" className="bg-blue-50 dark:bg-blue-950/20">
        <Text variant="body" className="opacity-80">
          Users are identified by device UUID (no login required). Profile data is collected during onboarding
          and synced to Convex. When Convex is connected, this page will show all users across devices.
        </Text>
      </Card>

      {/* Local User */}
      <Card variant="outlined" padding="M">
        <Label className="uppercase text-xs opacity-60 mb-4">Current Device Profile</Label>
        {localProfile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar 
                name={localProfile.name as string}
                size="L"
              />
              <div>
                <Title>{localProfile.name as string}</Title>
                <Text variant="body" className="opacity-60">{localProfile.product as string}</Text>
              </div>
            </div>
            
            <Divider orientation="horizontal" />
            
            <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm">
              <Text variant="body" className="opacity-60">Role</Text>
              <div>
                <Chip appearance="filled" isSelected={true} className="text-blue-600 bg-blue-50 dark:bg-blue-950">
                  {localProfile.role as string}
                </Chip>
              </div>
              
              <Text variant="body" className="opacity-60">Product</Text>
              <Text variant="body">{localProfile.product as string}</Text>
              
              <Text variant="body" className="opacity-60">Device ID</Text>
              <Text variant="caption" className="font-mono opacity-60">
                {localProfile.deviceId as string}
              </Text>
            </div>
          </div>
        ) : (
          <Text variant="body" className="opacity-60">
            No local profile found. Complete onboarding first.
          </Text>
        )}
      </Card>
    </div>
  );
}

// ── System Config ────────────────────────────────────────────────
function AdminConfig() {
  const colors = useThemeColors();

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <Headline>System Config</Headline>
        <Text variant="body" className="mt-1">Feature flags and environment configuration</Text>
      </div>

      {/* Feature Flags */}
      <Card variant="outlined" padding="M">
        <Label className="uppercase text-xs opacity-60 mb-4">Feature Flags</Label>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.stroke.low}` }}>
                <th className="text-left py-2 px-3">
                  <Text variant="caption" className="uppercase opacity-60">Feature</Text>
                </th>
                <th className="text-left py-2 px-3">
                  <Text variant="caption" className="uppercase opacity-60">Env Variable</Text>
                </th>
                <th className="text-left py-2 px-3">
                  <Text variant="caption" className="uppercase opacity-60">Status</Text>
                </th>
              </tr>
            </thead>
            <tbody>
              {featureFlags.map((ff) => (
                <tr key={ff.key} style={{ borderBottom: `1px solid ${colors.stroke.low}` }}>
                  <td className="py-2 px-3">
                    <Text variant="body" className="font-medium">{ff.label}</Text>
                  </td>
                  <td className="py-2 px-3">
                    <Text variant="caption" className="font-mono opacity-60">{ff.key}</Text>
                  </td>
                  <td className="py-2 px-3">
                    <Switch 
                      isSelected={ff.value}
                      isDisabled={true}
                      aria-label={`${ff.label} status`}
                    >
                      {ff.value ? 'Enabled' : 'Disabled'}
                    </Switch>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Text variant="caption" className="opacity-60 mt-3">
          Feature flags are set via environment variables. Change them in <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: colors.stroke.low }}>.env</code> and restart the dev server.
        </Text>
      </Card>

      {/* Environment Info */}
      <Card variant="outlined" padding="M">
        <Label className="uppercase text-xs opacity-60 mb-4">Environment</Label>
        <div className="grid grid-cols-[160px_1fr] gap-y-2 gap-x-4 text-sm">
          {envInfo.map((info) => (
            <div key={info.label} className="contents">
              <Text variant="body" className="opacity-60">{info.label}</Text>
              <Text variant="body" className="font-mono text-xs">
                {info.value}
              </Text>
            </div>
          ))}
        </div>
      </Card>
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

  const handleSignOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header 
        className="border-b px-6 py-4"
        style={{ borderColor: colors.stroke.low }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <Title>Voice Lab Admin</Title>
            <Text variant="caption" className="opacity-60">Content System Management</Text>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              appearance="secondary"
              size="S"
              onPress={handleSignOut}
              aria-label="Sign out"
            >
              Sign out
            </Button>
            <Button
              appearance="secondary"
              size="S"
              onPress={() => window.location.href = '/'}
              aria-label="Back to Voice Lab"
            >
              <Icon size="S">
                <LazyIcon name="IcArrowLeft" />
              </Icon>
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav 
        className="border-b px-6"
        style={{ borderColor: colors.stroke.low }}
      >
        <div className="max-w-7xl mx-auto">
          <Tabs 
            selectedKey={activeSection}
            onSelectionChange={(key) => setActiveSection(key as AdminSection)}
            aria-label="Admin navigation"
          >
            <TabList>
              {NAV_ITEMS.map((item) => (
                <Tab key={item.id} id={item.id}>
                  <div className="flex items-center gap-2">
                    <Icon size="S">
                      <LazyIcon name={item.iconName} />
                    </Icon>
                    <span className="hidden sm:inline">{item.label}</span>
                  </div>
                </Tab>
              ))}
            </TabList>
            
            {/* Tab Panels */}
            <TabPanel key="dashboard" id="dashboard">
              <AdminDashboard />
            </TabPanel>
            <TabPanel key="analytics" id="analytics">
              <AdminAnalytics />
            </TabPanel>
            <TabPanel key="memory" id="memory">
              <AdminMemory />
            </TabPanel>
            <TabPanel key="knowledge" id="knowledge">
              <AdminKnowledge />
            </TabPanel>
            <TabPanel key="users" id="users">
              <AdminUsers />
            </TabPanel>
            <TabPanel key="config" id="config">
              <AdminConfig />
            </TabPanel>
          </Tabs>
        </div>
      </nav>
    </div>
  );
}
