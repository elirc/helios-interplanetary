# Answer key: program invariants and agent supervision

Attempt the retrospective exercises before reading this file.

## Reservation interleaving

With one on-hand item and two competing one-item requests, one work order becomes READY and one AWAITING_PARTS. `on_hand=1`, `reserved=1`, `available=0`. Cancelling the winner releases its held reservation, so `reserved=0`. Retrying the loser can then reserve the item. Cancellation cannot consume stock or release an already closed reservation twice.

The row lock protects the check-and-update sequence. The database check is a second line of defense; it does not replace the work-order state transition or prove the losing request is usable.

## Receipt versus provider payment

Receipt is one owned database operation: stock transfer, budget recognition and work readiness can commit atomically. The simulated provider deliberately commits in a separate transaction to model a boundary Helios cannot roll back. UNKNOWN is therefore a valid intermediate outcome. The same provider key and reconciliation prevent a second charge.

A deferred journal constraint sees all lines at commit. An immediate balance check after the first debit would reject legitimate multi-line construction. Immutable posted journals require reversals rather than edits; later inserts into an already committed entry are also rejected.

## Lease recovery

Claimed work remains RUNNING until its lease expires or its owner acknowledges/fails it. A replacement claim creates a different lease token. The original token cannot commit afterward. The consumer receipt gives a separate durable guarantee against another effect when the same event is delivered again.

The actual child-process test establishes this controlled recovery case. It does not establish high availability under every network, storage or process failure.

## Product-agent policy

An unsafe action outside the recommendation enum fails policy validation and creates no approval. Confidence cannot expand the action allowlist. Retrieved instructions cannot grant tools or tenant access. A valid action still needs a human decision and current domain eligibility.

A real citation can support the wrong claim. A stronger evaluation would label claim-to-source entailment or verify a structured factual field against authoritative domain evidence. Fixture scores should be reported with their sample counts and boundaries; live-model evaluation needs separate runs, measured usage and representative cases.

## Honest checkpoint

After the repair tests passed, the correct checkpoint said that service/database behavior was verified while HTTP/browser integration remained pending. It should name the six checks, identify the current schema and test database, preserve the M01 baseline, and direct the next run to integrate the UI and execute browser journeys. “M02–M06 complete” would have been too strong at that point.
