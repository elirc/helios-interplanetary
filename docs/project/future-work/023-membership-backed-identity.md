# FW-023: Replace fixture personas with membership-backed identity

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Finance, workflow compatibility and delivery |
| Priority        | P2                                           |
| Size            | L — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As an organization administrator, I want access to follow verified membership so that users cannot choose their own tenant or role outside the local fixture demonstration.

## Current baseline and evidence

The local app uses signed fixture personas with server-derived identity and loopback-origin checks. This is a deliberate demo boundary, not a production membership system. Existing operator/auditor and tenant checks provide behaviors the new identity source must preserve.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/identity.ts](../../../src/server/identity.ts)
- [src/app/api/session/route.ts](../../../src/app/api/session/route.ts)
- [src/server/http.ts](../../../src/server/http.ts)
- [tests/unit/identity.test.ts](../../../tests/unit/identity.test.ts)
- [tests/integration/mission.test.ts](../../../tests/integration/mission.test.ts)

## Proposed scope

Create a membership-backed identity adapter and exercise it with a local test issuer before connecting a selected external identity provider. Keep the existing operator/auditor capabilities. Provider selection, deployment environment and session policy must be recorded in the implementation contract before an external rollout.

## Acceptance criteria

- [ ] A verified issuer/subject maps to a server-owned user and active organization membership; client-supplied organization IDs or role claims cannot grant membership.
- [ ] A user with multiple memberships explicitly selects an active organization, and every request re-establishes authorized scope without leaking prior-organization UI or pending command state.
- [ ] Membership revocation and role reduction take effect within a declared and tested interval; stale sessions cannot retain mutation privileges beyond it.
- [ ] Session establishment, expiry, sign-out and forged/invalid issuer responses fail predictably; mutation origin/session protections remain enforced outside the fixture login flow.
- [ ] Automated local-issuer tests cover nonmembers, revoked users, operator/auditor differences, tenant switching and recovery from unavailable identity services; any real-provider verification is separately recorded.

## Suggested implementation sequence

1. Write the identity trust boundary and session/revocation contract, then add membership storage with additive migrations.
2. Introduce an issuer adapter and local deterministic issuer fixtures; keep authorization in existing server domain boundaries.
3. Wire sign-in, organization selection and sign-out, and connect the selected provider only after local behavior passes.

## Verification and evidence to retain

- Attempt forged roles/tenants, invalid issuer responses and a write immediately after revocation; assert server decisions and audit identity.
- Run browser flows for two memberships and role downgrade with outstanding requests; verify no cross-organization replay or cached data exposure.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Draw the chain from issuer subject to database membership to domain principal. Identify which facts are authenticated, which are authorized and which come from untrusted browser input.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Which identity provider and environment should this target, and what revocation delay is acceptable for the intended use?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
