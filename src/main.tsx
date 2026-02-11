import { StrictMode, useState, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { DsProvider } from '@marcelinodzn/ds-react'
import { DesignSystemProvider } from './context/DesignSystemContext'
import { ProjectProvider } from './context/ProjectContext'
import { getSyncService } from './services/sync/convexSync'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './config/sentry'
import './index.css'
import App from './App.tsx'
import type { ColorMode } from './types'

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

// ── Convex Client ────────────────────────────────────────────────
// Initialize only if VITE_CONVEX_URL is configured.
// In production, Convex is REQUIRED for team collaboration and admin features.
// In development, the app can work in local-only mode for testing.
const convexUrl = import.meta.env.VITE_CONVEX_URL;

// Validate Convex configuration in production
if (import.meta.env.PROD && !convexUrl) {
  console.error('FATAL: VITE_CONVEX_URL is required in production for team deployment');
  // Show error screen instead of broken app
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div style="max-width: 500px;">
          <div style="
            width: 64px;
            height: 64px;
            margin: 0 auto 24px;
            border: 4px solid rgba(255,255,255,0.1);
            border-top-color: #0066ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          <h1 style="font-size: 24px; margin: 0 0 16px; color: #ff6b6b;">configuration error</h1>
          <p style="margin: 0 0 8px; color: #a0a0a0; line-height: 1.6;">
            Convex backend is not configured for this deployment.
          </p>
          <p style="margin: 0; font-size: 14px; color: #707070;">
            The admin panel and team collaboration features require a Convex database connection.
            Please contact your system administrator.
          </p>
          <div style="
            margin-top: 24px;
            padding: 16px;
            background: rgba(255,107,107,0.1);
            border: 1px solid rgba(255,107,107,0.3);
            border-radius: 8px;
            font-size: 12px;
            color: #ff8787;
            text-align: left;
          ">
            <strong>Technical Details:</strong><br/>
            Missing environment variable: <code>VITE_CONVEX_URL</code>
          </div>
        </div>
      </div>
    `;
  }
  throw new Error('Production deployment requires VITE_CONVEX_URL to be configured');
}

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/**
 * Bridge component that wires up the ConvexSyncService with
 * a real mutation function from the Convex client.
 * Must be rendered inside a ConvexProvider.
 */
function ConvexSyncBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!convex) return;
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
    <DesignSystemProvider>
      <DsProvider
        platform="Desktop (1440)"
        colorMode={colorMode}
        density="Default"
        theme="MyJio"
      >
        <ProjectProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/admin/*" element={
                <ErrorBoundary>
                  <Suspense fallback={<AdminLoadingFallback />}>
                    <AdminLayout />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="/*" element={
                <App colorMode={colorMode} onColorModeChange={setColorMode} />
              } />
            </Routes>
          </BrowserRouter>
        </ProjectProvider>
      </DsProvider>
    </DesignSystemProvider>
  );

  // Wrap with ConvexProvider only if Convex is configured
  if (convex) {
    return (
      <ConvexProvider client={convex}>
        <ConvexSyncBridge>
          {appTree}
        </ConvexSyncBridge>
      </ConvexProvider>
    );
  }

  return appTree;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
