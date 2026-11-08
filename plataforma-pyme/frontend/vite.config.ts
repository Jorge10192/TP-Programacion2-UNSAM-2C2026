import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({mode}) => ({
  plugins: [react()],
  server: {host:'127.0.0.1',proxy:{'/api':{target:loadEnv(mode,process.cwd(),'VITE_').VITE_API_PROXY || 'http://127.0.0.1:8000',changeOrigin:false}}},
}))
