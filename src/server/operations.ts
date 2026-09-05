import type { Pool, PoolClient } from "pg";
import type { Principal } from "../domain/contracts";
import { operationSchema, type CommandResult, type Operation } from "../domain/operations";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";
import { requireOperator } from "./identity";
import { reservePartsTx } from "./inventory";
import { dispatchPurchaseTx, shipmentCommandTx } from "./logistics";
import { createWorkOrderTx, maintenanceCommandTx } from "./maintenance";
import { lockWorkOrder } from "./operations-common";
import { decidePurchaseTx, requestPurchaseTx } from "./procurement";

export async function idempotentCommand<T extends object>(
  p: Principal,
  input: { commandId: string },
  work: (client: PoolClient) => Promise<T>,
  pool: Pool = getPool(),
): Promise<T & { replayed?: boolean }> {
  requireOperator(p);
  return transaction(pool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `${p.organizationId}:command:${input.commandId}`,
    ]);
    const previous = (
      await client.query<{ actor_id: string; same: boolean; result: T }>(
        "SELECT actor_id,payload=$3::jsonb AS same,result FROM operation_commands WHERE organization_id=$1 AND id=$2",
        [p.organizationId, input.commandId, JSON.stringify(input)],
      )
    ).rows[0];
    if (previous) {
      if (!previous.same || previous.actor_id !== p.id)
        throw new DomainError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This command ID belongs to different input or actor.",
        );
      return { ...previous.result, replayed: true };
    }
    const result = await work(client);
    await client.query(
      "INSERT INTO operation_commands(organization_id,id,actor_id,payload,result) VALUES($1,$2,$3,$4,$5)",
      [p.organizationId, input.commandId, p.id, JSON.stringify(input), JSON.stringify(result)],
    );
    return { ...result, replayed: false };
  });
}

export async function executeOperation(
  p: Principal,
  raw: unknown,
  pool: Pool = getPool(),
): Promise<CommandResult> {
  const input = operationSchema.parse(raw);
  return idempotentCommand(p, input, (client) => operationTx(client, p, input), pool);
}
export async function operationTx(
  client: PoolClient,
  p: Principal,
  input: Operation,
): Promise<CommandResult> {
  switch (input.action) {
    case "create_work_order":
      return createWorkOrderTx(client, p, input.incidentId);
    case "reserve_parts":
      return reservePartsTx(client, p, (await lockWorkOrder(client, p, input.workOrderId)).work);
    case "request_purchase":
      return requestPurchaseTx(client, p, input.workOrderId);
    case "approve_purchase":
    case "reject_purchase":
    case "cancel_purchase":
      return decidePurchaseTx(client, p, input.purchaseId, input.action);
    case "dispatch_purchase":
      return dispatchPurchaseTx(client, p, input.purchaseId);
    case "delay_shipment":
    case "reroute_shipment":
    case "deliver_shipment":
      return shipmentCommandTx(client, p, input.shipmentId, input.action);
    default:
      return maintenanceCommandTx(client, p, input);
  }
}
