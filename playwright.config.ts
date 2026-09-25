import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', timeout: 30000, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4379', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: { command: 'npm exec -- astro preview --host 127.0.0.1 --port 4379 --ignore-lock', url: 'http://127.0.0.1:4379', reuseExistingServer: false },
});
