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
      // Manual chunks for better caching and smaller initial bundle
      rollupOptions: {
        output: {
          manualChunks: {
            // React core - changes rarely
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Convex - changes rarely
            'vendor-convex': ['convex', 'convex/react'],
            // UI libraries
            'vendor-ui': ['framer-motion', 'lucide-react'],
            // LLM and AI services
            'services-llm': [
              './src/services/providers/llm/qwen.ts',
              './src/services/providers/llm/huggingface.ts',
              './src/services/providers/llm/gemini.ts',
              './src/services/providers/llm/openai.ts',
              './src/services/providers/llm/claude.ts',
              './src/services/providers/llm/inworldLLM.ts',
            ],
            // TTS services
            'services-tts': [
              './src/services/providers/alibaba/cosyvoice.ts',
              './src/services/providers/elevenlabs.ts',
            ],
            // Validation and content trust
            'services-validation': [
              './src/services/validation/validationPipeline.ts',
              './src/services/validation/agents',
              './src/services/contentTrust.ts',
            ],
            // Knowledge and learning
            'services-knowledge': [
              './src/services/knowledge/learningEngine.ts',
              './src/services/knowledge/saveExample.ts',
              './src/services/knowledge/ragEnrichment.ts',
            ],
            // Admin panel - lazy loaded, separate chunk
            'admin': [
              './src/admin/AdminLayout.tsx',
            ],
          },
        },
      },
    },
  }
})
