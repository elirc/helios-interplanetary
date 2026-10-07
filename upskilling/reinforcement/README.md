# 06. Helios / astra1: reinforcement practice

Build a precise understanding of sorted, tenant-scoped pages before returning to raw SQL plans and operational queries.

## What this adds

Helios already has a newer completed workflow program, transaction rollback exercises, and SQL/performance material. This supplement adds deterministic ordering, cursor boundaries, and a SQL translation task. It follows the current-state and Run 003 records rather than treating the older audit as the current implementation.

This pack complements the existing material below. Start after its basic orientation or on-ramp, before the advanced incidents. Source references describe files inspected on 2026-09-26; record your current commit and working-tree differences before transferring an exercise into the app. New lab contracts are explicitly simplified teaching contracts, not claims about existing product behavior.

- [learn/README.md](<../../learn/README.md>)
- [learn/00-onramp.md](<../../learn/00-onramp.md>)
- [training/README.md](<../../training/README.md>)
- [upskilling/README.md](<../README.md>)
- [upskilling/repair-rollback/README.md](<../repair-rollback/README.md>)

## Four sessions, about 4–6 hours

| Session | Work | Evidence to keep |
|---|---|---|
| 1 · 45–60 min | [Foundations](01-foundations.md): read the named files and make predictions | Your annotated data flow and prediction table |
| 2 · 60–90 min | [Isolated lab](02-lab.md): implement the starter and add a boundary test | Failing result, passing result, and your explanation |
| 3 · 60–90 min | [Transfer and review](03-transfer.md): plan and, in your own practice branch, implement one small app change | A focused diff and the relevant app-level evidence |
| 4 · 45–60 min | [Checkpoint](CHECKPOINT.md): retrieval practice and a short defense | Score, limits of evidence, and one repeat date |

If setup blocks app work, finish the dependency-free lab and source-reading tasks. Mark the app transfer pending; lab success does not verify a React component, database, or deployed service.

## Source map

- [docs/project/current-state.md](<../../docs/project/current-state.md>)
- [docs/exec-plans/003-repair-rollback-regression.md](<../../docs/exec-plans/003-repair-rollback-regression.md>)
- [src/server/queries.ts](<../../src/server/queries.ts>)
- [src/server/billing.ts](<../../src/server/billing.ts>)
- [src/domain/contracts.ts](<../../src/domain/contracts.ts>)
- [upskilling/repair-rollback/README.md](<../repair-rollback/README.md>)

## Concepts to revisit when stuck

- 10-query-plans-and-indexes.md (external apprenticeship curriculum, not in this repo)
- 04-characterization-tests.md (external apprenticeship curriculum, not in this repo)

The shared practice protocol (external cross-project route, not in this repo) explains evidence, Git hygiene, and when to use an agent. Keep answers closed until your own attempt is written. Your personal learning status starts **not assessed**.
