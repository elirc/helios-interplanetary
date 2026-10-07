# 06. Helios / astra1: interview preparation

Helios is a local operations simulation with durable workflows and PostgreSQL. Explain one verified repair transition and its rollback boundary. Keep historical verification, fixture behavior, and your own contributions separate from production claims.

This is an additive third block. Keep the [original foundations](../README.md) and [second practice block](../expansion-02/README.md). This block focuses on explaining, implementing, testing, and defending decisions under interview conditions. The scenarios are synthetic practice cases anchored to the source map, not claims of newly discovered application bugs.

## Start with one interview round

| Round | Practice | Timebox |
|---|---|---|
| 1 | [JavaScript reasoning and live coding](rounds/01-javascript.md) | 30 min per case |
| 2 | [React component and interaction interview](rounds/02-react.md) | 35 min per case |
| 3 | [TypeScript, schemas, and public contracts](rounds/03-typescript.md) | 25 min per case |
| 4 | [Asynchronous JavaScript and API boundaries](rounds/04-async-api.md) | 30 min per case |
| 5 | [Debugging and test-design interview](rounds/05-debugging.md) | 35 min per case |
| 6 | [Junior system-design and data-model interview](rounds/06-design.md) | 40 min per case |
| 7 | [Code-review and take-home defense](rounds/07-review.md) | 30 min per case |
| 8 | [Project explanation and behavioral interview](rounds/08-behavioral.md) | 25 min per case |

Each round has six project scenarios. That makes **48 scenario/round combinations**, not 48 unrelated production incidents. Revisit the same situation from different engineering roles: an algorithm can be correct while its UI ownership, API scope, or verification claim is wrong. Interviewer guidance is kept in a separate folder; close it until after your attempt.

Use the [coding challenge](coding/README.md), [study plan](STUDY-PLAN.md), [project defense](PROJECT-DEFENSE.md), and [scorecard](SCORECARD.md). The three complete mocks are [frontend](mocks/frontend.md), [full stack](mocks/full-stack.md), and [project defense](mocks/project-defense.md). The all-project interview route (external cross-project route, not in this repo) explains how to choose projects without trying to finish everything in one sitting.

## Six scenarios

1. **The last transaction step fails:** A repair performs several writes and fails while inserting the postmortem. The repository already has a focused rollback regression; this is an explanation exercise, not a claim of a newly discovered defect.
2. **A successful command is replayed:** The client loses a response and repeats the same command. The operation has already committed once.
3. **Two balanced groups cancel a mistake globally:** A synthetic report adds all journal lines across organizations. One group has a debit surplus and another a credit surplus; the overall sum looks balanced.
4. **Actual usage exceeds a reservation:** A simulated operation reserves thirty units but later reports forty-five actual units. Hiding the difference would make the usage ledger misleading.
5. **Telemetry is fresh but the incident is not resolved:** A recent request metric exists while the operational workflow is still pending. The interviewer asks what this observation proves.
6. **A proposed feature is described as completed:** A project has a future-work backlog and a completed local checkpoint. An interview answer accidentally merges them into a claim that every proposed capability was shipped.

## Actual source to inspect

- [docs/project/current-state.md](<../../../docs/project/current-state.md>)
- [docs/exec-plans/003-repair-rollback-regression.md](<../../../docs/exec-plans/003-repair-rollback-regression.md>)
- [src/server/queries.ts](<../../../src/server/queries.ts>)
- [src/server/billing.ts](<../../../src/server/billing.ts>)
- [src/domain/contracts.ts](<../../../src/domain/contracts.ts>)
- [upskilling/repair-rollback/README.md](<../../repair-rollback/README.md>)

Read current symbols and callers before attributing a guarantee to the application. A lab fixture may introduce an explicit version, policy, or field that the app does not have. The local Node challenge verifies its written teaching contract only. React sketches, TypeScript/JSDoc sketches, database plans, and browser claims require their own checks.

The intended audience is a junior software engineer practicing fundamentals and project explanations. Scoring is educational and is not an employer's hiring rubric or a guarantee of interview outcomes. Personal mastery starts **not assessed**.
