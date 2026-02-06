import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = mode === 'production'
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Only expose non-sensitive configuration to client
      // API keys are handled server-side via /api routes
      'process.env.TTS_PROVIDER': JSON.stringify(env.VITE_TTS_PROVIDER || 'elevenlabs'),
      'process.env.CONVERSATION_PROVIDER': JSON.stringify(env.VITE_CONVERSATION_PROVIDER || 'alibaba'),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Strip console.log and debugger statements in production
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },
    build: {
      // Generate sourcemaps for production debugging (optional)
      sourcemap: false,
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
    },
  }
})
