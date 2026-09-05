# Terms you can locate in the code

| Term                 | Helios example                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Agent loop           | An implementation step followed by a check, evidence review, and a new decision.                                                         |
| Harness              | The surrounding commands, environment, instructions, tests, permissions, and records that let the coding agent act and evaluate results. |
| Acceptance criterion | “Replaying a reading leaves the number of persisted effects unchanged.”                                                                  |
| Invariant            | At most one unresolved incident per asset and organization.                                                                              |
| Transaction          | The database boundary that commits a reading and its related effects together.                                                           |
| Idempotency          | Repeating a request identity returns the stored outcome without additional effects.                                                      |
| Correlation          | A run ID links the generated readings, opening incident, and audit evidence.                                                             |
| Tenant isolation     | Selene's principal cannot query or mutate Helios assets or incidents.                                                                    |
| Row lock             | `FOR UPDATE` serializes state transitions for the same pump.                                                                             |
| Checkpoint           | Verified state and the next step written for an agent that lacks the old conversation.                                                   |
| Determinism          | Same generator inputs produce the same fixture values and timestamps.                                                                    |
| Evaluation           | Comparing outputs against predetermined criteria, including failures and uncertainty.                                                    |
| Product agent        | A future diagnostic assistant running inside Helios; distinct from the coding agent building it.                                         |

For every term, find a concrete file, query, test, or artifact before treating the definition as understood.
