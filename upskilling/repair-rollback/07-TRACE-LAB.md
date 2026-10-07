# Trace the same command through three attempts

Draw three columns: **failed attempt**, **recovery**, **replay**. Use one command id across all three. For each row, write the file:line that executes.

| Step | Failed attempt | Recovery | Replay |
|---|---|---|---|
| `requireOperator` | operations.ts:19 passes | passes | passes |
| `BEGIN` | db.ts:22 | db.ts:22 | db.ts:22 |
| Advisory lock on `<org>:command:<id>` | operations.ts:21-23 | same | same |
| Receipt lookup | operations.ts:24-29, no row | no row (the failed attempt left none) | row found, payload and actor match |
| `operationTx` → `maintenanceCommandTx` | runs | runs | **skipped** (returns at operations.ts:37) |
| Consume stock (maintenance.ts:184) | tentative | committed | not executed |
| Work order / crew / incident / audit (186-200) | tentative | committed | not executed |
| Postmortem insert (208) | **trigger raises** | inserted | not executed |
| Receipt insert (operations.ts:40-43) | not reached | inserted | not executed |
| End | `ROLLBACK` (db.ts:27), error rethrown | `COMMIT`, `replayed:false` | `COMMIT` (read-only), `replayed:true` |

After the first column, query the database from outside the transaction and record the original `VERIFYING` work order, reserved stock, unchanged audit count, and absent receipt. The exception alone is not your evidence; the stored values are.

**Final thought experiment:** keep the id, change `workOrderId`, and trace a fourth column. It stops at operations.ts:31-35 with 409 `IDEMPOTENCY_CONFLICT`: a rejected reuse of an id, not a replay.

**Check:** every line number in your table should land on the statement you named; open each one. The test that drives columns 1-3 is `tests/integration/repair.test.ts:250-355`.

[06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [VERIFICATION](VERIFICATION.md)
