import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Principal } from "../domain/contracts";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";
import { requireOperator } from "./identity";
import { audit } from "./audit";

export interface Delivery {
  id: string;
  organization_id: string;
  event_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  correlation_id: string;
  occurred_at: Date;
  lease_token: string;
  attempts: number;
  max_attempts: number;
}

export async function claimEvent(
  p: Principal,
  pool: Pool = getPool(),
  leaseSeconds = 30,
): Promise<Delivery | null> {
  requireOperator(p);
  return transaction(pool, async (c) => {
    await c.query(
      "UPDATE outbox_events SET status='DEAD',lease_token=NULL,lease_until=NULL,last_error='Lease expired at maximum attempts' WHERE organization_id=$1 AND status='RUNNING' AND lease_until<clock_timestamp() AND attempts>=max_attempts",
      [p.organizationId],
    );
    const row = (
      await c.query<Delivery>(
        "SELECT * FROM outbox_events WHERE organization_id=$1 AND attempts<max_attempts AND ((status='PENDING' AND available_at<=clock_timestamp()) OR (status='RUNNING' AND lease_until<clock_timestamp())) ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED",
        [p.organizationId],
      )
    ).rows[0];
    if (!row) return null;
    const token = randomUUID();
    await c.query(
      "UPDATE outbox_events SET status='RUNNING',attempts=attempts+1,lease_token=$3,lease_until=clock_timestamp()+make_interval(secs=>$4) WHERE organization_id=$1 AND id=$2",
      [p.organizationId, row.id, token, leaseSeconds],
    );
    return { ...row, lease_token: token, attempts: row.attempts + 1 };
  });
}

export async function deliverEvent(p: Principal, event: Delivery, pool: Pool = getPool()) {
  requireOperator(p);
  if (event.organization_id !== p.organizationId)
    throw new DomainError(404, "NOT_FOUND", "Event not found.");
  return transaction(pool, async (c) => {
    const owned = (
      await c.query(
        "SELECT id FROM outbox_events WHERE organization_id=$1 AND id=$2 AND status='RUNNING' AND lease_token=$3 AND lease_until>clock_timestamp() FOR UPDATE",
        [p.organizationId, event.id, event.lease_token],
      )
    ).rowCount;
    if (!owned)
      throw new DomainError(
        409,
        "LEASE_LOST",
        "Delivery lease expired or belongs to another worker.",
      );
    if (event.event_type === "ExercisePoisonEvent") {
      const override = (
        await c.query(
          "SELECT event_id FROM exercise_overrides WHERE organization_id=$1 AND event_id=$2",
          [p.organizationId, event.id],
        )
      ).rowCount;
      if (!override)
        throw new DomainError(
          503,
          "EXERCISE_FAULT",
          "Controlled consumer failure; resolve this exercise before redrive.",
        );
    }
    const receipt = await c.query(
      "INSERT INTO event_receipts(organization_id,event_id,consumer) VALUES($1,$2,'operations-projection-v1') ON CONFLICT DO NOTHING RETURNING event_id",
      [p.organizationId, event.id],
    );
    if (receipt.rowCount) {
      await c.query(
        "INSERT INTO notifications(id,organization_id,event_id,title,body) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [
          randomUUID(),
          p.organizationId,
          event.id,
          event.event_type.replace(/([a-z])([A-Z])/g, "$1 $2"),
          `Resource ${event.aggregate_id} · correlation ${event.correlation_id}`,
        ],
      );
      const kind = event.event_type.startsWith("Purchase")
        ? "procurement-approval"
        : event.event_type.startsWith("WorkOrder") || event.event_type.startsWith("Parts")
          ? "maintenance"
          : event.event_type.startsWith("Shipment")
            ? "cargo-fulfillment"
            : null;
      if (kind) {
        // Project the current authoritative row, so delayed/out-of-order events cannot regress status.
        let status = "ACTIVE";
        if (kind === "procurement-approval")
          status =
            (
              await c.query(
                "SELECT status FROM purchase_requests WHERE organization_id=$1 AND id::text=$2",
                [p.organizationId, event.aggregate_id],
              )
            ).rows[0]?.status ?? "UNKNOWN";
        if (kind === "maintenance")
          status =
            (
              await c.query(
                "SELECT status FROM work_orders WHERE organization_id=$1 AND id::text=$2",
                [p.organizationId, event.aggregate_id],
              )
            ).rows[0]?.status ?? "UNKNOWN";
        if (kind === "cargo-fulfillment")
          status =
            (
              await c.query(
                "SELECT status FROM shipments WHERE organization_id=$1 AND id::text=$2",
                [p.organizationId, event.aggregate_id],
              )
            ).rows[0]?.status ?? "UNKNOWN";
        const history = JSON.stringify([
          { eventId: event.id, type: event.event_type, status, occurredAt: event.occurred_at },
        ]);
        await c.query(
          "INSERT INTO workflow_instances(id,organization_id,kind,resource_id,status,due_at,history) VALUES($1,$2,$3,$4,$5,CASE WHEN $5='PENDING_APPROVAL' THEN clock_timestamp()+interval '30 minutes' ELSE NULL END,$6) ON CONFLICT(organization_id,kind,resource_id) DO UPDATE SET status=EXCLUDED.status,history=workflow_instances.history||EXCLUDED.history,updated_at=clock_timestamp(),due_at=CASE WHEN EXCLUDED.status='PENDING_APPROVAL' THEN COALESCE(workflow_instances.due_at,EXCLUDED.due_at) ELSE NULL END",
          [randomUUID(), p.organizationId, kind, event.aggregate_id, status, history],
        );
      }
    }
    await c.query(
      "UPDATE outbox_events SET status='DELIVERED',delivered_at=clock_timestamp(),lease_token=NULL,lease_until=NULL,last_error=NULL WHERE organization_id=$1 AND id=$2",
      [p.organizationId, event.id],
    );
    return { id: event.id, status: "DELIVERED", duplicate: !receipt.rowCount };
  });
}

export async function failDelivery(
  p: Principal,
  event: Delivery,
  message: string,
  pool: Pool = getPool(),
) {
  await pool.query(
    "UPDATE outbox_events SET status=CASE WHEN attempts>=max_attempts THEN 'DEAD' ELSE 'PENDING' END,available_at=clock_timestamp()+make_interval(secs=>LEAST(300,5*power(2,attempts-1))::int),last_error=$4,lease_token=NULL,lease_until=NULL WHERE organization_id=$1 AND id=$2 AND status='RUNNING' AND lease_token=$3",
    [p.organizationId, event.id, event.lease_token, message.slice(0, 500)],
  );
}
export async function processNextEvent(p: Principal, pool: Pool = getPool()) {
  const event = await claimEvent(p, pool);
  if (!event) return null;
  try {
    return await deliverEvent(p, event, pool);
  } catch (error) {
    if (error instanceof DomainError && error.code === "LEASE_LOST")
      return { id: event.id, status: "LEASE_LOST" };
    await failDelivery(
      p,
      event,
      error instanceof DomainError ? error.message : "Consumer failed; inspect worker logs.",
      pool,
    );
    return { id: event.id, status: "RETRY_SCHEDULED" };
  }
}

export async function resolveAndRedrive(p: Principal, id: string, pool: Pool = getPool()) {
  requireOperator(p);
  return transaction(pool, async (c) => {
    const event = (
      await c.query<Delivery & { status: string }>(
        "SELECT * FROM outbox_events WHERE organization_id=$1 AND id=$2 FOR UPDATE",
        [p.organizationId, id],
      )
    ).rows[0];
    if (!event) throw new DomainError(404, "NOT_FOUND", "Event not found.");
    if (event.status !== "DEAD")
      throw new DomainError(409, "NOT_DEAD", "Only dead-letter events can be redriven.");
    if (event.event_type === "ExercisePoisonEvent")
      await c.query(
        "INSERT INTO exercise_overrides(organization_id,event_id,resolved_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [p.organizationId, id, p.id],
      );
    await c.query(
      "UPDATE outbox_events SET status='PENDING',attempts=0,available_at=clock_timestamp(),last_error=NULL WHERE organization_id=$1 AND id=$2",
      [p.organizationId, id],
    );
    await audit(c, p, "EventRedriven", id, event.correlation_id, {
      eventId: id,
      exerciseResolved: event.event_type === "ExercisePoisonEvent",
    });
    return { id, status: "PENDING" };
  });
}
