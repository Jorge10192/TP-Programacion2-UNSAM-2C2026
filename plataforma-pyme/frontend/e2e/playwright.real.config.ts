import { defineConfig, devices } from '@playwright/test'

// Only the disposable CI API. No environment override to a user's running API.
export default defineConfig({
  testDir: './real', timeout: 180_000, expect: { timeout: 15_000 },
  workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'off', screenshot: 'only-on-failure' },
  projects: [{ name: 'inventory-real', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm --prefix .. run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173/real/login', reuseExistingServer: false,
    // Only this disposable CI/QA runner can submit POST from the POS.
    // Normal Vite startup leaves real-sale registration DISABLED.
    env: {
      PYME_API_PROXY_TARGET: 'http://127.0.0.1:18001',
      VITE_PYME_ENABLE_REAL_SALES: '1',
    },
  },
})
