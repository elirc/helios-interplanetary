import type { PoolClient } from "pg";
import type { Principal } from "../domain/contracts";
import type { WorkOrderRow } from "../domain/operations";
import { DomainError } from "./errors";
import { lockAsset } from "./telemetry";

export function demand(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) throw new DomainError(409, code, message);
}
export async function lockWorkOrder(client: PoolClient, p: Principal, id: string) {
  const candidate = (
    await client.query<WorkOrderRow>(
      "SELECT * FROM work_orders WHERE organization_id=$1 AND id=$2",
      [p.organizationId, id],
    )
  ).rows[0];
  if (!candidate) throw new DomainError(404, "NOT_FOUND", "Work order not found.");
  const asset = await lockAsset(client, p, candidate.asset_id);
  const work = (
    await client.query<WorkOrderRow>(
      "SELECT * FROM work_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE",
      [p.organizationId, id],
    )
  ).rows[0];
  return { work, asset };
}
export async function simulationNow(client: PoolClient, p: Principal) {
  const row = (
    await client.query<{ now: Date }>(
      "SELECT GREATEST((SELECT now_at FROM simulation_state WHERE organization_id=$1),COALESCE(max(last_observed_at),'2042-03-19T14:23:00Z')) AS now FROM assets WHERE organization_id=$1",
      [p.organizationId],
    )
  ).rows[0];
  return row.now;
}
