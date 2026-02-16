import { StrictMode, useState, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { DsProvider } from '@marcelinodzn/ds-react'
// DesignSystemProvider removed -- Jio DS is the sole design system
import { ProjectProvider } from './context/ProjectContext'
import { initSyncService, getSyncService } from './services/sync/convexSync'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './config/sentry'
import './index.css'
import App from './App.tsx'
import type { ColorMode } from './types'

// ── Initialize Sync Service at Module Level ──────────────────────────
// CRITICAL: Must happen BEFORE React render so ConvexSyncBridge can inject mutationFn
// This ensures the singleton exists when components try to use it
initSyncService();

// Lazy load admin panel - only loaded when visiting /admin routes
const AdminLayout = lazy(() => import('./admin/AdminLayout'))

// Loading fallback for lazy-loaded admin panel
function AdminLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#1a1a2e',
      color: '#e0e0e0',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#0066ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ margin: 0, fontSize: 14 }}>loading admin panel...</p>
      </div>
    </div>
  );
}

// Initialize Sentry for error tracking (production only)
initSentry();

const COLOR_MODE_KEY = 'voiceDesigner_colorMode';

// ── Convex Client (REQUIRED) ────────────────────────────────────────
// Convex is required for data sync, analytics, and RAG features.
// The app will not start without a valid VITE_CONVEX_URL.
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    'VITE_CONVEX_URL environment variable is required. ' +
    'Please configure your Convex deployment URL in .env.local or Vercel environment variables.'
  );
}
const convex = new ConvexReactClient(convexUrl);

/**
 * Bridge component that wires up the ConvexSyncService with
 * a real mutation function from the Convex client.
 * Must be rendered inside a ConvexProvider.
 */
function ConvexSyncBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Helper to inject mutation function into sync service
    const injectMutationFn = (): boolean => {
      const syncService = getSyncService();
      if (syncService) {
        // Inject a real mutation function using the Convex client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        syncService.setMutationFn(async (name: string, args: Record<string, any>) => {
          // Convex client.mutation expects an api reference, but we use string names.
          // The ConvexReactClient exposes .mutation() for dynamic function references.
          // Use the generic mutation method with the function path string.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await (convex as any).mutation(name as any, args);
        });
        console.log('[ConvexSyncBridge] Mutation function injected successfully');
        return true;
      }
      console.warn('[ConvexSyncBridge] Sync service not available yet');
      return false;
    };
    
    // Try immediately (should work since we init at module level)
    if (!injectMutationFn()) {
      // Retry after a short delay as fallback (shouldn't happen but safety net)
      const timer = setTimeout(() => {
        if (!injectMutationFn()) {
          console.error('[ConvexSyncBridge] Failed to inject mutation function after retry');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return <>{children}</>;
}

function Root() {
  // Initialize from localStorage to prevent flash
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    try {
      const stored = localStorage.getItem(COLOR_MODE_KEY);
      return stored === 'Dark' ? 'Dark' : 'Light';
    } catch {
      return 'Light';
    }
  });

  // Persist to localStorage and sync body class
  useEffect(() => {
    try {
      localStorage.setItem(COLOR_MODE_KEY, colorMode);
    } catch { /* ignore - private browsing mode */ }
    document.body.classList.toggle('dark', colorMode === 'Dark');
  }, [colorMode]);

  const appTree = (
    <DsProvider
      platform="Desktop (1440)"
      colorMode={colorMode}
      density="Compact"
      theme="MyJio"
    >
      <ProjectProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/admin/*" element={
              <ErrorBoundary>
                <Suspense fallback={<AdminLoadingFallback />}>
                  <AdminLayout colorMode={colorMode} onColorModeChange={setColorMode} />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/*" element={
              <ErrorBoundary>
                <App colorMode={colorMode} onColorModeChange={setColorMode} />
              </ErrorBoundary>
            } />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </DsProvider>
  );

  // Always wrap with ConvexProvider (Convex is required)
  return (
    <ConvexProvider client={convex}>
      <ConvexSyncBridge>
        {appTree}
      </ConvexSyncBridge>
    </ConvexProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
