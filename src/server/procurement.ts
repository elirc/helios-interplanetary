import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Principal } from "../domain/contracts";
import type { PurchaseRow } from "../domain/operations";
import { audit } from "./audit";
import { DomainError } from "./errors";
import { demand, lockWorkOrder } from "./operations-common";

export async function requestPurchaseTx(client: PoolClient, p: Principal, workOrderId: string) {
  const { work } = await lockWorkOrder(client, p, workOrderId);
  const existing = (
    await client.query<PurchaseRow>(
      "SELECT * FROM purchase_requests WHERE organization_id=$1 AND work_order_id=$2",
      [p.organizationId, work.id],
    )
  ).rows[0];
  if (existing) return { id: existing.id, status: existing.status };
  demand(
    work.status === "AWAITING_PARTS",
    "SHORTAGE_REQUIRED",
    "Check local inventory and establish a shortage first.",
  );
  const vendor = (
    await client.query(
      "SELECT * FROM vendors WHERE organization_id=$1 AND sku=$2 ORDER BY unit_price_cents,id LIMIT 1",
      [p.organizationId, work.required_sku],
    )
  ).rows[0];
  demand(vendor, "VENDOR_MISSING", "No vendor supplies the required part.");
  const id = randomUUID();
  await client.query(
    "INSERT INTO purchase_requests(id,organization_id,work_order_id,vendor_id,sku,quantity,total_cents,requested_by,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      id,
      p.organizationId,
      work.id,
      vendor.id,
      work.required_sku,
      work.quantity,
      vendor.unit_price_cents * work.quantity,
      p.id,
      work.correlation_id,
    ],
  );
  await audit(client, p, "PurchaseRequested", id, work.correlation_id, {
    workOrderId: work.id,
    incidentId: work.incident_id,
    totalCents: vendor.unit_price_cents * work.quantity,
  });
  return { id, status: "PENDING_APPROVAL" };
}

export async function lockPurchase(client: PoolClient, p: Principal, id: string) {
  const candidate = (
    await client.query<PurchaseRow>(
      "SELECT * FROM purchase_requests WHERE organization_id=$1 AND id=$2",
      [p.organizationId, id],
    )
  ).rows[0];
  if (!candidate) throw new DomainError(404, "NOT_FOUND", "Purchase request not found.");
  const { work, asset } = await lockWorkOrder(client, p, candidate.work_order_id);
  const purchase = (
    await client.query<PurchaseRow>(
      "SELECT * FROM purchase_requests WHERE organization_id=$1 AND id=$2 FOR UPDATE",
      [p.organizationId, id],
    )
  ).rows[0];
  return { purchase, work, asset };
}

export async function decidePurchaseTx(
  client: PoolClient,
  p: Principal,
  id: string,
  action: "approve_purchase" | "reject_purchase" | "cancel_purchase",
) {
  const { purchase, work } = await lockPurchase(client, p, id);
  const target =
    action === "approve_purchase"
      ? "APPROVED"
      : action === "reject_purchase"
        ? "REJECTED"
        : "CANCELLED";
  if (purchase.status === target) return { id, status: target };
  demand(
    action === "cancel_purchase"
      ? ["PENDING_APPROVAL", "APPROVED"].includes(purchase.status)
      : purchase.status === "PENDING_APPROVAL",
    "INVALID_TRANSITION",
    "This purchase decision is no longer available.",
  );
  demand(work.status !== "CANCELLED", "WORK_CANCELLED", "The work order was cancelled.");
  const budget = (
    await client.query<{ limit_cents: number; committed_cents: number; spent_cents: number }>(
      "SELECT * FROM budgets WHERE organization_id=$1 FOR UPDATE",
      [p.organizationId],
    )
  ).rows[0];
  if (action === "approve_purchase") {
    demand(
      budget.limit_cents - budget.committed_cents - budget.spent_cents >= purchase.total_cents,
      "BUDGET_EXCEEDED",
      "Approval would exceed the maintenance budget.",
    );
    await client.query(
      "UPDATE budgets SET committed_cents=committed_cents+$2 WHERE organization_id=$1",
      [p.organizationId, purchase.total_cents],
    );
  } else if (purchase.status === "APPROVED")
    await client.query(
      "UPDATE budgets SET committed_cents=committed_cents-$2 WHERE organization_id=$1",
      [p.organizationId, purchase.total_cents],
    );
  await client.query(
    "UPDATE purchase_requests SET status=$3,approved_by=$4 WHERE organization_id=$1 AND id=$2",
    [p.organizationId, id, target, action === "approve_purchase" ? p.id : null],
  );
  await audit(client, p, "PurchaseDecision", id, purchase.correlation_id, {
    decision: target,
    workOrderId: work.id,
    incidentId: work.incident_id,
    totalCents: purchase.total_cents,
  });
  return { id, status: target };
}
