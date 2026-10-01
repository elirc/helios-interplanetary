# Rollback leaves no receipt; replay requires one

A command receipt is evidence that an operation committed. If a repair fails late, saving its receipt anyway would make the next request appear already complete even though the domain effects rolled back. Conversely, committing domain effects without the receipt would let a retry repeat work. Keeping both in one transaction binds the replay decision to durable success.

Rollback and replay are different outcomes. The injected failure should leave the work order VERIFYING, incident ACKNOWLEDGED, crew unavailable, and inventory still reserved. It must create neither a postmortem nor a command receipt, and it must not add audit rows. Retrying after removing the failure is therefore a new successful execution, not a replay.

After that execution commits, sending the same command again returns replayed true. The saved actor and payload must match; the existing wrapper rejects reuse of an identifier for different input or another actor. The advisory lock coordinates concurrent use of the same command key within the organization.

The regression checks database state after the exception instead of assuming that a rejected promise proves rollback. A function can throw after some independent writes have committed. Only durable-state assertions across the affected tables substantiate the atomicity contract being exercised here.

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
