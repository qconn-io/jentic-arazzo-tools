import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.ARAZZO_BROWSER_PORT ?? 43187);
export default defineConfig({
  testDir: './test/e2e',
  testMatch: 'production.spec.ts',
  outputDir: './test-output/browser/results',
  timeout: 30_000,
  expect: { timeout: 5000 },
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './test-output/browser/report', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 480, height: 900 } },
    },
  ],
  webServer: {
    command: 'node scripts/serve-production-browser.mjs',
    url: `http://127.0.0.1:${port}/__identity`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
