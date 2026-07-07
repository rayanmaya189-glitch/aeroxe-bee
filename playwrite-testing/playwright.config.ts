import { defineConfig, devices } from '@playwright/test'

const API_URL = process.env.API_URL || 'http://localhost:8080'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 60_000,
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: API_URL,
      },
    },
    {
      name: 'admin',
      testDir: './tests/admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: FRONTEND_URL,
      },
    },
    {
      name: 'member',
      testDir: './tests/member',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: FRONTEND_URL,
      },
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && go run ./cmd/server',
      url: API_URL + '/api/v1/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd ../frontend && npm run dev',
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
