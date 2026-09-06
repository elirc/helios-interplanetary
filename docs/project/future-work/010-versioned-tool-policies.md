# FW-010: Enforce versioned tool policies for each adviser role

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Engineering and agent execution              |
| Priority        | P2                                           |
| Size            | M — relative complexity, not a time estimate |
| Prerequisites   | [FW-007](007-durable-adviser-jobs.md)        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a reviewer, I want each adviser role's allowed tools and argument limits to be explicit and recorded with its run, so that I can explain why a tool was allowed and detect policy drift.

## Current baseline and evidence

TOOL_REGISTRY already validates names and arguments and the runtime uses fixed role-dependent read plans. There is no separately versioned role-policy snapshot with a central policy decision record for each requested call.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/agent-tools.ts](../../../src/server/agent-tools.ts)
- [src/server/intelligence.ts](../../../src/server/intelligence.ts)
- [src/domain/intelligence.ts](../../../src/domain/intelligence.ts)
- [src/server/evaluations.ts](../../../src/server/evaluations.ts)

## Proposed scope

Extend the existing registry with role policy and audit evidence. Keep tools read-only in this story; proposed domain changes continue through human approval.

## Acceptance criteria

- [ ] Diagnostic, summary, procurement and support roles each have an explicit allowlist, argument/result bounds and a policy version.
- [ ] Every requested tool call is authorized through one policy boundary before execution, even if a future planner asks for an unexpected tool.
- [ ] The trace records the policy decision and effective server-derived tenant scope without treating a model-supplied organization field as trusted.
- [ ] Unknown tools, extra arguments, policy-disallowed role calls and oversized outputs fail with stable reasons and no partial tool effect.
- [ ] An in-flight job retains its recorded policy version after deployment; replay does not silently adopt a broader allowlist.

## Suggested implementation sequence

1. Inventory the existing fixed plans and convert their actual capabilities into reviewed policy definitions.
2. Route tool execution through the policy evaluator and persist a compact decision beside each step.
3. Add policy fixtures and document the procedure for introducing a new version while old jobs exist.

## Verification and evidence to retain

- Exercise a role/tool permission matrix, malformed arguments and a forged tenant argument through the same boundary used by the worker.
- Change the current policy while a job is paused and verify that resumed execution follows the recorded version.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Review the smallest permissions each role needs and reject one plausible overbroad policy. Explain why prompting a model to behave is different from enforcing the tool boundary.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which current tools are justified for each role, and how long must older policy versions remain executable?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
