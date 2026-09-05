# Helios engineering academy

This folder is a separate learning track tied to the actual application. You asked to review it after the build, so start with [Learn by replaying the build](retrospective/README.md). That route connects the real run contracts, implementation decisions, tests, controlled failures and final system. Reading an explanation is preparation; completing an exercise is evidence.

Start the app using [the project README](../README.md). Keep a terminal, the code, and the Operations hub open together. Follow [the six demo scenarios](../docs/runbooks/demo-scenarios.md) before attempting a code change. The original M01 lessons below remain useful for understanding the first slice; their later-domain exercises now work as retrospective reconstruction.

## Suggested progression

The durations below are suggestions for your study sessions, not claims about agent runtime.

| Session           | Activity                                                                                                                  | Evidence you produce                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1 · 30–45 minutes | Run the coolant scenario and read [request to row](lessons/01-request-to-row.md).                                         | Your own request-path sketch and a prediction about duplicate delivery. |
| 2 · 45 minutes    | Read [engineering with an agent loop](lessons/02-agent-loops.md) and complete [the invariant lab](labs/01-invariants.md). | A test or query that can disprove a plausible incorrect implementation. |
| 3 · 45–60 minutes | Complete the task-specification exercise in [agent supervision](labs/02-agent-supervision.md).                            | A reconstructed M02 contract compared with implemented behavior.        |
| 4 · 30–45 minutes | Read [long runs and recovery](lessons/03-long-runs-and-recovery.md) and attempt its restart drill.                        | A checkpoint that a fresh agent can use without the old conversation.   |
| 5 · 45–60 minutes | Run one workflow comparison from the supervision lab.                                                                     | Baseline/candidate evidence and an honest conclusion.                   |
| 6 · 45–60 minutes | Predict reservation interleavings before opening the existing test.                                                       | A predicted interleaving, invariant, and database assertion.            |

## How to work with the agent

Use **BUILD** when you want implementation to proceed autonomously within a bounded contract. Use **LAB** when you want the agent to wait for your diagnosis or specification. Use **REVIEW** for evidence-based inspection. Use **EXPERIMENT** to compare one workflow change.

For a lab, send:

```text
Use LAB mode. Read upskilling/labs/01-invariants.md.
Give me the relevant repository context, then wait for my prediction before
running checks or revealing the answer key. Review my explanation against
observable behavior. Keep the main application working.
```

The reusable prompts in [HELIOS-RUN-PROMPTS.md](../HELIOS-RUN-PROMPTS.md) cover longer runs, recovery, stalled agents, review, delegation, and experiments.

## Contents

- [Retrospective: replay the complete build](retrospective/README.md)
- [Program invariant answer key](solutions/02-program-invariants.md)

- [Lesson 1: request to row](lessons/01-request-to-row.md)
- [Lesson 2: agent loops](lessons/02-agent-loops.md)
- [Lesson 3: long runs and recovery](lessons/03-long-runs-and-recovery.md)
- [Lab 1: prove the invariants](labs/01-invariants.md)
- [Lab 2: direct and evaluate the agent](labs/02-agent-supervision.md)
- [Answer key for Lab 1](solutions/01-invariants.md) — attempt the lab first.
- [Task contract template](templates/task-contract.md)
- [Checkpoint template](templates/checkpoint.md)
- [Workflow experiment template](templates/workflow-experiment.md)
- [Your progress tracker](progress.md)
- [Repository-specific glossary](glossary.md)
- [Real build case study: framework host normalization](case-studies/001-framework-host-normalization.md)

Keep your attempts in `upskilling/attempts/` when you make them; there is no need to create empty exercise files. Write in your own words. The agent should record learning as pending until you supply evidence.
