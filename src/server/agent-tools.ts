import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { Principal } from "../domain/contracts";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";
import { searchKnowledgeTx } from "./knowledge";

const assetArgs = z.object({ assetId: z.string().min(1).max(80) }).strict();
export const TOOL_REGISTRY = {
  get_asset_details: { risk: "READ_ONLY", schema: assetArgs },
  get_sensor_history: { risk: "READ_ONLY", schema: assetArgs },
  get_maintenance_history: { risk: "READ_ONLY", schema: assetArgs },
  check_inventory: {
    risk: "READ_ONLY",
    schema: z.object({ sku: z.string().min(1).max(80) }).strict(),
  },
  search_procedure_manual: {
    risk: "READ_ONLY",
    schema: z.object({ query: z.string().min(2).max(300) }).strict(),
  },
  get_customer_context: { risk: "READ_ONLY", schema: z.object({}).strict() },
  get_incident_timeline: { risk: "READ_ONLY", schema: z.object({ incidentId: z.uuid() }).strict() },
} as const;
export type ToolName = keyof typeof TOOL_REGISTRY;
export async function toolTx(
  c: PoolClient,
  p: Principal,
  name: ToolName,
  args: unknown,
): Promise<unknown> {
  if (!Object.hasOwn(TOOL_REGISTRY, name))
    throw new DomainError(403, "TOOL_DENIED", "Tool is outside the agent allowlist.");
  const input = TOOL_REGISTRY[name].schema.parse(args);
  if (name === "get_customer_context")
    return {
      invoices: (
        await c.query(
          "SELECT id,period,status,amount_cents FROM invoices WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 10",
          [p.organizationId],
        )
      ).rows,
      tickets: (
        await c.query(
          "SELECT title,status,summary FROM support_tickets WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 10",
          [p.organizationId],
        )
      ).rows,
    };
  if ("incidentId" in input) {
    if (
      !(
        await c.query("SELECT id FROM incidents WHERE organization_id=$1 AND id=$2", [
          p.organizationId,
          input.incidentId,
        ])
      ).rowCount
    )
      throw new DomainError(404, "NOT_FOUND", "Incident not found.");
    return (
      await c.query(
        "SELECT action,details,occurred_at FROM audit_events WHERE organization_id=$1 AND (resource_id=$2 OR details->>'incidentId'=$2) ORDER BY occurred_at LIMIT 80",
        [p.organizationId, input.incidentId],
      )
    ).rows;
  }
  if ("assetId" in input) {
    const asset = (
      await c.query(
        "SELECT id,designation,status,last_observed_at FROM assets WHERE organization_id=$1 AND id=$2",
        [p.organizationId, input.assetId],
      )
    ).rows[0];
    if (!asset) throw new DomainError(404, "NOT_FOUND", "Asset not found.");
    if (name === "get_asset_details") return asset;
    if (name === "get_sensor_history")
      return (
        await c.query(
          "SELECT observed_at,pressure_bar,vibration_mms,applied,breached FROM telemetry_readings WHERE organization_id=$1 AND asset_id=$2 ORDER BY observed_at DESC LIMIT 12",
          [p.organizationId, input.assetId],
        )
      ).rows;
    return (
      await c.query(
        "SELECT id,title,status,completed_at FROM work_orders WHERE organization_id=$1 AND asset_id=$2 ORDER BY created_at DESC LIMIT 10",
        [p.organizationId, input.assetId],
      )
    ).rows;
  }
  if ("query" in input) return searchKnowledgeTx(c, p, input.query);
  if ("sku" in input)
    return (
      await c.query(
        "SELECT warehouse_id,sku,on_hand,reserved,on_hand-reserved AS available FROM inventory_stock WHERE organization_id=$1 AND sku=$2 ORDER BY warehouse_id",
        [p.organizationId, input.sku],
      )
    ).rows;
  throw new DomainError(400, "INVALID_TOOL_ARGUMENTS", "Unsupported tool arguments.");
}
export async function executeAgentTool(
  p: Principal,
  name: ToolName,
  args: unknown,
  pool: Pool = getPool(),
) {
  return transaction(pool, (c) => toolTx(c, p, name, args));
}
