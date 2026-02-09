import { useState, useCallback } from 'react';
import { useThemeColors } from '../theme/useColors';

// ── Admin Auth Gate ──────────────────────────────────────────────
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: colors.background.ghost,
    }}>
      <div style={{
        padding: '2rem',
        borderRadius: '12px',
        border: `1px solid ${colors.stroke.medium}`,
        background: colors.background.subtle,
        maxWidth: '400px',
        width: '100%',
      }}>
        <h2 style={{ color: colors.text.high, marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          Voice Lab Admin
        </h2>
        <p style={{ color: colors.text.medium, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          Enter the admin passphrase to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
            placeholder="Passphrase"
            autoFocus
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: `1px solid ${error ? '#ef4444' : colors.stroke.medium}`,
              background: colors.background.ghost,
              color: colors.text.high,
              fontSize: '0.875rem',
              outline: 'none',
              marginBottom: '0.5rem',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: colors.accent,
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '0.5rem',
            }}
          >
            Enter Admin Panel
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Admin Nav Items ──────────────────────────────────────────────
type AdminSection = 'dashboard' | 'analytics' | 'memory' | 'knowledge' | 'users' | 'config';

const NAV_ITEMS: { id: AdminSection; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'memory', label: 'Memory & Learnings' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'users', label: 'Users' },
  { id: 'config', label: 'System Config' },
];

// ── Placeholder Panels ───────────────────────────────────────────
function AdminDashboard() {
  const colors = useThemeColors();
  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ color: colors.text.high, marginBottom: '1rem' }}>Dashboard</h2>
      <p style={{ color: colors.text.medium }}>
        Admin dashboard will show real-time metrics: active users, generations,
        trust scores, top violations, and recent corrections.
      </p>
      <p style={{ color: colors.text.low, marginTop: '0.5rem', fontSize: '0.875rem' }}>
        Coming in Phase 5.
      </p>
    </div>
  );
}

function AdminPlaceholder({ section }: { section: string }) {
  const colors = useThemeColors();
  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ color: colors.text.high, marginBottom: '1rem' }}>{section}</h2>
      <p style={{ color: colors.text.medium }}>
        This section will be built in Phase 5.
      </p>
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
      case 'analytics': return <AdminPlaceholder section="Analytics" />;
      case 'memory': return <AdminPlaceholder section="Memory & Learnings" />;
      case 'knowledge': return <AdminPlaceholder section="Knowledge Base" />;
      case 'users': return <AdminPlaceholder section="Users" />;
      case 'config': return <AdminPlaceholder section="System Config" />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: colors.background.ghost,
      overflow: 'hidden',
    }}>
      {/* Nav Rail */}
      <nav style={{
        width: '240px',
        minWidth: '240px',
        borderRight: `1px solid ${colors.stroke.low}`,
        background: colors.background.subtle,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1rem',
          borderBottom: `1px solid ${colors.stroke.low}`,
        }}>
          <h1 style={{
            color: colors.text.high,
            fontSize: '1rem',
            fontWeight: 700,
            margin: 0,
          }}>
            Voice Lab Admin
          </h1>
          <p style={{
            color: colors.text.low,
            fontSize: '0.75rem',
            margin: '0.25rem 0 0',
          }}>
            Content System Management
          </p>
        </div>

        {/* Nav Items */}
        <div style={{ flex: 1, padding: '0.5rem', overflow: 'auto' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: activeSection === item.id ? colors.accent + '15' : 'transparent',
                color: activeSection === item.id ? colors.accent : colors.text.medium,
                fontSize: '0.875rem',
                fontWeight: activeSection === item.id ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem',
          borderTop: `1px solid ${colors.stroke.low}`,
          fontSize: '0.75rem',
          color: colors.text.low,
        }}>
          <button
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              setAuthenticated(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text.low,
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: 0,
            }}
          >
            Sign out
          </button>
          {' · '}
          <a
            href="/"
            style={{ color: colors.text.low, textDecoration: 'none' }}
          >
            Back to Voice Lab
          </a>
        </div>
      </nav>

      {/* Content Area */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {renderContent()}
      </main>
    </div>
  );
}
