# 4. Tools, approvals and evaluation claims

The code-writing agent and the product adviser are separate systems. The code agent built the repository. The adviser runs inside Helios with a narrow set of read tools and a structured output contract.

## Inspect the actual boundary

Read [the tool registry](../../src/server/agent-tools.ts), [the runtime](../../src/server/intelligence.ts), and [recommendation validation](../../src/domain/intelligence.ts). The server derives the organization from the signed session. Tool arguments do not accept a trusted organization supplied by the browser or model. SQL and physical controls are absent from the tool registry.

The current adviser executes a fixed bounded tool plan; it is not an unrestricted planner. Its model output may propose a work order or purchase request. The approval record binds the action and target, and the human decision reruns the actual domain transition. Saying “ask for approval” in a prompt would not provide that protection by itself.

## Predict an unsafe proposal

Run the unsafe proposal in AI Operations. Before expanding the trace, write down:

- Whether a work order or physical command should exist afterward.
- Which layer should reject the action.
- Which evidence should remain available after rejection.
- Whether a model's confidence value can override the policy.

Now inspect the persisted model step, failed policy step and absence of an approval. This controlled failure tests the enforcement boundary even though the provider is a fixture.

## Be precise about retrieval

The local retrieval baseline uses full-text ranking and token-hash vectors. It does not demonstrate the semantic quality of a learned embedding model. Draft exclusion, version selection, tenant scope and source IDs are real behavior and independently testable.

An output can cite a real source and still misrepresent it. Source provenance and claim entailment are different checks. Propose one additional evaluation that would catch a misleading claim with a valid citation.

## What does 14/14 establish?

The suite contains six retrieval cases and eight policy-contract cases. It reports the exact sample count, splits and expected/actual results. It establishes behavior on that fixture set. It does not establish live-model quality, broad safety, a causal improvement in your prompting skill, or reliable generalization from two held-out examples.

Design the next experiment with one variable: for example, a learned embedding provider versus the current baseline. Freeze corpus versions, queries, relevance labels and scoring before comparing. Keep live-model expense and latency separate from retrieval correctness. Preserve failures rather than replacing them with friendlier examples.

Your evidence: a threat model for one proposed action, an additional evaluation case, and a claim you would be willing to defend in a review. [Answer key](../solutions/02-program-invariants.md).
