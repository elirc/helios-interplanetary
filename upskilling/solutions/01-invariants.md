# Lab 1 answer key

Read after recording your predictions. These explanations describe the first implemented slice; re-check them if the code evolves.

## A. Duplicate and new execution

A fresh Helios fixture has 36 readings, zero active incidents, and no incident-opening audit event. Degradation adds twelve readings and opens one incident: 48 readings, one active incident, one opening event.

Identical replay adds nothing. A new run ID with the same seed represents a new sequence, so it adds twelve readings at later virtual timestamps. There are now 60 readings and still one active incident, with the original opening event. An unresolved incident covers the active episode until an operator resolves it.

The seed controls generated values. The run ID identifies an execution. Deduplicating solely by seed would reject legitimate repeated scenarios. Reusing a run ID with a changed payload is a conflict rather than a silent second execution.

## B. Race behavior

Without a lock and uniqueness constraint, request A and B can both read “no active incident,” insert separate incidents, and commit. Checking first does not prevent the interleaving.

With the partial unique index but without coordinated locking, the database rejects the second conflicting insert. That protects stored uniqueness, but the service needs a conflict/retry strategy to produce the intended successful response. The implemented asset lock serializes the decision and the constraint reinforces the invariant. All relevant transitions follow the same lock order.

The tests submit concurrent transactions through separate pool connections. They assert committed counts and outcomes; they do not merely mock how many times a helper was called.

## C. Late observation

The older reading is inserted with `applied=false`. A telemetry audit record records receipt, but the asset's latest timestamp/status stays unchanged and the reading does not open or attach to a current incident. For equal-time distinct observations, the same policy applies. Identical-ID retries are handled earlier as duplicates.

This policy protects current state. It can miss historical anomalies for the purpose of incident detection. A future feature could analyze historical windows separately and produce explicitly retrospective findings, with its own deduplication and alerting policy. It should not silently overwrite newer live state.

## D. Tenant boundary

React filtering cannot prevent a caller from sending a direct HTTP request. The signed session maps to a server principal. Domain queries and writes include `organization_id`, and an asset outside that scope is treated as not found. Composite foreign keys prevent a reading or incident from referencing another organization's asset.

Database constraints reinforce relationship integrity, but do not replace read authorization. This implementation uses query scoping rather than row-level security. The persona selector is a local demonstration mechanism, not proof of real-world user identity.

## E. Limits of evidence

The duplicate-delivery test rejects implementations that append extra readings, incidents, or audit records on retry. It would not by itself detect an unrelated cross-tenant read leak. The role/tenant tests address another part of that risk.

The pool-reconnect test shows data survived a new application connection. It does not establish recovery from physical disk failure, replication consistency, backups, or durability under every storage configuration. The browser flow demonstrates rendered behavior and interaction; PostgreSQL assertions establish the transaction properties they explicitly check.

A useful extension is a direct SQL attempt to violate cross-organization relationships. A regression test now covers equal-time historical readings crowding the current applied reading out of the UI query window. Choose extensions because they test important stated invariants, not because more test cases automatically mean more confidence.
