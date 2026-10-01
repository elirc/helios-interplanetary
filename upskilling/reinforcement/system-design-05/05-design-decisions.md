# Decision record and worked design journal

## ADR: the boundary chosen for this case

**Status:** proposed teaching decision, not an approved application migration.

**Context:** An authorized operations user completes a prepared repair, sees the committed workflow outcome, and can safely reconcile a lost response using the same command identity. Notifications and read projections follow committed state without becoming the authority for repair completion.

**Required invariant:** A repair completion either commits every included domain effect and its receipt, or commits none; replay of a successful logical command does not consume inventory again.

**Decision:** Preserve the existing transaction-centered modular-monolith boundary and make asynchronous effects explicitly downstream of commit.

**Alternative considered:** Use a durable orchestrator with compensating actions across independently owned services. It can support separate teams and stores, but introduces visible intermediate states and business-specific compensation instead of the existing local rollback guarantee. Reconsider when ownership or deployment requirements make the shared transaction impractical.

**Pitfall to reject:** Split every domain noun into a service or claim that a local transaction includes remote effects.

**Cost accepted:** The transaction boundary couples participating writes and can become a contention point; careful query work and bounded command execution matter.

**Revisit trigger:** Revisit service boundaries when independently measured ownership, deployment, or load requirements outweigh the cost of replacing atomic behavior with a distributed workflow contract.

An alternative can become appropriate under a different workload or requirement. The purpose of the record is to make that change legible. A trigger should refer to measured contention, an operating requirement, a query/evaluation result, or a clear product constraint—not a preference for a more fashionable architecture.

## Worked journal: a fictional design-learning entry

The following paragraph is a teaching narrative, not a claim about the user's work or a new production incident.

I initially treated a larger component diagram as a more advanced design. The repair rollback record changed the criterion: the useful question was which effects the user expects to succeed together. Keeping those writes in one transaction was an advantage, not an embarrassment. I then separated the historical test evidence from my own source reading and from a hypothetical future physical integration, because each supports a different claim.

My next step would be to turn the strongest claim into a falsifiable example. I would state the initial values, put the competing action or failure at a specific boundary, and identify what must remain unchanged. If the source already implements the desired mechanism, I would characterize that behavior and preserve its evidence rather than propose a replacement just to make the exercise look larger.

I would also separate three levels of confidence: the diagram appears coherent, the code contains a relevant mechanism, and an executed test demonstrates the claimed outcome. Each is useful, but they are not interchangeable. The capacity worksheet supplies another kind of evidence: arithmetic under explicit assumptions. It does not fill in a missing benchmark or prove a service meets a latency objective.

## Write your own decision journal

Record the first design you considered, the concrete counterexample that changed it, and the simpler boundary you can now explain. Include one downside of the chosen design. Then change a requirement—higher contention, stricter freshness, a second process, revoked access, or an unavailable dependency—and explain whether the decision still holds.

Keep the actual source observation next to any claim about existing behavior. Label proposed APIs and schemas as proposed. If you later discuss this in an interview, distinguish reading, modeling, implementation, and runtime verification, and identify the artifacts you personally produced.
