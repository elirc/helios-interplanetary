# Failure and recovery: Helios / astra1

This is a tabletop and integration-planning lab. It introduces no deliberate application defects and does not run infrastructure.

## Worked timeline

| Event or failure point | Authoritative/durable state | User or worker consequence |
|---|---|---|
| Repair command begins | Original inventory and workflow state still define the pre-state | No success response yet |
| Several writes execute inside the transaction | Changes are uncommitted | Other systems must not infer completion from an in-process log |
| Late postmortem insert fails | Entire included effect set rolls back | Return failure without leaked receipt or inventory consumption |
| Retry after removing the injected failure | One complete transaction commits | Return accepted outcome |
| Replay same successful identity | Saved receipt is returned | No repeated consumption or duplicate transition |

The invariant across the timeline is **A repair completion either commits every included domain effect and its receipt, or commits none; replay of a successful logical command does not consume inventory again.**. Mark which transitions are atomic, which are observations, and which can be delivered again. A repeated message and a repeated effect are not the same thing. Selection, claiming, execution, committing, and acknowledging should remain separate words until the actual implementation proves they share a boundary.

## Focused proof plan

Read the existing Run003 assertions before proposing another regression. A new exercise can ask the learner to enumerate every rollback assertion and identify why an exception-only check would be weaker. For any proposed external integration, draw the window after the external effect but before local acknowledgement and specify reconciliation separately from local rollback.

Preserve the fixture and initial state. Inject one failure at a named point, inspect all relevant effects, then recover using the same logical identity when the contract requires it. A test that only checks an exception can miss leaked durable changes. A test that mocks the critical repository may assume the property it was intended to establish.

## Three additional disturbances

**Dependency unavailable:** choose the dependency this design actually needs. Specify whether the operation fails, queues durably, serves a permitted stale read, or continues in a reduced mode. Define a bound on fallback work so recovery does not overload the next dependency.

**Duplicate or reordered input:** reuse an operation/event identity and vary delivery order. Explain which replays are harmless, which conflicting payloads must be rejected, and which outcomes require reconciliation. Do not promise exactly-once transport when the guarantee is really one durable effect per accepted identity.

**Old worker or client resumes:** let an earlier owner finish after scope, revision, session, or lease ownership changes. Identify the check at application/commit time that prevents obsolete work from taking ownership. Cancellation at launch is not enough to explain this case.

## Recovery and observability

Observe command outcomes, rollback reasons, receipt replay/conflict counts, oldest committed worker intent, and domain completion separately from HTTP success. Preserve current-state caveats about simulations and live providers in every portfolio explanation.

Set a hypothetical recovery objective for the authoritative dataset and a separate one for rebuildable projections. State the allowable data-loss window (RPO) and time to useful restored service (RTO), then describe a restore rehearsal that could measure them. Do not claim those objectives are achieved merely because a backup command exists.

After a restore, decide how outstanding receipts, delayed events, and external effects reconcile with the restored state. A database restored to an earlier point can forget a previously accepted operation while an external effect still exists. The recovery plan needs that case, not only row counts after restoring a file.

## Handoff artifact

Write one page containing the failure trigger, expected durable state, exact identity used on retry, distinguishing observation, recovery action, and remaining uncertainty. A teammate should be able to tell whether your evidence comes from source reading, a pure model, a database exercise, or an external integration. Human learning and runtime guarantees remain separate assessments.
