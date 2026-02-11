import { StrictMode, useState, useEffect } from 'react'
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
import AdminLayout from './admin/AdminLayout'
import type { ColorMode } from './types'

// Initialize Sentry for error tracking (production only)
initSentry();

const COLOR_MODE_KEY = 'voiceDesigner_colorMode';

// ── Convex Client ────────────────────────────────────────────────
// Initialize only if VITE_CONVEX_URL is configured.
// When not configured, the app works in local-only mode.
const convexUrl = import.meta.env.VITE_CONVEX_URL;
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
                  <AdminLayout />
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
