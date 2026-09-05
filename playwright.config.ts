import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.HELIOS_E2E_PORT ?? "3001");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Use a valid local HELIOS_E2E_PORT.");
const origin = `http://127.0.0.1:${port}`;

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
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command:
      process.env.HELIOS_E2E_CONTAINER === "true"
        ? `node --env-file-if-exists=.env --import tsx scripts/prepare-test-db.ts && docker run --rm --name helios-browser-test --network helios_default -p 127.0.0.1:${port}:3000 -e DATABASE_URL=postgresql://helios:helios_local_only@postgres:5432/helios_test -e APP_ORIGIN=${origin} -e DEMO_MODE=true -e HELIOS_MODEL_PROVIDER=fixture -e SESSION_SECRET=isolated-browser-test-session-secret-32-characters helios-local:latest`
        : `node --env-file-if-exists=.env --import tsx scripts/prepare-test-db.ts && npm run start -- --port ${port}`,
    url: `${origin}/api/health`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || "",
      APP_ORIGIN: origin,
      DEMO_MODE: "true",
      HELIOS_MODEL_PROVIDER: "fixture",
      SESSION_SECRET: "isolated-browser-test-session-secret-32-characters",
    },
  },
});
