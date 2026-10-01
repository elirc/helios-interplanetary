# 06. Helios / astra1: second practice block

The original Helios pack covered stable query pages. This block adds two different read-and-reason tasks from the current system: balanced journal data and bounded metric summaries, with explicit limits on what pure calculations prove.

This expansion follows the [original reinforcement pack](../README.md). Keep both: the first pack establishes a small mental model; this block asks you to combine boundaries, reject plausible mistakes, and explain evidence. All new contracts below are teaching contracts unless a paragraph explicitly describes inspected application source. They are not pre-approved production changes.

## Route through the new material

| Session | Work | Result |
|---|---|---|
| 1 · 60 min | [Boundary lessons](01-boundaries.md) | Annotated source trace and three predictions |
| 2 · 75–90 min | [Lab A](labs/a/README.md) | Own solution, edge test, caught mistake |
| 3 · 75–90 min | [Lab B](labs/b/README.md) | Second solution and comparison with A |
| 4 · 60 min | [Types and contracts](02-types-and-contracts.md) | Type sketch, runtime rules, compatibility examples |
| 5 · 75 min | [Testing and debugging](03-testing-and-debugging.md) | Hypotheses, minimal reproducer, evidence limits |
| 6–7 · 2–4 h | [Change capstone](04-capstone.md) | A reviewable practice change or explicit blocked plan |
| 8 · 60 min | [Workbook](WORKBOOK.md) | Six transfer answers and a short oral defense |

The estimate is 9–12 additional hours per project, excluding dependency setup and repeated attempts. Work on one project at a time. Reading a reference answer counts as study, not independent completion.

## Sources to inspect

- [docs/project/current-state.md](<../../../docs/project/current-state.md>)
- [docs/exec-plans/003-repair-rollback-regression.md](<../../../docs/exec-plans/003-repair-rollback-regression.md>)
- [src/server/queries.ts](<../../../src/server/queries.ts>)
- [src/server/billing.ts](<../../../src/server/billing.ts>)
- [src/domain/contracts.ts](<../../../src/domain/contracts.ts>)
- [upskilling/repair-rollback/README.md](<../../repair-rollback/README.md>)
- [src/server/ledger.ts](<../../../src/server/ledger.ts>)
- [src/server/observability.ts](<../../../src/server/observability.ts>)
- [src/server/http.ts](<../../../src/server/http.ts>)

Use current symbols, not old line numbers. Record the commit and any relevant uncommitted source before application work. A new worktree from HEAD does not contain those uncommitted changes. The [shared expansion route](<../../../../opusorganize/junior-reinforcement/expansion-02/README.md>) connects all ten projects.

## Two separate levels of proof

The Node labs need no packages or services. Their passing tests establish only the small contract written beside them. Application tests, browser observations, PostgreSQL checks, or a live service drill must be recorded separately. The original application's build was not rerun merely because a teaching model passed. Your learning status begins **not assessed**.
