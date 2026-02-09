import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { DsProvider } from '@marcelinodzn/ds-react'
import { DesignSystemProvider } from './context/DesignSystemContext'
import { ProjectProvider } from './context/ProjectContext'
import { AudioLibraryProvider } from './context/AudioLibraryContext'
import './index.css'
import App from './App.tsx'
import AdminLayout from './admin/AdminLayout'
import type { ColorMode } from './types'

const COLOR_MODE_KEY = 'voiceDesigner_colorMode';

// ── Convex Client ────────────────────────────────────────────────
// Initialize only if VITE_CONVEX_URL is configured.
// When not configured, the app works in local-only mode.
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

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
      >
        <ProjectProvider>
          <AudioLibraryProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/admin/*" element={<AdminLayout />} />
                <Route path="/*" element={
                  <App colorMode={colorMode} onColorModeChange={setColorMode} />
                } />
              </Routes>
            </BrowserRouter>
          </AudioLibraryProvider>
        </ProjectProvider>
      </DsProvider>
    </DesignSystemProvider>
  );

  // Wrap with ConvexProvider only if Convex is configured
  if (convex) {
    return (
      <ConvexProvider client={convex}>
        {appTree}
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
