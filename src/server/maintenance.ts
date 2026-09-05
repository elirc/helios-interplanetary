import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Principal } from "../domain/contracts";
import type { Operation, WorkOrderRow } from "../domain/operations";
import { audit } from "./audit";
import { DomainError } from "./errors";
import { closeReservationTx } from "./inventory";
import { demand, lockWorkOrder, simulationNow } from "./operations-common";
import { lockAsset } from "./telemetry";

export async function createWorkOrderTx(client: PoolClient, p: Principal, incidentId: string) {
  const incident = (
    await client.query<{ asset_id: string; status: string; correlation_id: string }>(
      "SELECT * FROM incidents WHERE organization_id=$1 AND id=$2",
      [p.organizationId, incidentId],
    )
  ).rows[0];
  if (!incident) throw new DomainError(404, "NOT_FOUND", "Incident not found.");
  await lockAsset(client, p, incident.asset_id);
  const existing = (
    await client.query<WorkOrderRow>(
      "SELECT * FROM work_orders WHERE organization_id=$1 AND incident_id=$2",
      [p.organizationId, incidentId],
    )
  ).rows[0];
  if (existing) return { id: existing.id, status: existing.status };
  const current = (
    await client.query("SELECT status FROM incidents WHERE organization_id=$1 AND id=$2", [
      p.organizationId,
      incidentId,
    ])
  ).rows[0];
  demand(
    current.status === "ACKNOWLEDGED",
    "ACKNOWLEDGEMENT_REQUIRED",
    "Acknowledge the incident before planning maintenance.",
  );
  const id = randomUUID();
  await client.query(
    "INSERT INTO work_orders(id,organization_id,incident_id,asset_id,title,created_by,correlation_id) VALUES($1,$2,$3,$4,'Replace coolant pump cartridge',$5,$6)",
    [id, p.organizationId, incidentId, incident.asset_id, p.id, incident.correlation_id],
  );
  for (const [index, [key, title]] of [
    ["isolate", "Isolate and lock out the coolant loop"],
    ["replace", "Replace the cartridge and torque fittings"],
    ["inspect", "Inspect seals and restore the coolant loop"],
  ].entries())
    await client.query(
      "INSERT INTO work_order_tasks(organization_id,work_order_id,task_key,title,ordinal) VALUES($1,$2,$3,$4,$5)",
      [p.organizationId, id, key, title, index],
    );
  await audit(client, p, "WorkOrderCreated", id, incident.correlation_id, {
    incidentId,
    assetId: incident.asset_id,
  });
  return { id, status: "PLANNED" };
}

export async function maintenanceCommandTx(
  client: PoolClient,
  p: Principal,
  input: Extract<Operation, { workOrderId: string }>,
) {
  const { work, asset } = await lockWorkOrder(client, p, input.workOrderId);
  const now = await simulationNow(client, p);
  if (input.action === "assign_crew") {
    demand(
      ["PLANNED", "AWAITING_PARTS", "READY"].includes(work.status),
      "INVALID_TRANSITION",
      "Assign crew before starting repair.",
    );
    const crew = (
      await client.query(
        "SELECT * FROM crew_members WHERE organization_id=$1 AND id=$2 FOR UPDATE",
        [p.organizationId, input.crewId],
      )
    ).rows[0];
    if (!crew) throw new DomainError(404, "NOT_FOUND", "Crew member not found.");
    const station = (
      await client.query("SELECT station_id FROM assets WHERE organization_id=$1 AND id=$2", [
        p.organizationId,
        work.asset_id,
      ])
    ).rows[0].station_id;
    demand(
      crew.available &&
        crew.station_id === station &&
        crew.certification === "COOLANT_L2" &&
        new Date(crew.certified_until) > now,
      "CREW_INELIGIBLE",
      "Assign an available station technician with a current COOLANT_L2 certification.",
    );
    await client.query("UPDATE work_orders SET crew_id=$3 WHERE organization_id=$1 AND id=$2", [
      p.organizationId,
      work.id,
      crew.id,
    ]);
  } else if (input.action === "start_repair") {
    if (work.status === "IN_PROGRESS") return { id: work.id, status: work.status };
    demand(
      work.status === "READY" && work.crew_id,
      "NOT_READY",
      "Reserve parts and assign certified crew before starting.",
    );
    const crew = (
      await client.query(
        "SELECT * FROM crew_members WHERE organization_id=$1 AND id=$2 FOR UPDATE",
        [p.organizationId, work.crew_id],
      )
    ).rows[0];
    demand(
      crew.available && crew.certification === "COOLANT_L2" && new Date(crew.certified_until) > now,
      "CREW_INELIGIBLE",
      "The assigned technician is unavailable or their certification expired.",
    );
    await client.query(
      "UPDATE crew_members SET available=false WHERE organization_id=$1 AND id=$2",
      [p.organizationId, work.crew_id],
    );
    await client.query(
      "UPDATE work_orders SET status='IN_PROGRESS',started_at=$3 WHERE organization_id=$1 AND id=$2",
      [p.organizationId, work.id, now],
    );
    work.status = "IN_PROGRESS";
  } else if (input.action === "complete_task") {
    demand(
      work.status === "IN_PROGRESS",
      "INVALID_TRANSITION",
      "Start repair before completing tasks.",
    );
    const tasks = (
      await client.query<{ task_key: string; completed_at: Date | null }>(
        "SELECT task_key,completed_at FROM work_order_tasks WHERE organization_id=$1 AND work_order_id=$2 ORDER BY ordinal",
        [p.organizationId, work.id],
      )
    ).rows;
    const task = tasks.find((t) => t.task_key === input.taskKey);
    demand(task, "TASK_NOT_FOUND", "Task not found.");
    if (task.completed_at) return { id: work.id, status: work.status };
    demand(
      tasks.find((t) => !t.completed_at)?.task_key === input.taskKey,
      "TASK_ORDER",
      "Complete the safety checklist in order.",
    );
    await client.query(
      "UPDATE work_order_tasks SET completed_at=$4,completed_by=$5 WHERE organization_id=$1 AND work_order_id=$2 AND task_key=$3",
      [p.organizationId, work.id, input.taskKey, now, p.id],
    );
  } else if (input.action === "begin_verification") {
    if (work.status === "VERIFYING") return { id: work.id, status: work.status };
    demand(work.status === "IN_PROGRESS", "INVALID_TRANSITION", "Repair must be in progress.");
    const pending = (
      await client.query(
        "SELECT count(*)::int AS n FROM work_order_tasks WHERE organization_id=$1 AND work_order_id=$2 AND completed_at IS NULL",
        [p.organizationId, work.id],
      )
    ).rows[0].n;
    demand(pending === 0, "TASKS_INCOMPLETE", "Complete every repair task first.");
    await client.query(
      "UPDATE work_orders SET status='VERIFYING',verification_after=$3 WHERE organization_id=$1 AND id=$2",
      [p.organizationId, work.id, asset.last_observed_at ?? now],
    );
    work.status = "VERIFYING";
  } else if (input.action === "complete_repair") {
    if (work.status === "COMPLETED") return { id: work.id, status: work.status };
    demand(
      work.status === "VERIFYING",
      "INVALID_TRANSITION",
      "Begin verification before completing repair.",
    );
    const latest = (
      await client.query(
        "SELECT status,last_observed_at FROM assets WHERE organization_id=$1 AND id=$2",
        [p.organizationId, work.asset_id],
      )
    ).rows[0];
    demand(
      latest.status === "NOMINAL" &&
        work.verification_after &&
        new Date(latest.last_observed_at) > work.verification_after,
      "VERIFICATION_REQUIRED",
      "Record newer nominal telemetry after entering verification.",
    );
    await closeReservationTx(client, p, work, true);
    await client.query(
      "UPDATE work_orders SET status='COMPLETED',completed_at=$3 WHERE organization_id=$1 AND id=$2",
      [p.organizationId, work.id, now],
    );
    await client.query(
      "UPDATE crew_members SET available=true WHERE organization_id=$1 AND id=$2",
      [p.organizationId, work.crew_id],
    );
    await client.query(
      "UPDATE incidents SET status='RESOLVED',resolved_at=$3 WHERE organization_id=$1 AND id=$2",
      [p.organizationId, work.incident_id, now],
    );
    await audit(client, p, "IncidentResolved", work.incident_id, work.correlation_id, {
      workOrderId: work.id,
      verificationAt: latest.last_observed_at,
    });
    const evidence = (
      await client.query(
        "SELECT action,resource_id,occurred_at,details FROM audit_events WHERE organization_id=$1 AND correlation_id=$2 ORDER BY occurred_at,id",
        [p.organizationId, work.correlation_id],
      )
    ).rows;
    await client.query(
      "INSERT INTO postmortems(id,organization_id,incident_id,work_order_id,title,summary,evidence,created_by) VALUES($1,$2,$3,$4,'Coolant loop recovery','Observed threshold breach led to an acknowledged incident, a parts-controlled repair, and fresh nominal telemetry. This is a simulated operations record; the failure mechanism was not independently proven.',$5,$6) ON CONFLICT DO NOTHING",
      [
        randomUUID(),
        p.organizationId,
        work.incident_id,
        work.id,
        JSON.stringify({
          events: evidence,
          crewId: work.crew_id,
          verificationAt: latest.last_observed_at,
        }),
        p.id,
      ],
    );
    work.status = "COMPLETED";
  } else if (input.action === "cancel_work_order") {
    if (work.status === "CANCELLED") return { id: work.id, status: work.status };
    demand(
      ["PLANNED", "AWAITING_PARTS", "READY"].includes(work.status),
      "INVALID_TRANSITION",
      "Only unstarted repairs can be cancelled.",
    );
    const active = (
      await client.query(
        "SELECT id FROM purchase_requests WHERE organization_id=$1 AND work_order_id=$2 AND status IN ('PENDING_APPROVAL','APPROVED','IN_TRANSIT')",
        [p.organizationId, work.id],
      )
    ).rowCount;
    demand(!active, "PURCHASE_ACTIVE", "Cancel or receive the associated purchase first.");
    await closeReservationTx(client, p, work, false);
    await client.query(
      "UPDATE work_orders SET status='CANCELLED' WHERE organization_id=$1 AND id=$2",
      [p.organizationId, work.id],
    );
    work.status = "CANCELLED";
  } else throw new DomainError(400, "UNKNOWN_COMMAND", "Unsupported maintenance command.");
  await audit(client, p, "WorkOrderUpdated", work.id, work.correlation_id, {
    action: input.action,
    incidentId: work.incident_id,
    status: work.status,
    ...(input.action === "complete_task" ? { taskKey: input.taskKey } : {}),
    ...(input.action === "assign_crew" ? { crewId: input.crewId } : {}),
  });
  return { id: work.id, status: work.status };
}
