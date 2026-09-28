import { defineConfig, devices } from '@playwright/test';

const port: number = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  // Three engines launch a browser per worker, and the full Chromium build is the heaviest of them.
  // More workers than this starve a launch past the test timeout without running anything faster.
  workers: process.env['CI'] ? 2 : 4,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    // The full Chromium build carries the Autofill protocol domain the headless shell lacks.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    port,
    reuseExistingServer: !process.env['CI'],
  },
});
