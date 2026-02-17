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
      // Hidden sourcemaps for Sentry error tracking (not served to users)
      sourcemap: 'hidden',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React core - changes rarely, cached long-term
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            // Design system - shared between main app and admin
            if (id.includes('node_modules/@marcelinodzn')) {
              return 'vendor-ds';
            }
            // Jio data vis components
            if (id.includes('node_modules/@jio')) {
              return 'vendor-jio';
            }
            // Convex runtime
            if (id.includes('node_modules/convex')) {
              return 'vendor-convex';
            }
            // Error tracking
            if (id.includes('node_modules/@sentry')) {
              return 'vendor-sentry';
            }
            // Markdown rendering
            if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-gfm') || id.includes('node_modules/rehype-raw') || id.includes('node_modules/remark-') || id.includes('node_modules/rehype-') || id.includes('node_modules/unified') || id.includes('node_modules/hast-') || id.includes('node_modules/mdast-') || id.includes('node_modules/micromark')) {
              return 'vendor-markdown';
            }
            // Code syntax highlighting - heavy
            if (id.includes('node_modules/react-syntax-highlighter') || id.includes('node_modules/refractor') || id.includes('node_modules/prismjs')) {
              return 'vendor-syntax';
            }
            // Data visualization
            if (id.includes('node_modules/d3')) {
              return 'vendor-d3';
            }
            // Fuzzy search
            if (id.includes('node_modules/fuse.js')) {
              return 'vendor-fuse';
            }
            // State management
            if (id.includes('node_modules/zustand')) {
              return 'vendor-zustand';
            }
            // React Aria (UI primitives used by DS)
            if (id.includes('node_modules/@react-aria') || id.includes('node_modules/@react-stately') || id.includes('node_modules/@internationalized')) {
              return 'vendor-aria';
            }
          },
        },
      },
    },
  }
})
