import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { DsProvider } from '@marcelinodzn/ds-react'
import { DesignSystemProvider } from './context/DesignSystemContext'
import { ProjectProvider } from './context/ProjectContext'
import { AudioLibraryProvider } from './context/AudioLibraryContext'
import './index.css'
import App from './App.tsx'
import type { ColorMode } from './types'

const COLOR_MODE_KEY = 'voiceDesigner_colorMode';

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

  return (
    <DesignSystemProvider>
      <DsProvider
        platform="Desktop (1440)"
        colorMode={colorMode}
        density="Default"
      >
        <ProjectProvider>
          <AudioLibraryProvider>
            <App colorMode={colorMode} onColorModeChange={setColorMode} />
          </AudioLibraryProvider>
        </ProjectProvider>
      </DsProvider>
    </DesignSystemProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
