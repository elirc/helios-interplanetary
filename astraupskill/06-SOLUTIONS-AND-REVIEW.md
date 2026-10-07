# Read the receipt as a commit witness

## Answers

**1.** Work order `VERIFYING`, incident `ACKNOWLEDGED`, crew `available=false`, stock `on_hand=1, reserved=1`, zero postmortems, audit count equal to the baseline, zero receipts for `commandId`. Stock is still reserved because `closeReservationTx(..., true)` (maintenance.ts:184) ran inside the transaction that the trigger aborted; `ROLLBACK` undid the consumption, returning the row to its pre-call state, which was "reserved by `reserve_parts`".

**2.** A model that passes both tests (verified with `node --test` on Node 22):

```js
import { test } from "node:test";
import assert from "node:assert/strict";

function makeDb() {
  let state = { reserved: 1, onHand: 1, postmortems: 0, receipts: new Map() };
  const clone = (s) => ({ ...s, receipts: new Map(s.receipts) });
  return {
    get: () => state,
    async transaction(work) {
      const draft = clone(state);       // BEGIN
      const result = await work(draft); // throw -> draft discarded (ROLLBACK)
      state = draft;                    // COMMIT
      return result;
    },
  };
}
async function idempotentCommand(db, input, work, { receiptOutside = false } = {}) {
  if (receiptOutside) {
    const prev = db.get().receipts.get(input.commandId);
    if (prev) return { ...prev, replayed: true };
    db.get().receipts.set(input.commandId, { ok: true }); // BUG: saved before the work commits
    return { ...(await db.transaction(work)), replayed: false };
  }
  return db.transaction(async (tx) => {
    const prev = tx.receipts.get(input.commandId);
    if (prev) return { ...prev, replayed: true };
    const result = await work(tx);
    tx.receipts.set(input.commandId, result);
    return { ...result, replayed: false };
  });
}
const completeRepair = (fail) => async (tx) => {
  tx.onHand -= 1; tx.reserved -= 1;
  if (fail()) throw new Error("injected postmortem failure");
  tx.postmortems += 1;
  return { ok: true };
};

test("receipt inside the transaction: fail, recover, replay", async () => {
  const db = makeDb(); let fail = true; const input = { commandId: "c1" };
  await assert.rejects(idempotentCommand(db, input, completeRepair(() => fail)), /injected/);
  assert.equal(db.get().reserved, 1);
  assert.equal(db.get().receipts.size, 0);
  fail = false;
  assert.equal((await idempotentCommand(db, input, completeRepair(() => fail))).replayed, false);
  assert.equal((await idempotentCommand(db, input, completeRepair(() => fail))).replayed, true);
  assert.deepEqual([db.get().onHand, db.get().reserved, db.get().postmortems], [0, 0, 1]);
});

test("receipt outside the transaction: a failed repair looks complete", async () => {
  const db = makeDb(); let fail = true; const input = { commandId: "c1" };
  await assert.rejects(idempotentCommand(db, input, completeRepair(() => fail), { receiptOutside: true }));
  fail = false;
  const retry = await idempotentCommand(db, input, completeRepair(() => fail), { receiptOutside: true });
  assert.equal(retry.replayed, true);    // the retry never runs the repair
  assert.equal(db.get().postmortems, 0);
  assert.equal(db.get().reserved, 1);
});
```

Receipt-after-commit in a separate transaction fails the other way: a crash between the two commits leaves a completed repair with no receipt, so a client retry with the same id runs the work again. Here the `COMPLETED` guard (maintenance.ts:165) would return early, but other actions (for example `reserve_parts`) have no such guard. In the real test, the rollback assertion on `operation_commands` (repair.test.ts:319-323) is what catches the receipt-before-commit variant.

**3.** 409 `IDEMPOTENCY_CONFLICT` (operations.ts:31-35): the stored payload differs, so this is a rejected reuse of an id, not a replay. Existing coverage: `repair.test.ts:18-32` ("binds command payload"). The `IDEMPOTENCY_CONFLICT` hits in `mission.test.ts` (lines 97, 155, 184) are for telemetry readings and scenario runs, which have their own idempotency checks; they do not exercise `idempotentCommand`.

**4.** With cleanup outside `finally`, the failing assertion throws past the `DROP` statements, the trigger survives in `helios_test`. `resetFixtures` does not drop triggers (`grep -i trigger src/server/fixtures.ts` prints nothing), so every later test or run that completes a repair against that database fails with "injected postmortem failure". (The owned temp cluster hides this because it is deleted after each run, which is exactly why the `finally` matters on a long-lived test database.) `DROP ... IF EXISTS` on the two specifically named objects is the targeted cleanup; never reset the developer database.

**5.** Integration test: rollback + receipt semantics on real PostgreSQL. Browser case: the visible repair path works end to end in the local simulation. Neither covers deployment, real equipment, live model providers, or human mastery.

**6.** Two different clients (or a client that lost the response and generated a fresh id) send `complete_repair` with ids A and B. The receipt for A does not match B, so B's work runs; the `COMPLETED` guard makes it a no-op instead of consuming stock a second time.

## Senior-review notes (verified against the code)

1. **`transaction()` can mask the original error and recycle a broken connection.** `src/server/db.ts:26-31`: if `ROLLBACK` itself throws (for example, the connection dropped mid-transaction), that error replaces the original one, and `client.release()` is called without an error argument, so node-postgres returns the client to the pool instead of destroying it. A safer shape is `try { await client.query("ROLLBACK") } catch {}`, rethrow the original, and `client.release(rollbackFailed ? err : undefined)`.
2. **Authorization runs before replay.** `requireOperator` (operations.ts:19) executes before the receipt lookup. If an operator's role changes between a commit and the client's retry, the retry gets 403 even though the command committed. That is defensible (never leak results to an unauthorised caller), but the API contract should say so.
3. **Replay returns the stored result, not current state.** `previous.result` (operations.ts:37) is the response as of the original commit. Callers that need fresh state must re-read.
4. **Test coupling to seed data.** The regression hard-codes `org-helios-crew-1` and `warehouse_id='org-helios-local'`, and `SET on_hand=1` updates every SKU in that warehouse. Fine for a seeded fixture; a seed change would break it in a confusing way.

[05-PRACTICE](05-PRACTICE.md) / [07-TRACE-LAB](07-TRACE-LAB.md)
