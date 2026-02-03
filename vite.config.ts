import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.DASHSCOPE_API_KEY': JSON.stringify(env.VITE_DASHSCOPE_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      'process.env.TTS_PROVIDER': JSON.stringify(env.VITE_TTS_PROVIDER || 'alibaba'),
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
  }
})
