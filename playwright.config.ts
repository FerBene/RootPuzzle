import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
      baseURL: 'http://127.0.0.1:3000',
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
      channel: 'chrome'
  },
  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\/.*\.smoke\.spec\.ts/
    }
  ],
    webServer: {
      command: 'npm run dev -- --hostname 127.0.0.1',
      url: 'http://127.0.0.1:3000',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ''
      },
      reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
