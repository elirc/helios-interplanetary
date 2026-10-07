# Prove late repair failure rolls back and can recover

Helios already completes a repair through a PostgreSQL transaction. The `complete_repair` branch of `maintenanceCommandTx` (`src/server/maintenance.ts:164-222`) consumes the reserved inventory, completes the work order, releases the crew, resolves the incident, writes an audit event, and inserts a postmortem; `idempotentCommand` (`src/server/operations.ts:13-46`) then saves the command receipt in the same transaction. This mini-course studies one regression test that proves those effects are all-or-nothing.

The regression (`tests/integration/repair.test.ts:250-355`) installs a test-owned trigger that rejects the postmortem insert, invokes the real `complete_repair` operation, and checks that every earlier write rolled back. After removing the trigger it retries the exact same command identifier and payload, then sends it once more. The retry must complete once; the last call must return the stored result (`replayed: true`) without consuming inventory twice.

This is a focused verification improvement, not a rebuild of the completed local program (see `docs/exec-plans/003-repair-rollback-regression.md`). A helper, `scripts/test-owned-postgres.py`, runs the repository checks against a throwaway PostgreSQL cluster.

## Route

| File | What you do |
|---|---|
| [01-CODEBASE-MAP](01-CODEBASE-MAP.md) | Locate the receipt wrapper, the transaction helper, and the repair branch |
| [02-CONCEPTS](02-CONCEPTS.md) | Rollback vs replay vs idempotency conflict |
| [03-WORKED-CHANGE](03-WORKED-CHANGE.md) | Walk the regression test line by line |
| [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) | Run it (needs PostgreSQL) and debug the common failures |
| [05-PRACTICE](05-PRACTICE.md) | Goal + **Check** exercises |
| [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) | Answers and senior-review notes |
| [07-TRACE-LAB](07-TRACE-LAB.md) | Trace one command id through three attempts |
| [VERIFICATION](VERIFICATION.md) | What was actually run, and what it proves |

Software verification does not establish human mastery; use the practice file for that.

This set mirrors `astraupskill/` (only relative link paths differ); the evidence files live in `astraupskill/evidence/`.
