# 5. Review the final delivery

Treat the completed repository as another engineer's work. A useful review can agree with the implementation while still identifying limits.

## Audit one scenario end to end

Choose A, C, E or F from [the demo guide](../../docs/runbooks/demo-scenarios.md). Trace a UI action to schema validation, trusted identity, a domain transition, a database invariant, an audit record and an observable result. Name the exact test that covers the key failure case.

Then choose a claim that needs more evidence. Examples include production authentication, live-model quality, a learned embedding model, external cloud deployment, or load performance beyond the measured local workload. Do not label an openly documented boundary as a surprise defect, and do not treat a missing measurement as a passing result.

## Separate three review questions

1. **Does the behavior satisfy the contract?** Check the six demo outcomes and domain invariants.
2. **Does the evidence justify the completion claim?** Read actual command results and distinguish local configuration from remote execution.
3. **Did the workflow help you learn?** Only your own predictions, explanations and experiments can answer this one.

## Propose one improvement to the engineering loop

Choose a small change to task specifications, context selection, verification, review or checkpoints. Use [the experiment template](../templates/workflow-experiment.md). Compare against a fixed baseline on an equivalent task. Do not credit the candidate with a solution discovered during the baseline run unless both conditions receive it.

A shorter prompt is not automatically better. A longer-running agent is not automatically more autonomous. More agents are not automatically more effective. Judge accepted behavior, defects, recovery, supervision effort and measured resource use where available.

## Portfolio exercise

Write a 200-word case study about one actual engineering decision. State the simulation context, the problem, the invariant, the implementation and the check. Include one limitation. Use “the agent implemented” when that is what happened; use “I designed” or “I verified” only for work you actually performed.

You can credibly explain a sophisticated system without claiming that a fictional company had a real outage or that you wrote every line yourself. The goal is demonstrated judgment.
