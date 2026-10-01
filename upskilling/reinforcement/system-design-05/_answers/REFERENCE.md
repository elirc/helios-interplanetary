# Reference reasoning: Helios / astra1

Attempt the [design interview](../06-interview-lab.md) first. This is one defensible direction, not a unique correct architecture or a production patch.

## The core answer

Preserve the existing transaction-centered modular-monolith boundary and make asynchronous effects explicitly downstream of commit. The invariant remains: **A repair completion either commits every included domain effect and its receipt, or commits none; replay of a successful logical command does not consume inventory again.**

Start from the documented repair transaction and trace the writes that belong to it. Reservation consumption, work-order completion, releases, audit, postmortem, and receipt persistence need a coherent accepted outcome. The existing late-failure regression is valuable because a failure near the end tests whether earlier effects truly share the rollback boundary.

Keep HTTP concerns outside the authorized domain operation. The browser supplies intent, not trusted tenant identity. A command receipt must be scoped and tied to the accepted effect so a response-lost retry can recover the prior result. A failed rolled-back attempt and a replay after success are different states; use both in the explanation.

Background work should originate from committed intent. A worker may retry delivery or projections, but a notification failure must not turn an accepted repair into an uncommitted one. Conversely, sending an external action before the transaction commits can create an effect the local rollback cannot erase. The project's simulated adapters must remain explicitly distinguished from any future real-world integration.

A modular monolith is a useful boundary while the repair invariant spans several tables. Splitting inventory, work orders, and receipts into independent services would change the atomicity problem, not simply improve scalability. A later separation needs a new business contract for intermediate states and reconciliation, plus evidence that the operational benefit justifies the added failure modes.

## The failure answer must name the boundary

Read the existing Run003 assertions before proposing another regression. A new exercise can ask the learner to enumerate every rollback assertion and identify why an exception-only check would be weaker. For any proposed external integration, draw the window after the external effect but before local acknowledgement and specify reconciliation separately from local rollback.

Reject an explanation that replaces this with a technology name. A queue does not by itself decide ownership, a transaction does not automatically include an external effect, and a cache key does not enforce authorization. Ask the learner to put the failure between two concrete steps and show the accepted, rejected, and unchanged state.

## Capacity and tradeoff answer

The backlog estimate assumes independent jobs, ideal workers, and no downstream cap; a repair transaction cannot be parallelized arbitrarily by adding workers. The storage figure is payload only and excludes indexes, backups, replication, and any unmodeled fanout. A local historic latency sample is not a production SLO.

The accepted cost is: The transaction boundary couples participating writes and can become a contention point; careful query work and bounded command execution matter. The revisit trigger is: Revisit service boundaries when independently measured ownership, deployment, or load requirements outweigh the cost of replacing atomic behavior with a distributed workflow contract.

Accept alternatives that meet the same clarified contract and expose their costs. Do not reward unnecessary components or a fabricated production traffic number. The strongest follow-up asks what requirement would make this answer wrong and how the candidate would detect that change.

## What counts as completion

The learner can explain one happy path, one competing or failed path, the authoritative data identity, and one calculation with units. They can name the difference between inspected source and proposed design. An application guarantee still needs the corresponding runtime evidence. Historical tests remain historical; no new application verification is implied by reading these notes.
