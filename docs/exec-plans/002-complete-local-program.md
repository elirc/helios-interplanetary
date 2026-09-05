# Run 002: complete the Helios local program

Mode: BUILD. User authorization: build all milestones; learning review happens afterward. Continue in dependency order without teaching checkpoints or requests to continue. Preserve the completed M01 application and both prompt documents.

## Contract

Outcome: all six original demonstration scenarios have executable, persistent workflows in a cohesive local Helios application. The separate upskilling track becomes a retrospective of the actual build, with reproducible exercises, evidence, and Git checkpoints.

Starting state: M01 completed on local `main`, PostgreSQL 17 on loopback 5438, development `helios`, isolated `helios_test`, Next.js preview on 3000. Baseline validation: 8 unit, 13 integration, 3 browser workflows; lint/types/build/API/restart passed. No user exercise assessed. Baseline is preserved in a local Git commit before further implementation.

Run limits: all local milestones below; no requested time/token budget. No subagents selected. Local code, fixtures, builds, containers, and verification are authorized. External publication, paid infrastructure, and real-world purchases are outside the local execution contract; prepare deployable artifacts before requesting any necessary final approval. Do not fabricate live model evaluation or cloud execution.

## Milestones and acceptance

| Milestone                                 | Observable acceptance                                                                                                                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M02 Maintenance                           | Acknowledged incident creates one attributable work order; invalid transitions and cross-tenant access fail.                                                                                              |
| M03 Inventory                             | Reservations preserve nonnegative available stock under concurrent requests; cancellation releases stock, repair consumes it exactly once.                                                                |
| M04 Procurement                           | Shortage creates one purchase request; approval reserves budget; rejection/cancellation release commitments; receipt is idempotent.                                                                       |
| M05 Logistics                             | Approved procurement reserves Earth stock and a vessel/docking window; delay misses its slot and affects repair; rerouting and delivery supply the destination.                                           |
| M06 Workforce and recovery                | Valid, available certified crew perform required repair tasks; verification requires newer nominal telemetry; completion closes the incident and records a postmortem.                                    |
| M07 Simulation and energy                 | Persisted virtual clock supports pause/resume/speed/advance; seeded solar crisis drains battery, projects reserve, sheds noncritical load, and affects a project until repair.                            |
| M08 Durable workflows                     | Transactional events feed leased jobs with bounded retries, dead-letter state, idempotent consumers, visible history, and restart recovery.                                                               |
| M09 Intelligence                          | Diagnostic, summary, procurement, and support runs persist tool traces and validated results; proposed writes require a human decision and authorization is server enforced. Provider fixture is labeled. |
| M10 Knowledge and evaluations             | Versioned tenant-scoped documents are chunked and retrieved with citations; persisted evaluations check retrieval, unsafe recommendations, and malformed outputs with explicit sample counts.             |
| M11 Billing and ledger                    | Integer-money invoices, simulated ambiguous payment, signed duplicate-safe webhook, reconciliation, and balanced journal entries demonstrate payment uncertainty without double charging.                 |
| M12 Support and security                  | Failed payment opens a support case; suspicious access scenario creates attributable investigation and notifications; operators can resolve it through audited actions.                                   |
| M13 Reliability and engineering exercises | Queue backlog, duplicate delivery, worker lease expiry, poison event, out-of-order telemetry, and reservation contention have reproducible checks; metrics and evidence show actual results.              |
| M14 Deployment package                    | Container and configuration/runbooks support reproducible local deployment; readiness and backup/restore procedures are validated where executable. Cloud execution remains separately reported.          |
| M15 Integration and retrospective         | Purpose-specific views, six guided demos, final end-to-end validation, architecture/runbooks, and retrospective learning index match the final implementation.                                            |

The original domain catalog guides these workflows; this program does not claim every speculative catalog noun is a complete enterprise product. The revised prompt explicitly favors meaningful workflows over disconnected CRUD.

## Verification strategy

Preserve existing tests. Add real PostgreSQL tests for state transitions, cross-tenant reads/writes, competing reservations, approvals, delivery replay, billing ambiguity, transaction rollback, and consumer recovery. Add browser workflows for visible operations and error states. Use unit tests for pure clock/energy/ledger/AI validation behavior. Run required lint, types, build, integration, HTTP and relevant browser checks at checkpoints. Integration and browser suites reset the same isolated database and must run sequentially.

Capture local Git commits after verified work units. Record failures when observed, the evidence that changed the implementation, and limitations; do not manufacture before/after anecdotes. Teaching content is generated after behavior is real and never requires the user to respond during BUILD.

## Progress and next action

- [x] Inspect original scope and current repository.
- [x] M02–M06: complete the repair supply chain.
- [x] M07–M10: simulation, durable workflows, intelligence and knowledge.
- [x] M11–M14: finance, security, reliability and deployment.
- [x] M15: final verification and retrospective.

The local program is complete. The checkpoints below preserve the order in which implementation and verification became established. The user can review the completed learning track later without reconstructing the chat.

## Checkpoint 2 — integrated correctness

All local domain modules and their purpose-specific views are implemented. Migrations 004–006 add knowledge, adviser traces and decisions, finance and investigations, request spans and run recovery. The first combined validation passed lint, TypeScript, 11 unit tests and all 35 PostgreSQL integration tests. The integration run took 918 seconds on this shared Windows host; this is test-suite duration, not application latency. Its actual child-process crash probe exited after claiming an event, and a new process recovered delivery. Deadline escalation and abandoned-run recovery passed too.

The four intelligence and four billing tests also passed in an earlier focused run. The evaluation fixture produced 14/14 passing cases: six retrieval cases (including two held-out fixtures) and eight policy checks. These are local fixture measurements, not live-model quality scores. An initial finance/support implementation error omitted the database pool argument; focused validation exposed it and the corrected run passed.

The first backup rehearsal restored 2 organizations and 72 readings into an independently created disposable database with matching counts. It contained no invoices or journal entries, so it does not yet demonstrate restoration of populated finance data. Production build, browser workflows, HTTP checks, container startup and the final retrospective are still pending at this checkpoint.

## Checkpoint 3 — review before browser integration

The combined check completed successfully, including the production build. Review then found that an already approved proposal was checked for expiration before its terminal status was recognized. The order is corrected. Pending approvals also recheck the asset under a transaction lock, so nominal recovery invalidates an older maintenance proposal. Five intelligence tests passed after this change, including the new expiry/stale-state regression; the complete integration inventory now has 36 cases. These were review findings supported by new assertions, not a previously observed customer incident.

Adviser execution now checks persisted run status between steps, preserves a cancelled/recovered terminal status, and distinguishes provider/tool failure from policy blocking. A cancellation does not retract an already submitted provider request; it prevents later steps and domain proposals. Platform commands return domain errors for invalid event replay or a missing notification.

All 96 local Markdown links across 34 documentation files resolved. The showcase command was added to create meaningful review data through real domain services, with an explicit guard restricting reset to the local disposable `helios` database. Its execution, browser tests and container verification are pending at this checkpoint.

## Final verification and handoff

All eight browser workflows passed in 7.9 minutes against the built container image. They cover the original incident lifecycle, mobile/read-only access, connection recovery, complete coolant repair through AI approval and delayed cargo, solar crisis, ambiguous payment and security investigation, unsafe adviser/retrieval/evaluations, and duplicate delivery. Desktop operations, repair, adviser and mobile screenshots were visually inspected. The test server used loopback 3013 because 3001 belonged to an unrelated project; that project was left running. `HELIOS_E2E_PORT` now makes this choice reproducible.

Both HTTP smoke programs passed against port 3002. After their controlled mutations, the showcase was recreated: completed repair and restored solar history, an uncertain payment, an open simulated security investigation, three adviser traces and 39 delivered notifications. A subsequent live-worker probe adds one adviser summary and verifies its event reaches one notification through the independent container worker.

The populated backup restored into a new disposable database with matching counts: 2 organizations, 98 readings, 1 work order, 1 invoice, 2 journal entries and 39 outbox records. Restored journals had no imbalance. The probe database was removed by the same invocation. Container replacement separately preserved the 98 readings, work order, invoice and two journals; both clocks stayed paused. The final app and worker are running at `http://127.0.0.1:3002`. The old host preview was stopped.

The final image rebuild includes the corrected showcase script. Its application source is the same source exercised by the eight browser workflows. Docker build inputs now separate application compilation from runtime scripts and migrations; documentation edits no longer invalidate the app compilation layer. Host lint and TypeScript passed after the approval changes, and both container builds passed production compilation and TypeScript. No remote CI run or cloud deployment is claimed.

Request-span export is real: the final preview check observed 60 tenant-scoped samples, a fresh worker heartbeat, a nonzero trace ID and Prometheus output. One historical HTTP 500 is deliberately retained. A 30-request sample at concurrency 3 during the image rebuild had 1 error, p50 661.3 ms and p95 3771 ms; its server duration of 5009 ms is consistent with the configured five-second pool connection deadline, but the logs do not establish a definitive cause. After the build finished, a repeat had 0 errors, p50 649.6 ms and p95 1262.1 ms. These small local samples establish neither a production SLO nor a causal performance improvement. Investigate connection behavior under resource contention before making a production capacity claim.

Evidence in ignored `artifacts/`: `program-check.log`, `final-intelligence.log`, `final-lint.log`, `final-types.log`, `program-browser.log`, `browser-report/`, `screenshots/`, `program-api.log`, `showcase-final.log`, `backup-rehearsal.json`, `container-final-build.log`, `container-final-start.log`, `preview-verification.json`, `live-worker-verification.json`, `metrics.prom`, `benchmark-under-build.json` and `benchmark.json`. Tests and runbooks provide the reproduction path if these local artifacts are absent.

The separate upskilling folder now includes a six-chapter retrospective, reproducible labs, answer keys, supervision and checkpoint templates, a worked process case study and an unassessed progress tracker. It distinguishes observed implementation failures, review findings, designed tests and fictional scenarios. No delegation, coding-agent token/cost measurement, live-model quality score or human mastery is claimed. The final local Git checkpoint is tagged `helios-local-m15`.

Final handoff checks passed: Prettier formatting, 98 local links across 35 Markdown files, and SHA-256 comparison of 91 deployed source/script/migration files with the workspace. `handoff-verification.json` records those checks. The live worker consumed the adviser-summary event into exactly one notification. No implementation or verification step remains pending within this local contract.

## Checkpoint 1 — domain behavior established

Baseline commit: `8a0e1e7`. Additive migrations 002 and 003 are applied to local development and test databases. Six new repair integration tests passed (129 seconds): unique work order creation, role/tenant boundaries, competing last-item reservations, competing budget approvals, delayed/rerouted duplicate-safe receipt, and crew/checklist/fresh-telemetry completion. Six platform integration tests passed (32 seconds): solar cascade, transactional outbox rollback, duplicate receipts, lease fencing/recovery, poison-event dead-letter/redrive, and nonregressing workflow projection.

The operations hub now contains repair, supply, logistics, workforce, energy and platform views. Browser integration remains pending. Lint exposed an initial effect invocation and render-time `Date.now`; the initial fetch is now cancellably scheduled and the worker indicator uses the snapshot timestamp. Final lint is still pending.

Intelligence/knowledge schema and runtime are implemented but unverified. Knowledge uses a named token-hash vector baseline plus PostgreSQL full-text ranking; it is not a learned semantic embedding model. The optional OpenAI Responses adapter was checked against official structured-output documentation; no live call was made. Next: finish evaluations, finance/security, integrate remaining views, then validate the complete program and write the retrospective from actual evidence.
