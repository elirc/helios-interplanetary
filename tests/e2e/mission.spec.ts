import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { mkdir } from "node:fs/promises";
import { migrate } from "../../src/server/migrations";
import { resetFixtures } from "../../src/server/fixtures";

const connectionString = process.env.TEST_DATABASE_URL;
if (
  !connectionString ||
  new URL(connectionString).pathname !== "/helios_test" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)
)
  throw new Error("Browser tests require local helios_test.");
const pool = new Pool({ connectionString });

test.beforeAll(async () => {
  await migrate(pool);
  await mkdir("artifacts/screenshots", { recursive: true });
});
test.beforeEach(async () => {
  await resetFixtures(pool);
});
test.afterAll(async () => {
  await pool.end();
});

test("operator completes degradation, evidence review, replay, recovery, and resolution", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Enter Mission Control" })).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/access-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Enter Mission Control" }).click();
  await expect(page.getByRole("heading", { name: "Mission Control", exact: true })).toBeVisible();
  await expect(page.locator(".mission-status")).toContainText("Systems nominal");
  await page.screenshot({
    path: "artifacts/screenshots/mission-nominal-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Inject degradation", exact: true }).click();
  await expect(page.locator(".mission-status")).toContainText("Attention required");
  await expect(page.getByRole("status")).toContainText("12 readings recorded");
  await page.screenshot({
    path: "artifacts/screenshots/mission-anomaly-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Replay delivery", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("No additional readings");
  await expect(page.locator(".workspace-footer")).toContainText("48 persisted readings");
  await page.getByRole("button", { name: /Inspect incident/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Triggering observation" })).toBeVisible();
  await expect(dialog.getByText("Coolant anomaly detected", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Acknowledge incident", exact: true }).click();
  await expect(dialog.getByText("Acknowledged", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Resolve incident", exact: true }),
  ).toBeDisabled();
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.screenshot({ path: "artifacts/screenshots/incident-evidence-desktop.png" });
  await dialog.getByRole("button", { name: "Close incident" }).click();
  await page.getByRole("button", { name: "Restore nominal", exact: true }).click();
  await expect(page.locator(".mission-status")).toContainText("Systems nominal");
  await page.getByRole("button", { name: /Inspect incident/ }).click();
  await dialog.getByRole("button", { name: "Resolve incident", exact: true }).click();
  await expect(dialog.getByText("Resolved", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close incident" }).click();
  await page.getByRole("button", { name: /Incident registry/ }).click();
  await expect(page.getByRole("cell", { name: "Resolved", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".mission-status")).toContainText("Systems nominal");
  await expect(page.locator(".workspace-footer")).toContainText("60 persisted readings");
  expect(errors).toEqual([]);
});

test("mobile layout and read-only operator prevent mutations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Enter as read-only auditor" }).click();
  await expect(
    page.getByRole("button", { name: "Inject degradation", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Restore nominal", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "artifacts/screenshots/mission-mobile.png", fullPage: true });
  await page.getByRole("button", { name: /Incident registry/ }).click();
  await expect(page.getByText("Clear skies. No incidents.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Enter Mission Control" })).toBeVisible();
});

test("connection errors are visible and recover on retry", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter Mission Control" }).click();
  await expect(page.getByRole("heading", { name: "Mission Control", exact: true })).toBeVisible();
  await page.route("**/api/mission", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Station link interrupted." } }),
    }),
  );
  const connectionAlert = page.getByRole("alert").filter({ hasText: "Station link interrupted" });
  await expect(connectionAlert).toBeVisible();
  await expect(page.getByText("Snapshot may be stale")).toBeVisible();
  await page.unroute("**/api/mission");
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(connectionAlert).toHaveCount(0);
});
