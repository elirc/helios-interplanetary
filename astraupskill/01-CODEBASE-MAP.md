# Locate the command receipt and the maintenance transaction

executeOperation validates the command and delegates to idempotentCommand. That wrapper checks operator authority, starts a transaction, and takes an advisory transaction lock scoped to organization and command identifier. It looks for a previous receipt whose actor and payload must match. A valid replay returns the saved result before executing the domain operation again.

New commands run operationTx on the same PoolClient. Repair actions reach maintenanceCommandTx, which applies the existing work-order, checklist, crew, inventory, and verification rules. Only after work succeeds does idempotentCommand insert operation_commands. That receipt therefore belongs to the same transaction as the repair effects.

The integration test uses repairFixture and command helpers to create a legitimate VERIFYING repair with reserved stock, an assigned crew, completed tasks, and fresh nominal telemetry. The failure is injected at the database postmortem boundary rather than replacing the domain function with a mock.

scripts/test-owned-postgres.py creates a fresh loopback helios_test database with a dedicated role. Its modes run the full check, API smoke, or affected browser case sequentially. The existing application database and packaged preview are not part of this fixture. Follow these boundaries when distinguishing the new regression from the historical completed program.

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
