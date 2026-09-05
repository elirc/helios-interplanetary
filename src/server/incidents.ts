import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { IncidentStatus, Principal } from "../domain/contracts";
import { audit } from "./audit";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";
import { requireOperator } from "./identity";
import { lockAsset } from "./telemetry";

export async function transitionIncident(
  principal: Principal,
  id: string,
  action: "acknowledge" | "resolve",
  pool: Pool = getPool(),
) {
  requireOperator(principal);
  return transaction(pool, async (client) => {
    const candidate = await client.query<{ asset_id: string }>(
      "SELECT asset_id FROM incidents WHERE organization_id=$1 AND id=$2",
      [principal.organizationId, id],
    );
    if (!candidate.rows[0]) throw new DomainError(404, "NOT_FOUND", "Incident not found.");
    await lockAsset(client, principal, candidate.rows[0].asset_id);
    const row = (
      await client.query<{ status: IncidentStatus; asset_status: string; last_observed_at: Date }>(
        `SELECT i.status,a.status AS asset_status,a.last_observed_at FROM incidents i JOIN assets a ON a.id=i.asset_id AND a.organization_id=i.organization_id WHERE i.organization_id=$1 AND i.id=$2`,
        [principal.organizationId, id],
      )
    ).rows[0];
    const target: IncidentStatus = action === "acknowledge" ? "ACKNOWLEDGED" : "RESOLVED";
    if (row.status === target) return { id, status: target, changed: false };
    if (row.status === "RESOLVED")
      throw new DomainError(
        409,
        "INVALID_TRANSITION",
        "A resolved incident cannot be acknowledged.",
      );
    if (action === "resolve" && row.asset_status !== "NOMINAL")
      throw new DomainError(
        409,
        "ASSET_DEGRADED",
        "Restore nominal telemetry before resolving this incident.",
      );
    if (action === "resolve" && row.status !== "ACKNOWLEDGED")
      throw new DomainError(
        409,
        "ACKNOWLEDGEMENT_REQUIRED",
        "Acknowledge the incident before resolving it.",
      );
    if (action === "resolve") {
      const activeWork = await client.query(
        "SELECT id FROM work_orders WHERE organization_id=$1 AND incident_id=$2 AND status NOT IN ('COMPLETED','CANCELLED')",
        [principal.organizationId, id],
      );
      if (activeWork.rowCount)
        throw new DomainError(
          409,
          "REPAIR_INCOMPLETE",
          "Complete and verify the linked work order before resolving this incident.",
        );
    }
    const column = action === "acknowledge" ? "acknowledged_at" : "resolved_at";
    await client.query(
      `UPDATE incidents SET status=$3, ${column}=$4 WHERE organization_id=$1 AND id=$2`,
      [principal.organizationId, id, target, row.last_observed_at],
    );
    await audit(
      client,
      principal,
      action === "acknowledge" ? "IncidentAcknowledged" : "IncidentResolved",
      id,
      randomUUID(),
      { from: row.status, to: target, observedAt: row.last_observed_at.toISOString() },
    );
    return { id, status: target, changed: true };
  });
}
