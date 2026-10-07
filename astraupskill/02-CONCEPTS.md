# Rollback leaves no receipt; replay requires one

A command receipt is evidence that an operation committed. If a repair failed late but its receipt were saved anyway, the next request would look already complete even though the domain effects rolled back. If the domain effects committed without the receipt, a retry could repeat work. Keeping both in one transaction (`src/server/operations.ts:20-45`) ties the replay decision to durable success.

Three outcomes, kept separate:

| Outcome | When | Observable result |
|---|---|---|
| **Rollback** | `work(client)` throws (here: the injected postmortem trigger) | `transaction` runs `ROLLBACK` (`src/server/db.ts:26-28`). Work order stays `VERIFYING`, incident `ACKNOWLEDGED`, crew unavailable, stock `on_hand=1, reserved=1`; no postmortem, no receipt, audit count unchanged. |
| **Fresh execution** | No receipt exists for `(organization_id, commandId)` | Work runs, receipt inserted, `replayed: false`. A retry after a rollback is this case, not a replay. |
| **Replay** | Receipt exists, same actor, same payload | Stored `result` returned with `replayed: true`; `work` never runs. |
| **Conflict** | Receipt exists, different payload or actor | 409 `IDEMPOTENCY_CONFLICT` (`operations.ts:31-35`). |

```ts
// src/server/operations.ts:24-37
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
```

Two details worth noticing:

- `payload=$3::jsonb` compares **jsonb** values, so key order in the JSON string does not matter; the compared input is the zod-parsed object from `executeOperation`, not the raw request body.
- There is a second, independent idempotency layer in the domain: `complete_repair` returns early if the work order is already `COMPLETED` (`src/server/maintenance.ts:165`). That guard protects a *different* command id from re-completing the repair; the receipt protects the *same* command id from re-running at all.

The regression checks database state after the exception instead of assuming that a rejected promise proves rollback. A function can throw after some independent writes have committed (for example, writes made through a different pool connection). Only durable-state assertions across the affected tables substantiate the atomicity contract.

[01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md)
