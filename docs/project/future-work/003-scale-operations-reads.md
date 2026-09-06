# FW-003: Make operations reads accurate and bounded as history grows

[Back to the review backlog](README.md)

| Field           | Proposed value                                |
| --------------- | --------------------------------------------- |
| Status          | Proposed — awaiting review                    |
| Theme           | Reliability and operator workflows            |
| Priority        | P1                                            |
| Size            | L — relative complexity, not a time estimate  |
| Prerequisites   | [FW-001](001-diagnose-connection-timeouts.md) |
| Owner           | Unassigned                                    |
| Review decision | Pending                                       |

## User story

As an operator with a large incident history, I want accurate totals and navigable records without repeatedly loading every module, so that the hub stays useful beyond its small fixture world.

## Current baseline and evidence

getHubSnapshot assembles many sequential queries, returns recent bounded collections, and the client polls the broad snapshot. Some overview counts derive from those collections. The fixture-scale browser checks do not establish performance or count accuracy over large histories.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/hub.ts](../../../src/server/hub.ts)
- [src/domain/hub.ts](../../../src/domain/hub.ts)
- [src/app/api/operations/route.ts](../../../src/app/api/operations/route.ts)
- [src/components/operations-hub.tsx](../../../src/components/operations-hub.tsx)

## Proposed scope

Separate summary totals from paged detail and reduce unnecessary reads for the selected view. Keep trusted tenant scope and an explicit consistency contract across requests.

## Acceptance criteria

- [ ] Overview totals come from scoped aggregate counts and remain correct when more than 40 historical records exist.
- [ ] At least incidents, work orders and audit history support bounded cursor pagination with stable ordering, a tie-breaker and defined behavior when new rows arrive.
- [ ] A selected view fetches only its required detail; moving to another view clearly handles loading, failure and stale cached data.
- [ ] Tenant and role checks apply to every new read route and cursor. A cursor from another organization cannot reveal rows or existence information.
- [ ] A fixed large fixture and read budget are agreed during review, then measured against FW-001's baseline. Results include payload bytes, query count, latency and errors, not just a faster screenshot.

## Suggested implementation sequence

1. Document which fields require one consistent snapshot and which panels can display independently fetched state.
2. Introduce typed summary and detail contracts, scoped cursors and aggregate queries before changing client polling.
3. Adapt one view first, verify its behavior under new writes, then migrate the remaining history views.

## Verification and evidence to retain

- Seed enough records to exceed every previous display limit and assert both totals and complete page traversal, including equal timestamps.
- Exercise tenant-forged cursors and browser navigation during a delayed/failed detail fetch; compare the same measured read workload before and after.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Sketch a counterexample where a recent-record list gives a misleading total. Explain the consistency tradeoff introduced by splitting one snapshot into several requests.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which panels need transactional consistency, and what fixture size and read budget should define this story's acceptance?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
