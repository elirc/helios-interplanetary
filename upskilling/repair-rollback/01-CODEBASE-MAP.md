# Locate the command receipt and the maintenance transaction

| Step | Where | What happens |
|---|---|---|
| 1 | `src/server/operations.ts:48-55` `executeOperation` | Parses the raw body with `operationSchema` (zod), then calls `idempotentCommand` with `operationTx` as the work. |
| 2 | `src/server/operations.ts:19` | `requireOperator(p)` (`src/server/identity.ts:121-124`) rejects non-operators with 403 **before** any transaction or replay lookup. |
| 3 | `src/server/db.ts:16-32` `transaction` | `pool.connect()`, `BEGIN`, run work, `COMMIT`; on any throw, `ROLLBACK` and rethrow; always `release()`. |
| 4 | `src/server/operations.ts:21-23` | `pg_advisory_xact_lock(hashtextextended('<org>:command:<commandId>',0))` serialises concurrent calls with the same command id; the lock is released at commit/rollback. |
| 5 | `src/server/operations.ts:24-37` | Looks up `operation_commands` by `(organization_id,id)`. If a row exists and both `payload` (jsonb equality) and `actor_id` match, returns the stored `result` with `replayed: true`; otherwise 409 `IDEMPOTENCY_CONFLICT`. |
| 6 | `src/server/operations.ts:56-81` `operationTx` | Dispatches on `input.action`; repair actions fall through to `maintenanceCommandTx` (`src/server/maintenance.ts:59`). |
| 7 | `src/server/maintenance.ts:164-222` | `complete_repair`: requires `VERIFYING` plus newer nominal telemetry, then `closeReservationTx(..., true)` (line 184), work order `COMPLETED`, crew available, incident `RESOLVED`, `audit(...)`, and finally the postmortem insert (line 208). |
| 8 | `src/server/operations.ts:39-43` | Only after work returns does the receipt get inserted, on the same `PoolClient`, so it commits or rolls back with the repair. |

Schema anchors: `operation_commands` has `PRIMARY KEY(organization_id,id)` (`db/migrations/002-repair-supply-chain.sql:108-112`); `postmortems` has `UNIQUE(organization_id,incident_id)` (same file, line 104).

## Test side

- `tests/helpers.ts:10-18` `testPool` refuses to run unless `TEST_DATABASE_URL` points at a loopback `/helios_test` database **different from** `DATABASE_URL`. This is the "isolation guard" mentioned in [VERIFICATION](VERIFICATION.md).
- `tests/helpers.ts:19-21` `command` sends each setup step with a fresh `randomUUID()` command id.
- `tests/helpers.ts:22-36` `repairFixture` runs a degradation scenario, acknowledges the incident, and creates a work order.
- `scripts/test-owned-postgres.py` runs `initdb` into a temp directory (user `astra_test`, trust auth, loopback port), creates `helios` and `helios_test` databases, and runs `npm run check`, the API smoke, or the coolant-repair browser case against them. It defaults to `--postgres-bin 'C:/Program Files/PostgreSQL/18/bin'`; pass your own path elsewhere.

The excerpt every later file builds on:

```ts
// src/server/operations.ts:39-46
    const result = await work(client);
    await client.query(
      "INSERT INTO operation_commands(organization_id,id,actor_id,payload,result) VALUES($1,$2,$3,$4,$5)",
      [p.organizationId, input.commandId, p.id, JSON.stringify(input), JSON.stringify(result)],
    );
    return { ...result, replayed: false };
  });
}
```

[README](README.md) / [02-CONCEPTS](02-CONCEPTS.md)
