import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4180';
const reportName = process.env.REPORT_NAME ?? 'regression';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  outputDir: `test-results/${reportName}-artifacts`,
  reporter: [
    ['line'],
    ['html', { outputFolder: `playwright-report/${reportName}`, open: 'never' }],
    ['junit', { outputFile: `test-results/${reportName}.xml` }],
  ],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: 'tests/api/**/*.spec.ts',
    },
    {
      name: 'chromium',
      testMatch: ['tests/ui/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: 'tests/ui/**/*.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: 'tests/ui/**/*.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
