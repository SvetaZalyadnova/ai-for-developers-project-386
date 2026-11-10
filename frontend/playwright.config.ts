import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  webServer: [
    {
      command: 'mvn -f ../backend/pom.xml spring-boot:run',
      url: 'http://127.0.0.1:8080/api/v1/meeting-types',
      env: {
        OWNER_API_TOKEN: process.env.OWNER_API_TOKEN ?? 'playwright-owner-token',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
