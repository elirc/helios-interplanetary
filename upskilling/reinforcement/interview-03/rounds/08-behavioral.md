# Helios / astra1: Project explanation and behavioral interview

Work one case at a time in approximately 25 minutes. These are six distinct scenarios viewed through this interview round. Select a case you have not recently rehearsed. The [source map](../README.md), [scorecard](../SCORECARD.md), and [project defense](../PROJECT-DEFENSE.md) support your attempt. Afterward use the [separate interviewer notes](../_interviewer/rounds/08-behavioral.md).

## How to run this round

Use this case to practice explaining technical work to a teammate and then to a non-specialist. If you have not personally implemented or investigated it, present it as a study or design exercise. Do not turn the supplied scenario, another author's implementation, or a reference answer into a fabricated personal achievement.

Prepare a ninety-second account: the user's problem, your actual role, the constraint, a decision you made or would test, the evidence you observed, and a remaining limitation. For a hypothetical case, use conditional language throughout and state the experiment you would run. Avoid invented users, performance gains, outages, revenue, or team conflicts.

The interviewer will ask why you rejected an alternative, what feedback changed your mind, and what you would do with one more day. Answer with the case's concrete input and boundary. If you do not know a detail, explain how you would verify it instead of substituting a confident generic story.

Deliver a short spoken answer, an evidence ledger with source/experiment links, and two follow-up answers. Practice a version for a frontend interviewer and one for a backend interviewer while keeping the underlying facts identical.

## 06.8.1 — The last transaction step fails

**Scenario.** A repair performs several writes and fails while inserting the postmortem. The repository already has a focused rollback regression; this is an explanation exercise, not a claim of a newly discovered defect.

**Starting fixture.** Reservation consumed; work order completed; postmortem insert rejected.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.8.2 — A successful command is replayed

**Scenario.** The client loses a response and repeats the same command. The operation has already committed once.

**Starting fixture.** Command K completed; response lost; K submitted again.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.8.3 — Two balanced groups cancel a mistake globally

**Scenario.** A synthetic report adds all journal lines across organizations. One group has a debit surplus and another a credit surplus; the overall sum looks balanced.

**Starting fixture.** OrgA/J1 debit100 credit90; OrgB/J2 debit90 credit100.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.8.4 — Actual usage exceeds a reservation

**Scenario.** A simulated operation reserves thirty units but later reports forty-five actual units. Hiding the difference would make the usage ledger misleading.

**Starting fixture.** Cap100; spent60; reserved30; actual45.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.8.5 — Telemetry is fresh but the incident is not resolved

**Scenario.** A recent request metric exists while the operational workflow is still pending. The interviewer asks what this observation proves.

**Starting fixture.** HTTP observation atT; incident pending sinceT-100; worker progress unknown.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.


---

## 06.8.6 — A proposed feature is described as completed

**Scenario.** A project has a future-work backlog and a completed local checkpoint. An interview answer accidentally merges them into a claim that every proposed capability was shipped.

**Starting fixture.** Completed Run003; future-work story still awaiting review.

Your user is a authorized operations user; the affected surface is the operations hub and workflow history. Keep organization, command identity, and authorized operation visible in the model. The user-facing operation is to complete a repair or record a journal transition.

### Project-specific follow-through

Start at the [project source map](../README.md), then trace authorized server command and PostgreSQL transaction. Locate one current symbol that supports your explanation and one assumption the fixture adds. If the application already handles the scenario, characterize that behavior instead of inventing a fix. Record the repository state you inspected so later changes do not silently invalidate your answer.

Before opening the interviewer notes, write a result for the supplied fixture and one counterexample of your own. Ask the interviewer to vary exactly one fact, then explain what changes and what stays invariant. Finish with one sentence naming the evidence that would be needed to move from this practice answer to an application claim.

**Evidence to keep:** your first prediction, the artifact requested in this round, the strongest follow-up question, your revised explanation, and any check that remains unrun. Repeating the same answer faster is not the goal; surviving a changed input is.
