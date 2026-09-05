import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Principal } from "../domain/contracts";
import type { ShipmentRow } from "../domain/operations";
import { audit } from "./audit";
import { DomainError } from "./errors";
import { reservePartsTx } from "./inventory";
import { demand, simulationNow } from "./operations-common";
import { lockPurchase } from "./procurement";
import { postJournalTx } from "./ledger";

async function reserveDock(client: PoolClient, p: Principal, shipmentId: string, earliest: Date) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `${p.organizationId}:dock-alpha`,
  ]);
  let start = earliest;
  for (let i = 0; i < 100; i++) {
    const end = new Date(start.getTime() + 15 * 60_000);
    const conflict = (
      await client.query<{ ends_at: Date }>(
        "SELECT ends_at FROM docking_reservations WHERE organization_id=$1 AND dock='ALPHA' AND status='RESERVED' AND shipment_id<>$2 AND starts_at<$4 AND ends_at>$3 ORDER BY ends_at DESC LIMIT 1",
        [p.organizationId, shipmentId, start, end],
      )
    ).rows[0];
    if (conflict) {
      start = conflict.ends_at;
      continue;
    }
    await client.query(
      "INSERT INTO docking_reservations(organization_id,shipment_id,dock,starts_at,ends_at) VALUES($1,$2,'ALPHA',$3,$4) ON CONFLICT(organization_id,shipment_id) DO UPDATE SET starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,status='RESERVED'",
      [p.organizationId, shipmentId, start, end],
    );
    return start;
  }
  throw new DomainError(
    409,
    "DOCK_FULL",
    "No docking window is available within the scheduling horizon.",
  );
}

export async function dispatchPurchaseTx(client: PoolClient, p: Principal, id: string) {
  const { purchase, work } = await lockPurchase(client, p, id);
  const existing = (
    await client.query<ShipmentRow>(
      "SELECT * FROM shipments WHERE organization_id=$1 AND purchase_id=$2",
      [p.organizationId, id],
    )
  ).rows[0];
  if (existing) return { id: existing.id, status: existing.status };
  demand(
    purchase.status === "APPROVED",
    "APPROVAL_REQUIRED",
    "Approve the purchase before dispatch.",
  );
  const origin = (
    await client.query(
      "SELECT s.* FROM inventory_stock s JOIN warehouses w ON w.organization_id=s.organization_id AND w.id=s.warehouse_id WHERE s.organization_id=$1 AND s.sku=$2 AND w.kind='ORIGIN' ORDER BY w.id LIMIT 1 FOR UPDATE OF s",
      [p.organizationId, purchase.sku],
    )
  ).rows[0];
  demand(
    origin && origin.on_hand - origin.reserved >= purchase.quantity,
    "ORIGIN_SHORTAGE",
    "Earth stock is unavailable.",
  );
  const vessel = (
    await client.query(
      "SELECT * FROM vessels WHERE organization_id=$1 AND status='AVAILABLE' AND capacity>=$2 ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED",
      [p.organizationId, purchase.quantity],
    )
  ).rows[0];
  demand(vessel, "FLEET_UNAVAILABLE", "No available vessel can carry this shipment.");
  const destination = (
    await client.query(
      "SELECT id FROM warehouses WHERE organization_id=$1 AND kind='STATION' ORDER BY id LIMIT 1",
      [p.organizationId],
    )
  ).rows[0];
  const now = await simulationNow(client, p),
    shipmentId = randomUUID(),
    eta = new Date(now.getTime() + 30 * 60_000);
  await client.query(
    "INSERT INTO shipments(id,organization_id,purchase_id,vessel_id,origin_id,destination_id,eta,departed_at,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      shipmentId,
      p.organizationId,
      id,
      vessel.id,
      origin.warehouse_id,
      destination.id,
      eta,
      now,
      purchase.correlation_id,
    ],
  );
  const arrival = await reserveDock(client, p, shipmentId, eta);
  await client.query("UPDATE shipments SET eta=$3 WHERE organization_id=$1 AND id=$2", [
    p.organizationId,
    shipmentId,
    arrival,
  ]);
  await client.query(
    "UPDATE inventory_stock SET reserved=reserved+$4 WHERE organization_id=$1 AND warehouse_id=$2 AND sku=$3",
    [p.organizationId, origin.warehouse_id, purchase.sku, purchase.quantity],
  );
  await client.query("UPDATE vessels SET status='IN_TRANSIT' WHERE organization_id=$1 AND id=$2", [
    p.organizationId,
    vessel.id,
  ]);
  await client.query(
    "UPDATE purchase_requests SET status='IN_TRANSIT' WHERE organization_id=$1 AND id=$2",
    [p.organizationId, id],
  );
  await audit(client, p, "ShipmentDispatched", shipmentId, purchase.correlation_id, {
    purchaseId: id,
    workOrderId: work.id,
    incidentId: work.incident_id,
    vesselId: vessel.id,
    eta: arrival.toISOString(),
  });
  return { id: shipmentId, status: "IN_TRANSIT" };
}

export async function shipmentCommandTx(
  client: PoolClient,
  p: Principal,
  id: string,
  action: "delay_shipment" | "reroute_shipment" | "deliver_shipment",
) {
  const candidate = (
    await client.query<ShipmentRow>("SELECT * FROM shipments WHERE organization_id=$1 AND id=$2", [
      p.organizationId,
      id,
    ])
  ).rows[0];
  if (!candidate) throw new DomainError(404, "NOT_FOUND", "Shipment not found.");
  const { purchase, work } = await lockPurchase(client, p, candidate.purchase_id);
  const shipment = (
    await client.query<ShipmentRow>(
      "SELECT * FROM shipments WHERE organization_id=$1 AND id=$2 FOR UPDATE",
      [p.organizationId, id],
    )
  ).rows[0];
  if (action === "deliver_shipment" && shipment.status === "DELIVERED")
    return { id, status: "DELIVERED" };
  demand(
    shipment.status !== "DELIVERED",
    "INVALID_TRANSITION",
    "Delivered shipments cannot be rerouted or delayed.",
  );
  const now = await simulationNow(client, p);
  let status = shipment.status;
  if (action === "delay_shipment") {
    if (status === "DELAYED") return { id, status };
    await client.query(
      "UPDATE shipments SET status='DELAYED',delay_minutes=delay_minutes+120,eta=eta+interval '120 minutes' WHERE organization_id=$1 AND id=$2",
      [p.organizationId, id],
    );
    await client.query(
      "UPDATE docking_reservations SET status='MISSED' WHERE organization_id=$1 AND shipment_id=$2",
      [p.organizationId, id],
    );
    status = "DELAYED";
  } else if (action === "reroute_shipment") {
    demand(status === "DELAYED", "INVALID_TRANSITION", "Reroute a delayed shipment.");
    const eta = await reserveDock(client, p, id, new Date(now.getTime() + 15 * 60_000));
    await client.query(
      "UPDATE shipments SET status='IN_TRANSIT',route='Priority direct approach · station dock Alpha',eta=$3 WHERE organization_id=$1 AND id=$2",
      [p.organizationId, id, eta],
    );
    status = "IN_TRANSIT";
  } else {
    demand(
      status === "IN_TRANSIT",
      "REROUTE_REQUIRED",
      "Reroute the delayed shipment and reserve a new docking window.",
    );
    const dock = (
      await client.query<{ starts_at: Date; ends_at: Date; status: string }>(
        "SELECT * FROM docking_reservations WHERE organization_id=$1 AND shipment_id=$2 FOR UPDATE",
        [p.organizationId, id],
      )
    ).rows[0];
    demand(
      now >= shipment.eta,
      "NOT_ARRIVED",
      "Advance the simulation clock to the shipment ETA before receipt.",
    );
    demand(
      dock.status === "RESERVED" && now < dock.ends_at,
      "DOCK_WINDOW_MISSED",
      "The docking window was missed. Mark a delay and reroute.",
    );
    await client.query(
      "UPDATE inventory_stock SET on_hand=on_hand-$4,reserved=reserved-$4 WHERE organization_id=$1 AND warehouse_id=$2 AND sku=$3",
      [p.organizationId, shipment.origin_id, purchase.sku, purchase.quantity],
    );
    await client.query(
      "UPDATE inventory_stock SET on_hand=on_hand+$4 WHERE organization_id=$1 AND warehouse_id=$2 AND sku=$3",
      [p.organizationId, shipment.destination_id, purchase.sku, purchase.quantity],
    );
    await client.query(
      "UPDATE budgets SET committed_cents=committed_cents-$2,spent_cents=spent_cents+$2 WHERE organization_id=$1",
      [p.organizationId, purchase.total_cents],
    );
    await postJournalTx(client, p, `receipt:${purchase.id}`, "Maintenance parts received", [
      { account: "PARTS", side: "DEBIT", cents: purchase.total_cents },
      { account: "AP", side: "CREDIT", cents: purchase.total_cents },
    ]);
    await client.query(
      "UPDATE purchase_requests SET status='RECEIVED' WHERE organization_id=$1 AND id=$2",
      [p.organizationId, purchase.id],
    );
    await client.query(
      "UPDATE shipments SET status='DELIVERED',delivered_at=$3 WHERE organization_id=$1 AND id=$2",
      [p.organizationId, id, now],
    );
    await client.query(
      "UPDATE docking_reservations SET status='COMPLETED' WHERE organization_id=$1 AND shipment_id=$2",
      [p.organizationId, id],
    );
    await client.query("UPDATE vessels SET status='AVAILABLE' WHERE organization_id=$1 AND id=$2", [
      p.organizationId,
      shipment.vessel_id,
    ]);
    await reservePartsTx(client, p, work);
    status = "DELIVERED";
  }
  await audit(
    client,
    p,
    action === "delay_shipment"
      ? "ShipmentDelayed"
      : action === "reroute_shipment"
        ? "ShipmentRerouted"
        : "ShipmentDelivered",
    id,
    purchase.correlation_id,
    { purchaseId: purchase.id, workOrderId: work.id, incidentId: work.incident_id, status },
  );
  return { id, status };
}
