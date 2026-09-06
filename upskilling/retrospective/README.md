# Learn by replaying the build

This track is meant to be read **after the application is built**. You do not need to reconstruct the original chat. The run contracts, source files, tests and recorded verification form the learning material.

Start with [the six demonstrations](../../docs/runbooks/demo-scenarios.md). Then follow the route below. Pause before each answer key and write a prediction in `upskilling/attempts/`. Implementation progress is not evidence that you personally understand the system.

| Stage       | Read                                                                 | What you produce                                                   |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Scope       | [From a master prompt to executable work](01-scope-and-contracts.md) | Your own bounded contract and a scope decision.                    |
| Correctness | [Transactions and concurrency](02-domain-feedback-loops.md)          | A counterexample and the database assertion that catches it.       |
| Long runs   | [Durability and interruption](03-durability-and-recovery.md)         | A recovery checkpoint and a prediction about partial completion.   |
| Agents      | [Tools, approvals and evaluations](04-agents-and-evidence.md)        | An approval threat model and a defensible evaluation claim.        |
| Review      | [Inspect the final delivery](05-review-the-build.md)                 | An evidence-based review with limitations and one next experiment. |

## Evidence has different meanings

The Next.js host-normalization bug and lint/type errors were **observed during implementation**. Their reports can support claims about this build process. The database concurrency checks are **designed tests** of specific interleavings. The child-process lease test deliberately exits after claim; it establishes recovery under that controlled failure. Cargo delays, unsafe model output and payment timeouts are **simulated product scenarios**. None is an incident at a real space company or payment provider.

The code agent worked sequentially; no delegation exercise was selected. Do not attribute this result to parallel agents. No API token/cost measurement was available for the coding run. Fixture adviser runs have no real model token usage and display it as unavailable. No live-model quality score or human-learning score is claimed.

## Recover the actual history

The M01 baseline is local commit `8a0e1e7`. Inspect it without changing the current application:

```sh
git show --stat 8a0e1e7
git show 8a0e1e7:src/server/telemetry.ts
git log --oneline --decorate
git diff 8a0e1e7..HEAD -- src/server db/migrations tests
```

Use [Run 001](../../docs/exec-plans/001-telemetry-incident.md) and [Run 002](../../docs/exec-plans/002-complete-local-program.md) for acceptance criteria, findings and verification. A checkpoint is a claim to reconcile with source and outputs. Local ignored artifacts may be absent from a fresh clone; the repository tests are the reproduction path.

One commit need not equal one milestone. Read the actual Git history rather than inventing a cleaner sequence after the fact. The second run implemented related domain services in groups, verified them with targeted database suites, then integrated their interfaces and system checks.

Use LAB mode when you are ready to practice. The completed app should stay functional while you work.

For the next increment, review [25 proposed future-work stories](../../docs/project/future-work/README.md) and complete [the backlog-review lab](../labs/03-review-future-work.md). Start from a limitation or unanswered question in this build, choose a bounded story and predict its failure modes before implementation. The backlog preserves the distinction between delivered features and proposed extensions.

Then read [Supervise a long run](06-supervising-long-runs.md) for a reusable execution prompt and an experiment based on the actual build's tool delays, environment conflict and verification sequence.
