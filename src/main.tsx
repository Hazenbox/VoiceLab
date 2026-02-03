import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { DsProvider } from '@marcelinodzn/ds-react'
import './index.css'
import App from './App.tsx'
import type { ColorMode } from './types'

function Root() {
  const [colorMode, setColorMode] = useState<ColorMode>('Light');

  // Apply theme to document body
  useEffect(() => {
    if (colorMode === 'Dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [colorMode]);

  return (
    <DsProvider
      platform="Desktop (1440)"
      colorMode={colorMode}
      density="Default"
    >
      <App colorMode={colorMode} onColorModeChange={setColorMode} />
    </DsProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
