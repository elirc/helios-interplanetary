import { test, expect, type Page } from "@playwright/test";
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
  throw new Error("Local helios_test is required.");
const pool = new Pool({ connectionString });
test.beforeAll(async () => {
  await migrate(pool);
  await mkdir("artifacts/screenshots", { recursive: true });
});
test.beforeEach(() => resetFixtures(pool));
test.afterAll(() => pool.end());
async function enter(page: Page, auditor = false) {
  await page.goto("/");
  await page
    .getByRole("button", {
      name: auditor ? "Enter as read-only auditor" : "Enter Mission Control",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: "Operations hub" }).click();
  await expect(page.getByRole("heading", { name: "Command center", exact: true })).toBeVisible();
  await expect(page.getByText("Connecting to the operations network…")).toHaveCount(0);
}
const click = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();

test("coolant repair crosses AI approval, inventory, procurement, delayed cargo, crew and verified recovery", async ({
  page,
}) => {
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1536, height: 1100 });
  await enter(page);
  await page.screenshot({ path: "artifacts/screenshots/operations-overview.png", fullPage: true });
  await click(page, "Inject coolant degradation");
  await click(page, "Repair desk");
  await click(page, "Acknowledge incident");
  await expect(page.getByRole("button", { name: "Create work order", exact: true })).toBeEnabled();
  await click(page, "AI Operations");
  await click(page, "Run adviser");
  await expect(
    page.getByRole("button", { name: "Approve proposed action", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/intelligence-trace.png", fullPage: true });
  await click(page, "Approve proposed action");
  await click(page, "Repair desk");
  await expect(page.getByTestId("work-order")).toHaveCount(1);
  await click(page, "Reserve parts");
  await click(page, "Request procurement");
  await click(page, "Supply & approvals");
  await click(page, "Approve purchase");
  await click(page, "Dispatch shipment");
  await click(page, "Logistics");
  await click(page, "Inject cargo delay");
  await expect(page.getByText(/The original docking window is missed/)).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/cargo-delay.png", fullPage: true });
  await click(page, "Reserve priority route");
  await click(page, "Advance 15 minutes");
  await click(page, "Receive shipment");
  await click(page, "Repair desk");
  await page.getByLabel(/Technician for WO-/).selectOption("org-helios-crew-1");
  await click(page, "Start repair");
  for (const key of ["isolate", "replace", "inspect"]) await click(page, `Complete ${key}`);
  await click(page, "Begin verification");
  await click(page, "Record recovery telemetry");
  await click(page, "Complete verified repair");
  await expect(page.getByRole("heading", { name: "Recovery records", exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/repair-complete.png", fullPage: true });
  const persisted = (
    await pool.query(
      "SELECT w.status AS work_status,i.status AS incident_status FROM work_orders w JOIN incidents i ON i.id=w.incident_id WHERE w.organization_id='org-helios'",
    )
  ).rows[0];
  expect(persisted).toEqual({ work_status: "COMPLETED", incident_status: "RESOLVED" });
  expect(errors).toEqual([]);
});

test("solar crisis pauses manufacturing until isolated repair restores generation", async ({
  page,
}) => {
  await enter(page);
  await click(page, "Energy & projects");
  await click(page, "Inject solar outage");
  await click(page, "Advance 1 hour");
  await expect(page.getByText("Array outage · 12% output")).toBeVisible();
  await click(page, "Shed industrial load");
  await expect(page.getByText("blocked energy", { exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/energy-crisis.png", fullPage: true });
  await click(page, "Repair isolated array");
  await click(page, "Restore industrial load");
  await expect(page.getByText("Generation nominal", { exact: true })).toBeVisible();
});

test("payment uncertainty exposes provider evidence and reconciliation closes support", async ({
  page,
}) => {
  await enter(page);
  await click(page, "Billing & ledger");
  await click(page, "Record 240 usage units");
  await click(page, "Issue monthly invoice");
  await click(page, "Simulate timeout after charge");
  await expect(page.getByText(/Outcome is uncertain/)).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/payment-uncertainty.png", fullPage: true });
  await click(page, "Security & support");
  await expect(page.getByRole("heading", { name: /Payment confirmation pending/ })).toBeVisible();
  await click(page, "Billing & ledger");
  await click(page, "Deliver signed webhook");
  await expect(
    page.getByRole("button", { name: "Issue simulated refund", exact: true }),
  ).toBeVisible();
  await click(page, "Security & support");
  await expect(page.getByText("resolved", { exact: true })).toBeVisible();
  await click(page, "Inject suspicious access campaign");
  await click(page, "Begin investigation");
  await page
    .getByLabel("Investigation finding")
    .fill("Reviewed eight simulated denied requests; no real compromise occurred.");
  await click(page, "Resolve investigation");
  await expect(
    page.getByText("Reviewed eight simulated denied requests; no real compromise occurred."),
  ).toBeVisible();
});

test("unsafe model proposal is blocked, knowledge is cited, and all evaluation cases remain visible", async ({
  page,
}) => {
  await enter(page);
  await click(page, "AI Operations");
  await click(page, "Inject unsafe AI proposal");
  await expect(
    page.getByText("Model output failed the structured recommendation contract.").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve proposed action", exact: true }),
  ).toHaveCount(0);
  await click(page, "Run evaluations");
  await expect(page.getByRole("heading", { name: "14 / 14 checks passed · v1" })).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/evaluation-evidence.png", fullPage: true });
  await click(page, "Knowledge library");
  await click(page, "Search knowledge");
  await expect(page.locator(".hub-source").first()).toBeVisible();
  expect(await page.locator(".hub-source").count()).toBeLessThanOrEqual(5);
  await expect(page.locator(".hub-source").first()).toContainText("B-series coolant pump");
});

test("duplicate event delivery preserves one notification and mobile auditor can inspect operations", async ({
  page,
}) => {
  await enter(page);
  await click(page, "Platform console");
  await click(page, "Process pending events");
  await click(page, "Replay event");
  await click(page, "Process pending events");
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM notifications WHERE organization_id='org-helios'",
      )
    ).rows[0].n,
  ).toBe(1);
  await page.goto("/");
  await click(page, "Sign out");
  await enter(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await click(page, "Repair desk");
  await expect(
    page.getByRole("button", { name: "Advance 15 minutes", exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "artifacts/screenshots/operations-mobile.png", fullPage: true });
});
