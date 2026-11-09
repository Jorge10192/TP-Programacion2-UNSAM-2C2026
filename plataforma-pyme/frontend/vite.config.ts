import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'PYME_')
  // The proxy is development-only. Never expose database credentials to Vite.
  const target = env.PYME_API_PROXY_TARGET || 'http://127.0.0.1:8000'
  if (!/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(target)) {
    throw new Error('PYME_API_PROXY_TARGET debe apuntar a FastAPI local (localhost o 127.0.0.1)')
  }
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target, changeOrigin: true },
        '/health': { target, changeOrigin: true },
        '/ready': { target, changeOrigin: true },
      },
    },
  }
})
