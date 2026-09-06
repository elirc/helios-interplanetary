# FW-005: Make auditor inspection and keyboard navigation complete

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Reliability and operator workflows           |
| Priority        | P1                                           |
| Size            | M — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a read-only auditor or keyboard user, I want to search evidence and navigate records without gaining write access, so that inspection does not depend on operator privileges or a mouse.

## Current baseline and evidence

The current browser suite proves selected read-only controls are disabled and that the mobile page does not overflow. The hub's broad disabled fieldset can also disable inspection controls such as search or run selection; complete keyboard and focus behavior has not been assessed.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/components/operations-hub.tsx](../../../src/components/operations-hub.tsx)
- [src/components/intelligence-views.tsx](../../../src/components/intelligence-views.tsx)
- [src/components/hub-shared.tsx](../../../src/components/hub-shared.tsx)
- [src/components/operations-hub.css](../../../src/components/operations-hub.css)
- [tests/e2e/operations.spec.ts](../../../tests/e2e/operations.spec.ts)

## Proposed scope

Separate inspection controls from mutations, clarify status messages, and verify keyboard/focus behavior in the existing views.

## Acceptance criteria

- [ ] An auditor can search approved procedures, inspect citation evidence, select prior adviser runs, expand histories and navigate pages while all mutation routes continue to return denial.
- [ ] Keyboard focus follows visible navigation order, remains visible, and moves predictably after panel changes, errors and successful actions.
- [ ] Dialogs or expanded detail views have clear accessible names and an intentional close/return-focus behavior wherever those patterns are used.
- [ ] Status messages describe the completed action once in plain language; uncertainty and validation failures remain distinguishable from success.
- [ ] The tested narrow viewport has usable navigation and no unintended document overflow, and information is not conveyed by badge color alone.

## Suggested implementation sequence

1. Inventory controls by read versus write capability and narrow disabled regions without replacing server authorization.
2. Review focus, labels, live regions and feedback text across repair, knowledge and adviser views.
3. Add behavior-focused browser coverage for an auditor and keyboard navigation, supplemented by manual visual inspection.

## Verification and evidence to retain

- Complete an auditor procedure search and run-history inspection using only the keyboard, then attempt direct write requests and verify server denial.
- Check focus after loading failures and panel changes at desktop and narrow widths; record any remaining accessibility limitations rather than claiming universal conformance.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

List the difference between a disabled UI control and an authorization boundary. Produce a short accessibility review with observed behavior and reproducible steps.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which auditor inspection journey should be the acceptance walkthrough, and which focus behavior would make the interface predictable?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
