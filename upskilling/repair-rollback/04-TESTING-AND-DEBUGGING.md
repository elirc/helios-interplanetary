# Inspect all effects after the rejected transaction

The regression needs a real PostgreSQL database: the trigger fires inside the transaction that attempts the postmortem insert, and that is what rolls back the earlier writes. A mock or in-memory repository could imitate the final values without exercising the database behavior, so none is substituted.

## Running it

| Route | Command | Needs |
|---|---|---|
| Docker (README default) | `npm run setup`, then `npm run test:integration` | Docker, `.env` from `npm run configure` |
| Owned temp cluster | `python scripts/test-owned-postgres.py --mode check` (add `--postgres-bin <dir>` if PostgreSQL is not at `C:/Program Files/PostgreSQL/18/bin`) | Python 3, local PostgreSQL binaries, `npm ci` done |
| Just this test | `npx tsx --env-file-if-exists=.env --test --test-name-pattern "late completion failure" tests/integration/repair.test.ts` | A reachable `TEST_DATABASE_URL` |

`npm run check` is `lint && typecheck && test && test:integration && build` (`package.json`), so the `--mode check` route also builds the app; budget time for it.

## Reading the assertions

- The audit assertion compares with a **captured baseline**, not with zero: fixture setup legitimately writes audit history.
- The receipt assertion filters by the exact `commandId`; the postmortem assertion by the fixture incident. Those scopes separate this attempt from setup effects (setup commands each create their own receipts).

## When it fails

| Symptom | Likely cause | Look at |
|---|---|---|
| `TEST_DATABASE_URL is required` or an assertion about `/helios_test` | Isolation guard in `tests/helpers.ts:10-18` | Your `.env`; the test URL must be loopback, end in `/helios_test`, and differ from `DATABASE_URL` |
| Rejects with `VERIFICATION_REQUIRED` instead of the injected message | Telemetry precondition not met | The nominal `runScenario` call (repair.test.ts:260-264) and `maintenance.ts:177-183` |
| Rejects with `INVALID_TRANSITION` | A setup step out of order | The checklist loop (repair.test.ts:257-258) |
| Later, unrelated tests fail on postmortem inserts | Trigger left behind | The `finally` block (repair.test.ts:324-327); keep cleanup failures visible |

The broader acceptance commands (lint, typegen, unit, integration, build, API smoke, coolant-repair browser flow) each provide different evidence. The trigger regression proves a local persistence property; a passing browser flow demonstrates the visible workflow but does not replace the database rollback assertions.

[03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [05-PRACTICE](05-PRACTICE.md)
