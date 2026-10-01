# A bounded application change

## Story: an auditable operations summary

Design a read-only summary that reports journal balance per authorized organization/journal and request counts/durations by bounded route/status dimensions. Treat the two projections as separate panels with separate evidence. Do not create a new financial posting path or change immutable migrations just to exercise aggregation.

Acceptance includes identical journal IDs in two organizations, two journals within one organization, large valid line amounts, zero-duration requests, an error response, and an empty observation window. Explain how authorization limits the underlying data before aggregation. A balanced total must not conceal an unbalanced individual journal.

For application integration, use only the repository's isolated test database and current fixture launcher. Keep integration and browser suites sequential when they share the test database. A SQL GROUP BY comparison should use representative fixtures and the database's real amount types; a query plan is separate performance evidence.

Deliver the projection contract, two negative fixtures, the actual authorized query or a precise pending proposal, and a verification note distinguishing arithmetic, query scope, and instrumentation. Preserve the existing repair rollback and workflow curricula.

## Delivery contract

Produce a one-page proposal, an acceptance table, a focused practice diff, and a verification note. If the relevant code already behaves correctly, deliver the missing regression or characterization evidence instead of rewriting it. If setup is blocked, deliver the proposed diff and precise reproduction plan with runtime status pending; do not mark the capstone implemented.

Before accepting an agent's patch, explain the smallest failing example yourself. Limit its allowed files, name an excluded adjacent feature, and ask it to list assumptions. Review the whole diff, including removed assertions and changed defaults. Your final explanation must distinguish the application's existing guarantees from the new teaching model's choices.

Completion requires a before/after example visible at the right boundary, one unrelated behavior preserved, and one limitation stated plainly. “All tests pass” is not sufficient if the relevant case was never in the suite. End with a 90-second explanation aimed at a teammate who did not see these exercises.
