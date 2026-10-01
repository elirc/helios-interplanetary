# Interviewer notes: Helios / astra1 / Code-review and take-home defense

Keep this file closed during a first attempt. Accept behaviorally correct alternatives that satisfy the declared contract. Source-grounded explanations and honest limitations matter more than matching these words. Return to the [candidate round](../../rounds/07-review.md) to run a new attempt.

## How to evaluate this round

A strong review is specific enough that the author can reproduce the issue. It points to a mechanism and a concrete input, then asks for a focused correction or explains a proposed one. A comment such as improve error handling is too vague unless it names the rejected or uncertain outcome and its current consequence.

Use the case invariant as the standard for blocking feedback. If two implementations satisfy it, discuss maintainability or cost as a tradeoff rather than inventing a correctness claim. Check the test diff as carefully as the implementation diff: a removed assertion can make a suite green by deleting the behavior it once protected.

For compatibility, ask whether existing callers, saved data, query keys, or operation IDs change meaning. For scope, inspect raw server responses and predicates rather than only the visible component. For asynchronous work, inspect rejection and cleanup paths as well as success. The candidate does not need to find every imaginable issue; they need to prioritize the ones this patch can actually introduce.

In the take-home defense, ask what the candidate chose not to build and why. A candid answer should name the time constraint, retained invariant, and deferred evidence. If they used an assistant, ask which assumptions they checked and which test rejected a plausible bad suggestion. Junior success is a reasoned review that helps another engineer improve the patch while preserving the distinction between requirement and preference.

## 06.7.1 — The last transaction step fails

### Expected project reasoning

**Invariant:** All effects belonging to the repair transaction must roll back together.

Use the existing regression to identify the actual atomic boundary and checked effects. Explain why inspecting only the final work-order status would miss leaked inventory, audit, or receipt writes.

**Plausible wrong approach:** Describe the transaction as safe without locating the rollback assertions.

Use the exact starting fixture from [the candidate round](../../rounds/07-review.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to authorized server command and PostgreSQL transaction and which belongs to the operations hub and workflow history. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.


---

## 06.7.2 — A successful command is replayed

### Expected project reasoning

**Invariant:** The same logical command should return its recorded outcome without repeating domain effects.

Trace command receipt identity and its transaction relationship to the effect. Distinguish this durable behavior from a process-local promise gate or a disabled button. Use the existing fixture evidence carefully.

**Plausible wrong approach:** Generate a fresh command ID on retry and call it idempotent.

Use the exact starting fixture from [the candidate round](../../rounds/07-review.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to authorized server command and PostgreSQL transaction and which belongs to the operations hub and workflow history. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.


---

## 06.7.3 — Two balanced groups cancel a mistake globally

### Expected project reasoning

**Invariant:** Balance must be checked at the journal and organization grouping boundary.

Report both imbalanced groups even though the combined net is zero. Use integer units and explicit grouping keys. The read projection does not itself authorize or post journals.

**Plausible wrong approach:** Prove journal correctness by checking only one global net total.

Use the exact starting fixture from [the candidate round](../../rounds/07-review.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to authorized server command and PostgreSQL transaction and which belongs to the operations hub and workflow history. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.


---

## 06.7.4 — Actual usage exceeds a reservation

### Expected project reasoning

**Invariant:** Accounting should record actual accepted usage under a stated settlement policy.

Expose the over-cap state and block future admission if that is the policy. Do not clamp the recorded usage to the estimate. Atomic admission and reconciliation remain separate from arithmetic.

**Plausible wrong approach:** Replace actual cost with the estimate to keep the dashboard green.

Use the exact starting fixture from [the candidate round](../../rounds/07-review.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to authorized server command and PostgreSQL transaction and which belongs to the operations hub and workflow history. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.


---

## 06.7.5 — Telemetry is fresh but the incident is not resolved

### Expected project reasoning

**Invariant:** A signal proves only the boundary at which it is produced.

Separate request availability, worker progress, and domain completion. Name the stored result or workflow event needed to confirm repair completion. Historical local checks are not current production monitoring.

**Plausible wrong approach:** Call the whole system healthy because a recent endpoint returned 200.

Use the exact starting fixture from [the candidate round](../../rounds/07-review.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to authorized server command and PostgreSQL transaction and which belongs to the operations hub and workflow history. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.


---

## 06.7.6 — A proposed feature is described as completed

### Expected project reasoning

**Invariant:** A portfolio explanation must distinguish implemented, tested, proposed, and personally performed work.

Point to current-state and the execution record for completed behavior. Present the proposed change as a design exercise and describe your own actual reading or experiment honestly.

**Plausible wrong approach:** Claim ownership or deployment of work you only read in a backlog.

Use the exact starting fixture from [the candidate round](../../rounds/07-review.md). Require the candidate to predict its outcome before discussing an abstract pattern. If they propose a different product policy, ask them to state it explicitly and show how the acceptance examples change; do not confuse a policy disagreement with a JavaScript error.

### Follow-up and calibration

Ask which responsibility belongs to authorized server command and PostgreSQL transaction and which belongs to the operations hub and workflow history. Then remove one assumption the candidate relied on: validated input, stable identity, one caller, one process, or unchanged scope. Require an updated example, not a new collection of buzzwords.

Award 0 for an unsupported or incorrect answer, 1 for a correct explanation without a discriminating example, and 2 for a correct mechanism plus a counterexample and an appropriately scoped observation. Record separate scores for mechanism, contract, verification, and communication. Do not score an unrun browser or database check as observed evidence. The notes provide a reasoning direction, not a memorization script or a substitute for inspecting the repository.
