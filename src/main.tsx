import { StrictMode, useState, useEffect, lazy, Suspense, createContext, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { DsProvider } from '@marcelinodzn/ds-react'
// DesignSystemProvider removed -- Jio DS is the sole design system
import { ProjectProvider } from './context/ProjectContext'
import { initSyncService, getSyncService } from './services/sync/convexSync'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './config/sentry'
import './index.css'
import App from './App.tsx'
import { ComplianceTestRunner } from './components/ComplianceTestRunner'
import { DocsLayout } from './components/layouts/DocsLayout'
import { HowItWorksLayout } from './components/layouts/HowItWorksLayout'
import { AppState } from './types'
import type { ColorMode } from './types'
import { loadUserProfile } from './components/OnboardingModal'

// ── Initialize Sync Service at Module Level ──────────────────────────
// CRITICAL: Must happen BEFORE React render so ConvexSyncBridge can inject mutationFn
// This ensures the singleton exists when components try to use it
initSyncService();

// Lazy load admin panel - only loaded when visiting /admin routes
const AdminLayout = lazy(() => import('./admin/AdminLayout'))

// Loading fallback for lazy-loaded admin panel
// Uses inline styles since it renders before DsProvider context is available
function AdminLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#ffffff',
      fontFamily: 'JioType, system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #e4e4e7',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ 
          margin: 0, 
          fontSize: 14, 
          color: '#71717a',
          fontWeight: 400,
        }}>
          loading admin panel...
        </p>
      </div>
    </div>
  );
}

// Initialize Sentry for error tracking (production only)
initSentry();

const COLOR_MODE_KEY = 'voiceDesigner_colorMode';

// ── Color Mode Context ─────────────────────────────────────────────
// Shared context for colorMode and setColorMode across all routes
interface ColorModeContextValue {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
}
const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error('useColorMode must be used within ColorModeProvider');
  }
  return context;
}

// ── Route Wrapper Components ───────────────────────────────────────
// These wrap standalone page components with necessary context/props

function DocsRoute() {
  const { colorMode, setColorMode } = useColorMode();
  const navigate = useNavigate();
  const userProfile = loadUserProfile();
  
  return (
    <DocsLayout
      colorMode={colorMode}
      onColorModeChange={setColorMode}
      userName={userProfile?.name}
      userRole={userProfile?.role}
      onEditProfile={() => navigate('/')}
      voiceAppState={AppState.IDLE}
    />
  );
}

function HowItWorksRoute() {
  const { colorMode, setColorMode } = useColorMode();
  const navigate = useNavigate();
  const userProfile = loadUserProfile();
  
  return (
    <HowItWorksLayout
      colorMode={colorMode}
      onColorModeChange={setColorMode}
      userName={userProfile?.name}
      userRole={userProfile?.role}
      onEditProfile={() => navigate('/')}
    />
  );
}

function TestRunnerRoute() {
  return <ComplianceTestRunner />;
}

// ── Convex Client (Optional - supports offline mode) ────────────────
// Convex is used for data sync, analytics, and RAG features.
// If VITE_CONVEX_URL is not set or VITE_OFFLINE_MODE=true, runs in offline mode.
const convexUrl = import.meta.env.VITE_CONVEX_URL;
export const offlineMode = import.meta.env.VITE_OFFLINE_MODE === 'true';

let convex: ConvexReactClient | null = null;
// In offline mode, still create a client but it won't be used for actual queries
// This allows ConvexProvider to work and prevents hook errors
if (convexUrl) {
  try {
    convex = new ConvexReactClient(convexUrl);
  } catch (e) {
    console.warn('[Convex] Failed to initialize client:', e);
  }
}

if (offlineMode) {
  console.info('[Voice Lab] Running in offline mode - Convex queries will return undefined');
} else if (!convex) {
  console.warn('[Voice Lab] No Convex URL configured - some features may not work');
}

/**
 * Bridge component that wires up the ConvexSyncService with
 * a real mutation function from the Convex client.
 * Must be rendered inside a ConvexProvider.
 */
// Typed wrapper for ConvexReactClient's internal dynamic mutation method.
// ConvexReactClient doesn't expose a public string-based mutation API,
// so we cast once here to a narrow interface instead of scattering `any`.
const convexDynamic = convex as unknown as {
  mutation(name: string, args: Record<string, unknown>): Promise<unknown>;
} | null;

function ConvexSyncBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Skip if in offline mode
    if (offlineMode || !convexDynamic) {
      console.log('[ConvexSyncBridge] Running in offline mode - skipping mutation injection');
      return;
    }
    
    // Helper to inject mutation function into sync service
    const injectMutationFn = (): boolean => {
      const syncService = getSyncService();
      if (syncService) {
        syncService.setMutationFn(async (name, args) => {
          return await convexDynamic.mutation(name, args);
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
      <ColorModeContext.Provider value={{ colorMode, setColorMode }}>
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
              <Route path="/testrunner" element={
                <ErrorBoundary>
                  <TestRunnerRoute />
                </ErrorBoundary>
              } />
              <Route path="/docs" element={
                <ErrorBoundary>
                  <DocsRoute />
                </ErrorBoundary>
              } />
              <Route path="/how-it-works" element={
                <ErrorBoundary>
                  <HowItWorksRoute />
                </ErrorBoundary>
              } />
              <Route path="/" element={
                <ErrorBoundary>
                  <App colorMode={colorMode} onColorModeChange={setColorMode} />
                </ErrorBoundary>
              } />
            </Routes>
          </BrowserRouter>
        </ProjectProvider>
      </ColorModeContext.Provider>
    </DsProvider>
  );

  // Always wrap with ConvexProvider if we have a client (hooks require it)
  // In offline mode, queries will skip via the 'skip' parameter
  if (!convex) {
    // No client at all - render without ConvexProvider (limited functionality)
    console.warn('[Voice Lab] No Convex client - rendering without ConvexProvider');
    return (
      <ConvexSyncBridge>
        {appTree}
      </ConvexSyncBridge>
    );
  }
  
  return (
    <ConvexProvider client={convex}>
      <ConvexSyncBridge>
        {appTree}
      </ConvexSyncBridge>
    </ConvexProvider>
  );
}

const rootElement = document.getElementById('root')!;

// Reuse existing React root on HMR to avoid "createRoot on already-rooted container" warning
const existingRoot = (rootElement as any).__reactRoot;
const root = existingRoot ?? createRoot(rootElement);
(rootElement as any).__reactRoot = root;

root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
