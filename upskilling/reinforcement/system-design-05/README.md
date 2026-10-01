# 06. Helios / astra1: system design

**Design case:** Explain and extend a transactional repair workflow without overstating its boundaries.

This track adds a focused system-design route to the [existing reinforcement pack](../README.md), [interview practice](../interview-03/README.md), and [worked learning material](../guided-04/README.md). It preserves them all. Start with one user journey, one hard invariant, and one failure timeline; then justify each component you add.

## Study route

| Step | Material | Artifact to produce |
|---|---|---|
| 1 | [Worked architecture](01-worked-design.md) | Explain authority and every arrow |
| 2 | [API and data contracts](02-contracts-data.md) | Request examples, keys, consistency rules |
| 3 | [Failure and recovery lab](03-failure-recovery.md) | Crash/race trace and proof plan |
| 4 | [Capacity and scaling](04-capacity.md) | Reproduce arithmetic and challenge assumptions |
| 5 | [Decision record and journal](05-design-decisions.md) | Defend one choice and a revisit trigger |
| 6 | [Timed interview](06-interview-lab.md) | A coherent forty-five-minute design |
| Review | [Separate reference notes](_answers/REFERENCE.md) | Compare guarantees, not diagram size |

The [shared design guide](<../../../../opusorganize/junior-reinforcement/system-design-05/DESIGN-METHOD.md>) covers requirements, consistency, ownership, caches, queues, storage, recovery, and communication. The [all-project route](<../../../../opusorganize/junior-reinforcement/system-design-05/README.md>) gives the progression across all ten cases.

## What the inspected source establishes

The project instructions describe a Next.js/TypeScript modular monolith with PostgreSQL and authorized server operations. The Run003 record documents a late-postmortem failure regression covering repair rollback and command replay. Current-state explicitly labels identity, payments, incidents, and default adviser output as local simulation/fixture behavior. Historical checks are not new runtime verification.

- [docs/project/current-state.md](<../../../docs/project/current-state.md>)
- [docs/exec-plans/003-repair-rollback-regression.md](<../../../docs/exec-plans/003-repair-rollback-regression.md>)
- [src/server/queries.ts](<../../../src/server/queries.ts>)
- [src/server/billing.ts](<../../../src/server/billing.ts>)
- [src/server/ledger.ts](<../../../src/server/ledger.ts>)
- [src/server/observability.ts](<../../../src/server/observability.ts>)

Everything labeled proposed, design contract, target architecture, exercise load, or journal is teaching material. Diagrams show a worked design, not an assertion that every depicted component is deployed. API paths, fields, and storage keys below are illustrative contracts unless the source observation explicitly says otherwise. No migration or application implementation is performed by this track.

**Invariant to defend:** A repair completion either commits every included domain effect and its receipt, or commits none; replay of a successful logical command does not consume inventory again.

Human mastery remains unassessed. A correct capacity calculation or a source trace does not establish production throughput or complete a learner's design defense.
