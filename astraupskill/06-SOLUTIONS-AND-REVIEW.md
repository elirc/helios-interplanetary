# Read the receipt as a commit witness

After failure, the work order remains VERIFYING, the incident remains ACKNOWLEDGED, and the assigned crew remains unavailable. The local stock is one on hand and one reserved. No postmortem or receipt exists for the attempted completion, and the organization's audit count equals its captured baseline. Those values show that earlier repair effects did not escape the failed transaction.

The recovery request uses the same identifier and payload and returns replayed false because the failed attempt left no receipt. The next identical request returns replayed true. Stock is consumed once, the incident is resolved, and the fixture has one postmortem and one command receipt. A new identifier would exercise another command rather than prove recovery of the original one.

Saving a receipt independently can claim success for rolled-back work or leave committed effects without replay protection. The wrapper's transaction ties receipt insertion to the domain operation. Finally cleanup removes the specifically named failure trigger and function, preventing contamination even when assertions fail.

The targeted test establishes rollback and replay in the owned PostgreSQL environment. The browser flow establishes the visible repair sequence under the configured local simulation. Neither certifies real-world equipment, public deployment, live-model behavior, or human mastery. Review the new execution plan and accepted logs without rewriting the historical baseline's claims.

## Source excerpt

From [src/server/operations.ts](../src/server/operations.ts).

```ts
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
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)
