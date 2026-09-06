# FW-017: Manage multiple station assets with explicit operating profiles

[Back to the review backlog](README.md)

| Field           | Proposed value                               |
| --------------- | -------------------------------------------- |
| Status          | Proposed — awaiting review                   |
| Theme           | Knowledge and domain operations              |
| Priority        | P2                                           |
| Size            | L — relative complexity, not a time estimate |
| Prerequisites   | None beyond the completed local build        |
| Owner           | Unassigned                                   |
| Review decision | Pending                                      |

## User story

As a station operator, I want to register and select multiple maintained assets so that the demonstration can represent more than one fixture pump per organization.

## Current baseline and evidence

The fixtures provide one station and coolant pump per organization. Tenant-aware telemetry, incident and maintenance tables already use asset IDs, while several scenario and workflow assumptions are tailored to the coolant example.

Inspect these starting points against the [delivered checkpoint](../current-state.md) before implementation:

- [src/server/fixtures.ts](../../../src/server/fixtures.ts)
- [src/server/telemetry.ts](../../../src/server/telemetry.ts)
- [src/server/maintenance.ts](../../../src/server/maintenance.ts)
- [src/server/queries.ts](../../../src/server/queries.ts)
- [src/domain/telemetry-rules.ts](../../../src/domain/telemetry-rules.ts)
- [src/components/mission-control.tsx](../../../src/components/mission-control.tsx)

## Proposed scope

Add authorized station/asset registration and selection for the existing coolant asset type, with a versioned operating profile. Keep new asset types and arbitrary workflow builders outside this first increment. Audit registration, profile changes and retirement.

## Acceptance criteria

- [ ] An operator can register a station and coolant asset with a tenant-unique reference and validated operating profile; an auditor can inspect but cannot mutate them.
- [ ] Telemetry, incident views, work-order creation and scenarios act on the selected asset, with no implicit fallback to the fixture pump.
- [ ] Operating-profile changes have an effective simulation time and version; historical readings and incident decisions remain interpretable using the profile that applied.
- [ ] Two assets can degrade independently without merging incidents or work orders, while per-asset active-incident and per-incident work-order protections remain intact.
- [ ] Retirement prevents new operational work under a reviewed rule for open incidents, reservations and repairs; history remains accessible and cross-tenant station references are rejected.

## Suggested implementation sequence

1. Inventory hard-coded fixture selections and separate coolant-type defaults from tenant asset identity.
2. Add additive schema, authorized registration/profile commands and explicit selectors.
3. Extend one complete coolant workflow to two assets and document retirement transitions.

## Verification and evidence to retain

- Run degradation and repair independently for two assets; assert correct station inventory, incident ownership and immutable historical profile references.
- Test duplicate references, invalid thresholds, profile changes at time boundaries, retirement during open work and foreign-tenant IDs.

Attach the actual revision, commands, observed outcomes and remaining limitations to the execution record. The backlog's [completion rules](README.md#completion-rules-for-a-selected-story) apply when this story is selected.

## Learning exercise

Trace where an asset ID originates and every place a fixture assumption replaces it. Predict which existing demo would break first with a second station.

Save the prediction before implementation and compare it with actual evidence afterward. Personal learning remains pending until you supply that comparison.

## Review decision to resolve

Should the first increment support multiple stations immediately, and which coolant thresholds belong in the editable profile?

Record accept, revise, defer or reject; if accepted, name an owner, settle the open decision and link a bounded execution contract. This proposal does not start implementation.
