import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "artifacts/browser-report", open: "never" }]],
  outputDir: "artifacts/browser-tests",
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command:
      "node --env-file-if-exists=.env --import tsx scripts/prepare-test-db.ts && npm run start -- --port 3001",
    url: "http://127.0.0.1:3001/api/health",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || "",
      APP_ORIGIN: "http://127.0.0.1:3001",
      DEMO_MODE: "true",
      SESSION_SECRET: "isolated-browser-test-session-secret-32-characters",
    },
  },
});
