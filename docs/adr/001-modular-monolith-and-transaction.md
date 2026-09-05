# ADR 001: one deployable, explicit PostgreSQL transaction

Status: accepted for the first local slice.

## Context

We need to prove telemetry-to-incident correctness and teach the human developer how to inspect agent-written code. There is no measured requirement for independent services, queue transport, or an ORM abstraction.

## Decision

Use one Next.js Node.js process, module boundaries inside `src/server/`, pure rules inside `src/domain/`, and parameterized SQL through `pg`. Serialize asset transitions with a row lock and enforce one active incident with a partial unique index. Write telemetry, incidents, state changes, and audit records in the same transaction.

## Alternatives

- Separate API service: useful for independently deployed clients; adds deployment and network boundaries before the scenario requires them.
- ORM: offers productivity and schema tooling; direct SQL makes the first locking/concurrency exercise easier to inspect. Reconsider as query/schema complexity increases.
- Message broker: supports asynchronous delivery and independent consumers; requires persistence/dispatch coordination and replay rules that are unnecessary for this synchronous slice.

## Consequences

Transactions are visible and reproducible. The application has one deployable and one principal data store. A hot asset serializes writes, which is intentional at this scale. Audit records are durable database facts but are not a distributed event delivery guarantee.

Revisit when a measured workload needs independent ingestion capacity, consumers must progress after a crash, or deployment isolation is useful. Preserve invariants and meaningful integration tests across that migration.
