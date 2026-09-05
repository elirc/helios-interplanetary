# 6. Supervise a long run without micromanaging it

Use this lesson after the demos and the first five retrospective chapters. The question is how to keep an engineering agent useful across many edits, slow tools and interruptions while keeping its completion claims reviewable.

## What actually happened here

The broad request became a finite local contract with M02–M15 and six demonstrations. Related domain services were implemented together, then exercised against PostgreSQL before browser integration. The M01 baseline stayed available in Git. The user deferred teaching review, so the agent continued implementation and recorded learning as pending.

Verification had several distinct outcomes. The initial combined suite passed 35 integration tests in 918 seconds. Review then added an approval regression, and five focused intelligence tests passed. A cold container build spent 379.8 seconds installing dependencies, 207.2 seconds building the app and 456.3 seconds exporting/unpacking its image. These are observed tool-stage durations on this machine. They are not a production latency claim, a coding-agent token measurement, or comparable benchmarks of competing workflows.

Browser startup found another project's server on port 3001. The correct response was to identify its owner and make the test port configurable. Reusing an unknown server would have invalidated the evidence; terminating it would have affected unrelated work. The Helios test server moved to port 3013.

The new showcase script also needed its own review: its final query initially named a nonexistent ledger table. That was corrected before executing the script. Passing domain tests did not prove that a newly assembled operational script was correct. The subsequent showcase run exercised the real services and produced a completed repair, journal records and adviser traces.

## Decide from evidence

| Observation                                  | Useful next action                                                                       | Evidence to preserve                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A long command is still producing progress   | Continue independent, nonconflicting work; keep its result pending.                      | Command, environment, running process/session and latest stage.    |
| A tool fails during environment setup        | Inspect ownership and prerequisites before changing application code.                    | Failure text and the concrete environmental cause.                 |
| A business invariant fails                   | Reproduce the smallest meaningful case, correct the boundary, rerun the relevant check.  | Counterexample, changed rule and final result.                     |
| The agent loses conversational context       | Reconcile the checkpoint with Git, running processes and persisted state.                | What is implemented, verified, still running and next.             |
| Source changes after an image was built      | Identify which artifact is stale and rebuild or replace it before claiming final parity. | Source revision, image identity and checks run against that image. |
| The scope is complete but a check is pending | Continue verification or report a specific external blocker.                             | An explicit pending result, not an invented pass.                  |

Silence from a tool is a reason to inspect its state, not proof that it is stuck. More parallel work can also contend for the same machine or database. In this repository, integration and browser suites must run sequentially because they reset the same test database.

## A reusable long-run prompt

```text
Use BUILD mode. Read AGENTS.md, current-state.md and the active execution plan.
Finish the named local outcomes and their acceptance checks. Keep teaching review
deferred. Preserve unrelated work and do not infer authorization for publication.

At each decision:
1. State the current observable outcome and evidence gap.
2. Choose a bounded next action that closes that gap.
3. Implement or investigate it using the relevant source and contracts.
4. Run the check that could disprove the result.
5. Record a checkpoint before changing workstreams or ending the run.

Separate implementation, verification and human learning status. Distinguish
review findings, actual failed checks and deliberately simulated scenarios.
After interruption, inspect the repository and active processes before resuming.
Do not repeat broad checks without a changed input or unresolved concern.
Finish with the running artifact, exact evidence, limitations and recovery path.
```

Adapt the paths and outcomes before using this elsewhere. A prompt cannot grant capabilities the environment lacks, create durable background execution on its own, or replace test evidence.

## Your experiment

Choose one improvement: a smaller task contract, an earlier domain check, a better checkpoint, or deliberate reuse of a built artifact. Use an equivalent task in two isolated checkouts. Record accepted behavior, failed checks, supervision interventions and actual elapsed time. Record token/cost data only if your tooling supplies it.

Write a conclusion that includes uncertainty. One successful task does not establish that the workflow is universally better. Your learning evidence is the explanation of why you selected the next action and what would have changed your mind.
