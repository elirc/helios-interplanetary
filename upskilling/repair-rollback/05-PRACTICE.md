# Separate failed execution, recovery, and replay

Write your answer before opening [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md). Exercises 1-3 and 6 need only an editor and Node 22; 4-5 need PostgreSQL.

## Exercise 1: predict the post-failure state

**Goal:** List the state of the work order, incident, crew member `org-helios-crew-1`, local stock, postmortems, audit count, and command receipt immediately after the injected failure. Explain why stock is still *reserved* rather than consumed or released.

**Check:** Compare with the seven assertions at `tests/integration/repair.test.ts:283-323`. Then confirm the consumption call you expected to be undone: `grep -n "closeReservationTx(client, p, work, true)" src/server/maintenance.ts` should print line 184, which runs *before* the postmortem insert at line 208.

## Exercise 2: model the receipt, then break it

**Goal:** Prove to yourself why `operations.ts:39-43` inserts the receipt inside the transaction. In a scratch folder **outside the repo**, create `receipt-model.test.mjs` that models `db.ts` `transaction()` (copy state on BEGIN, keep the copy on COMMIT, discard it on throw) and `idempotentCommand`. Write two tests: (a) receipt inside the transaction: fail, retry (`replayed:false`), replay (`replayed:true`), final stock `0/0` and one postmortem; (b) receipt saved *before* the work commits: after a failed attempt the retry returns `replayed:true` and the repair never happens.

**Check:** `node --test receipt-model.test.mjs` reports `# pass 2`. Then flip the bug: in (b), what would go wrong if the receipt were saved *after* the commit in a separate transaction and the process crashed between them? Write one sentence.

## Exercise 3: same id, different payload

**Goal:** Predict what happens if, after the successful recovery, you send `{ commandId, action: "complete_repair", workOrderId: <some other id> }` with the same `commandId`.

**Check:** Find the branch: `grep -n "IDEMPOTENCY_CONFLICT" src/server/operations.ts` (line 34). State the status code and why this is not a replay. Then find the existing test that exercises this conflict for operations: `grep -n "IDEMPOTENCY_CONFLICT" tests/integration/repair.test.ts`.

## Exercise 4: why `finally` matters (PostgreSQL)

**Goal:** In a disposable branch, change the rollback assertion `"VERIFYING"` (repair.test.ts:286) to `"COMPLETED"` and move the two `DROP` statements out of `finally` to after the `try` block.

**Check:** Run the repair test file (see [04](04-TESTING-AND-DEBUGGING.md)). The target test fails as intended; observe whether the trigger survives (`SELECT tgname FROM pg_trigger WHERE tgname LIKE 'test_reject%'` in the test DB). Restore with `git checkout -- tests/` and confirm `git status` is clean.

## Exercise 5: the integration test vs the browser flow

**Goal:** For `npm run test:integration` passing and the coolant-repair Playwright case (`tests/e2e/operations.spec.ts:35`) passing, write what each establishes and what neither establishes (deployment, real equipment, external model providers, your own understanding).

**Check:** Your list for the browser case must not include "rollback is atomic"; the e2e spec never injects a failure (`grep -n "trigger\|ROLLBACK" tests/e2e/operations.spec.ts` prints nothing).

## Exercise 6: the second idempotency layer

**Goal:** Explain why `complete_repair` checks `work.status === "COMPLETED"` (maintenance.ts:165) even though receipts exist. Describe a request sequence where the receipt does not help but this guard does.

**Check:** Your sequence must use two *different* command ids. Confirm the guard returns without writing anything by reading lines 164-165.

[04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md)
