# Six connected Helios demonstrations

Use Mission Control at http://127.0.0.1:3000 or the container preview at http://127.0.0.1:3002. Enter as Avery Vale, then open **Operations hub**. Keep the clock paused for repeatable manual demonstrations. The separate worker handles resumed time, notifications, retries and timers.

All purchases, payments, infrastructure commands, crew and security signals in this project are fictional simulation data. The default adviser is a deterministic provider fixture. The user has not yet completed the learning exercises.

## A — Coolant failure to verified repair

1. In **Command center**, inject coolant degradation.
2. In **Repair desk**, acknowledge the incident.
3. In **AI Operations**, run the diagnostic adviser. Expand its tool steps and inspect retrieved source IDs. Approve its proposed work-order action. If approval fails because the incident is unacknowledged, acknowledge it and retry; the domain check is intentional.
4. In **Repair desk**, reserve parts. Local stores start empty. Request procurement.
5. In **Supply & approvals**, approve the purchase. Budget becomes committed. Dispatch the shipment; Earth stock and a cargo vessel are reserved.
6. In **Logistics**, advance 15 minutes twice, then receive the shipment during its 15-minute docking window. Local stock is reserved for this repair and the budget commitment becomes received spend.
7. In **Repair desk**, choose a valid COOLANT_L2 technician. The expired qualification is deliberately visible for testing the guard. Start repair, then complete isolate, replace and inspect in that order.
8. Begin verification. Record recovery telemetry, then complete the verified repair. Parts are consumed once, the technician becomes available, the incident resolves, and a recovery record preserves the evidence.
9. Run the summary adviser to inspect the incident timeline. Its output is a draft with stated limitations; the domain recovery record is the authoritative evidence.

## B — Solar grid crisis

Open **Energy & projects**. Inject a solar outage and advance one hour. Inspect battery drawdown and the constant-load reserve estimate. Shed industrial load; manufacturing pauses while critical load remains supplied. Repair the isolated array, restore industrial load, and advance time to observe charging and resumed fabrication.

Repair is a human action. The adviser has no tool that can disable critical loads or issue this physical command.

## C — Cargo delay cascade

Follow A through dispatch. In **Logistics**, inject a cargo delay. The original docking reservation is marked missed and the work order remains awaiting parts. Reserve the priority route, advance 15 minutes to its new ETA, and receive the shipment. Inspect the audit record for the delay, new route, receipt and parts reservation.

Arriving after the end of a docking window is rejected. Mark the delay and reserve a new approach; the service does not silently deliver into an occupied or expired slot.

## D — Duplicate event delivery

Open **Platform console** and process pending events. Replay one delivered event, then process pending events again. The same event identity re-enters delivery, but the consumer receipt prevents another notification or workflow effect. The event and receipt are persistent database rows.

The unsafe baseline belongs only in the separate teaching exercise. Main application consumers retain their idempotency protection throughout the demo.

## E — Payment provider uncertainty

In **Billing & ledger**, record 240 usage units, issue the monthly invoice, and simulate a timeout after charge. Helios shows UNKNOWN while the independent simulated provider store contains one successful charge. **Security & support** shows the open recovery case.

Return to billing and either reconcile payment or deliver the signed delayed webhook. The invoice becomes paid, the support case resolves, and one settlement journal is posted. Retrying the same payment reuses its provider key. An optional full simulated refund posts a reversal rather than editing the original journal.

The alternate provider-outage action commits no charge. Reconciliation then refuses to invent success; retry the same attempt after recovery.

## F — Incorrect AI action and evaluation

In **AI Operations**, inject an unsafe AI proposal. Expand the model and policy steps: the controlled fixture suggests an action outside the allowlist, validation blocks it, and no approval or physical command is created.

Run evaluations. Inspect every expected and actual result: six retrieval cases and eight policy cases. Four retrieval cases are development examples and two are held out from the development list. These small fixture scores are workflow evidence, not proof of generalization or live model quality.

In **Knowledge library**, search for a procedure and inspect chunk IDs and versions. Ingest a new draft under the same key; retrieval continues using the approved version until a human approves the new version.

## Restore a starting world

Pause both organizations' clocks and stop the worker before resetting. `npm run db:reset` explicitly clears this project's disposable development fixtures and reseeds them. It also clears demonstrations, journals, agent runs and queued events. Tests reset only `helios_test` and must not run their integration and browser suites concurrently.
