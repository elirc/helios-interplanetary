# Contracts, data ownership, and consistency

The tables are **proposed design contracts** for the worked case. They are not migration files, verified production schemas, or a claim that these exact endpoint paths exist. Compare them with the [source map](README.md) before any implementation.

## Data model

| Entity | Identity / candidate key | Important fields | Owner or purpose |
|---|---|---|---|
| RepairCommandReceipt | (organization_id, command_id) | fingerprint, result, accepted_at | Records a successfully committed logical outcome |
| WorkOrder | (organization_id, work_order_id) | state, requirements, revision/context | Authoritative workflow record |
| Reservation/Journal | Scoped domain identity | inventory or financial lines under their group invariant | Effects included by the command contract |
| Outbox/WorkerProgress | durable event identity | payload/version, attempts, next_attempt, completion | Committed asynchronous work and recoverable progress |

Distinguish entity identity from operation identity. A record can receive many commands; a retry of one command should not automatically become a new intent. Include scope where it changes meaning. A globally unique-looking ID still needs authorization, and an opaque identifier should not be normalized as if it were human search text.

## Public API examples

| Illustrative endpoint | Input boundary | Accepted outcome | Other outcomes |
|---|---|---|---|
| POST /work-orders/{id}/complete | Command identity plus validated completion intent | 200 accepted/replayed result | Conflict, authorization, or validation result; rollback on command failure |
| GET /commands/{id} | Trusted organization and logical command ID | 200 recorded successful outcome | Unknown is distinct from known failure according to contract |
| GET /work-orders/{id}/history | Authorized scoped record | 200 committed transitions and related evidence | No browser-supplied tenant authority |

For one write, add literal examples of omitted, explicit null, zero, wrong-type, stale, and unauthorized input where meaningful. Do not collapse them with a truthiness default. Return an outcome that lets the UI distinguish rejection, accepted-but-not-yet-observed work, and an uncertain response. A timeout does not prove the effect rolled back.

## Query and constraint review

Inspect actual migrations and query plans before adding indexes. Review scoped command-identity uniqueness, work-order history ordering, and worker pending-work access. Aggregate ledger checks by organization and journal identity; a globally balanced total can hide two imbalanced groups.

Write the actual predicate and order before proposing an index. Compare the read improvement with write/storage cost and use representative data when examining a plan. A complete cursor must match the complete order; a cursor alone does not freeze a changing dataset across requests. An index improves access to data, while a constraint or conditional transition enforces a different kind of rule.

## Consistency worksheet

Fill four rows for the design: authoritative mutation, immediate read after that mutation, another user's projection, and asynchronous notification/progress. For each, state the source of truth, acceptable staleness, and recovery action. Do not label the entire system strongly or eventually consistent without naming which operation the statement concerns.

The invariant to protect is **A repair completion either commits every included domain effect and its receipt, or commits none; replay of a successful logical command does not consume inventory again.**. Identify the exact write predicate, transaction, or durable identity that enforces it. If the rule spans several records, explain why concurrent operations cannot each pass an earlier check and then commit an invalid combination. A transaction boundary and an isolation choice must be examined together.

## Compatibility, retention, and deletion

When adding a field or outcome, describe what an older client or stored object does. A safe proposal can expand readers first, backfill deliberately, and later require the new writer contract; the exact sequence depends on the repository. Do not call a schema sketch a completed migration.

Choose retention separately for authoritative records, command receipts, work intents, audit history, private source material, and cache entries. Expiring a receipt too early can change retry behavior. Keeping every private payload forever can create unnecessary exposure and operating cost. Record the product decision and recovery consequence rather than inventing a universal retention period.
