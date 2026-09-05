import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Principal } from "../domain/contracts";
import type { WorkOrderRow } from "../domain/operations";
import { audit } from "./audit";
import { demand } from "./operations-common";

export async function reservePartsTx(client: PoolClient, p: Principal, work: WorkOrderRow) {
  demand(
    ["PLANNED", "AWAITING_PARTS", "READY"].includes(work.status),
    "INVALID_TRANSITION",
    "Parts can only be reserved before repair begins.",
  );
  const existing = (
    await client.query(
      "SELECT status FROM inventory_reservations WHERE organization_id=$1 AND work_order_id=$2",
      [p.organizationId, work.id],
    )
  ).rows[0];
  if (existing?.status === "HELD") return { id: work.id, status: work.status };
  demand(
    !existing,
    "RESERVATION_CLOSED",
    "This reservation has already been consumed or released.",
  );
  const stock = (
    await client.query<{ warehouse_id: string; on_hand: number; reserved: number }>(
      `SELECT s.* FROM inventory_stock s JOIN warehouses w ON w.organization_id=s.organization_id AND w.id=s.warehouse_id WHERE s.organization_id=$1 AND s.sku=$2 AND w.kind='STATION' ORDER BY w.id LIMIT 1 FOR UPDATE OF s`,
      [p.organizationId, work.required_sku],
    )
  ).rows[0];
  demand(stock, "STOCK_MISSING", "Destination stock record is missing.");
  if (stock.on_hand - stock.reserved < work.quantity) {
    await client.query(
      "UPDATE work_orders SET status='AWAITING_PARTS' WHERE organization_id=$1 AND id=$2",
      [p.organizationId, work.id],
    );
    if (work.status !== "AWAITING_PARTS")
      await audit(client, p, "PartsShortage", work.id, work.correlation_id, {
        incidentId: work.incident_id,
        sku: work.required_sku,
        required: work.quantity,
        available: stock.on_hand - stock.reserved,
      });
    return {
      id: work.id,
      status: "AWAITING_PARTS",
      message: "Local stock is insufficient. Request procurement.",
    };
  }
  await client.query(
    "UPDATE inventory_stock SET reserved=reserved+$4 WHERE organization_id=$1 AND warehouse_id=$2 AND sku=$3",
    [p.organizationId, stock.warehouse_id, work.required_sku, work.quantity],
  );
  await client.query(
    "INSERT INTO inventory_reservations(id,organization_id,work_order_id,warehouse_id,sku,quantity,status) VALUES($1,$2,$3,$4,$5,$6,'HELD')",
    [randomUUID(), p.organizationId, work.id, stock.warehouse_id, work.required_sku, work.quantity],
  );
  await client.query("UPDATE work_orders SET status='READY' WHERE organization_id=$1 AND id=$2", [
    p.organizationId,
    work.id,
  ]);
  await audit(client, p, "PartsReserved", work.id, work.correlation_id, {
    incidentId: work.incident_id,
    sku: work.required_sku,
    quantity: work.quantity,
  });
  return { id: work.id, status: "READY" };
}

export async function closeReservationTx(
  client: PoolClient,
  p: Principal,
  work: WorkOrderRow,
  consume: boolean,
) {
  const reservation = (
    await client.query<{ warehouse_id: string; sku: string; quantity: number; status: string }>(
      "SELECT * FROM inventory_reservations WHERE organization_id=$1 AND work_order_id=$2 FOR UPDATE",
      [p.organizationId, work.id],
    )
  ).rows[0];
  if (!consume && (!reservation || reservation.status !== "HELD")) return;
  demand(reservation?.status === "HELD", "PARTS_REQUIRED", "A held parts reservation is required.");
  await client.query(
    "UPDATE inventory_stock SET reserved=reserved-$4,on_hand=on_hand-$5 WHERE organization_id=$1 AND warehouse_id=$2 AND sku=$3",
    [
      p.organizationId,
      reservation.warehouse_id,
      reservation.sku,
      reservation.quantity,
      consume ? reservation.quantity : 0,
    ],
  );
  await client.query(
    "UPDATE inventory_reservations SET status=$3 WHERE organization_id=$1 AND work_order_id=$2",
    [p.organizationId, work.id, consume ? "CONSUMED" : "RELEASED"],
  );
  await audit(
    client,
    p,
    consume ? "PartsConsumed" : "PartsReleased",
    work.id,
    work.correlation_id,
    { sku: reservation.sku, quantity: reservation.quantity, incidentId: work.incident_id },
  );
}
