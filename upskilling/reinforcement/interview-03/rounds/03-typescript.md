# Helios / astra1: TypeScript, schemas, and public contracts

Work one case at a time in approximately 25 minutes. These are six distinct scenarios viewed through this interview round. Select a case you have not recently rehearsed. The [source map](../README.md), [scorecard](../SCORECARD.md), and [project defense](../PROJECT-DEFENSE.md) support your attempt. Afterward use the [separate interviewer notes](../_interviewer/rounds/03-typescript.md).

## How to run this round

Design the contract around this case without assuming that incoming JSON is already a trusted type. Use TypeScript sketches for a TypeScript project; use JSDoc plus the existing runtime-schema conventions for GitJira. Start the external input as unknown and identify the first boundary that may narrow or reject it.

Write a small outcome union whose variants require different caller behavior. Include the case's successful result and its important failure or uncertain result. Show an exhaustive consumer and explain what should happen when a new variant is introduced. Avoid a boolean plus several optional fields when that representation admits contradictory states.

The interviewer will supply an omitted property, explicit null, an empty string, zero, and a wrong primitive type. State which are meaningful for this contract; do not normalize all of them into one value by default. Add an old-client fixture that lacks a newly optional field and a malicious or malformed fixture that supplies a forbidden field.

Deliver type/schema sketches, an input-decision table, and a compatibility note. These are practice designs until checked against the repository's actual public contract; do not describe an uncompiled sketch as passing type verification.

## 06.3.1 — The last transaction step fails

**Scenario.** A repair performs several writes and fails while inserting the postmortem. The repository already has a focused rollback regression; this is an explanation exercise, not a claim of a newly discovered defect.

**Starting fixture.** Reservation consumed; work order completed; postmortem insert rejected.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.3.2 — A successful command is replayed

**Scenario.** The client loses a response and repeats the same command. The operation has already committed once.

**Starting fixture.** Command K completed; response lost; K submitted again.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.3.3 — Two balanced groups cancel a mistake globally

**Scenario.** A synthetic report adds all journal lines across organizations. One group has a debit surplus and another a credit surplus; the overall sum looks balanced.

**Starting fixture.** OrgA/J1 debit100 credit90; OrgB/J2 debit90 credit100.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.3.4 — Actual usage exceeds a reservation

**Scenario.** A simulated operation reserves thirty units but later reports forty-five actual units. Hiding the difference would make the usage ledger misleading.

**Starting fixture.** Cap100; spent60; reserved30; actual45.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.3.5 — Telemetry is fresh but the incident is not resolved

**Scenario.** A recent request metric exists while the operational workflow is still pending. The interviewer asks what this observation proves.

**Starting fixture.** HTTP observation atT; incident pending sinceT-100; worker progress unknown.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.3.6 — A proposed feature is described as completed

**Scenario.** A project has a future-work backlog and a completed local checkpoint. An interview answer accidentally merges them into a claim that every proposed capability was shipped.

**Starting fixture.** Completed Run003; future-work story still awaiting review.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.
