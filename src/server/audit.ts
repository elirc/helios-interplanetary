import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Principal } from "../domain/contracts";

export async function audit(
  client: PoolClient,
  principal: Principal,
  action: string,
  resourceId: string,
  correlationId: string,
  details: Record<string, unknown>,
) {
  await client.query(
    `INSERT INTO audit_events (id, organization_id, actor_id, action, resource_id, correlation_id, details) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      randomUUID(),
      principal.organizationId,
      principal.id,
      action,
      resourceId,
      correlationId,
      JSON.stringify(details),
    ],
  );
}
