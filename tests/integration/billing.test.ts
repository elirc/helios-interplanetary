import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrate } from "../../src/server/migrations";
import { resetFixtures } from "../../src/server/fixtures";
import { executeBilling, receiveWebhook, signWebhook } from "../../src/server/billing";
import { executeCase } from "../../src/server/cases";
import { transaction } from "../../src/server/db";
import { PERSONAS } from "../../src/server/identity";
import { actor, testPool } from "../helpers";
const pool = testPool();
before(() => migrate(pool));
beforeEach(() => resetFixtures(pool));
after(() => pool.end());
const bill = (action: string, fields = {}) =>
  executeBilling(actor, { commandId: randomUUID(), action, ...fields }, pool);
async function invoice() {
  await bill("record_usage", { subscriptionId: "org-helios-compute", quantity: 240 });
  return bill("issue_invoice", { subscriptionId: "org-helios-compute" });
}
test("usage and subscription billing are idempotent and journals balance at database commit", async () => {
  const i = await invoice();
  assert.equal((await bill("issue_invoice", { subscriptionId: "org-helios-compute" })).id, i.id);
  assert.equal(
    (await pool.query("SELECT amount_cents FROM invoices WHERE id=$1", [i.id])).rows[0]
      .amount_cents,
    185000,
  );
  await assert.rejects(
    bill("record_usage", { subscriptionId: "org-helios-compute", quantity: 1 }),
    { code: "PERIOD_CLOSED" },
  );
  await assert.rejects(
    transaction(pool, async (c) => {
      const id = randomUUID();
      await c.query(
        "INSERT INTO journal_entries(id,organization_id,reference,description) VALUES($1,'org-helios','bad','Unbalanced test')",
        [id],
      );
      await c.query(
        "INSERT INTO journal_lines(id,organization_id,entry_id,account,side,amount_cents) VALUES($1,'org-helios',$2,'AR','DEBIT',100)",
        [randomUUID(), id],
      );
    }),
    { code: "23514" },
  );
  await assert.rejects(pool.query("UPDATE journal_lines SET amount_cents=1"), { code: "23514" });
  const entry = (await pool.query("SELECT id FROM journal_entries LIMIT 1")).rows[0].id;
  await assert.rejects(
    pool.query(
      "INSERT INTO journal_lines(id,organization_id,entry_id,account,side,amount_cents) VALUES($1,'org-helios',$2,'AR','DEBIT',100)",
      [randomUUID(), entry],
    ),
    { code: "23514" },
  );
});
test("timeout after provider commit, delayed signed webhook and retries settle one charge", async () => {
  const i = await invoice(),
    input = {
      commandId: randomUUID(),
      action: "pay_invoice",
      invoiceId: i.id,
      behavior: "timeout",
    };
  assert.equal((await executeBilling(actor, input, pool)).status, "UNKNOWN");
  await executeBilling(actor, input, pool);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM provider_charges")).rows[0].n, 1);
  const a = (await pool.query("SELECT * FROM payment_attempts WHERE invoice_id=$1", [i.id]))
      .rows[0],
    event = {
      eventId: randomUUID(),
      organizationId: actor.organizationId,
      attemptId: a.id,
      amountCents: a.amount_cents,
      status: "SUCCEEDED",
    },
    time = Math.floor(Date.now() / 1000);
  await assert.rejects(receiveWebhook(event, "bad", time, pool), { code: "WEBHOOK_SIGNATURE" });
  await assert.rejects(receiveWebhook(event, signWebhook(event, time - 600), time - 600, pool), {
    code: "WEBHOOK_EXPIRED",
  });
  const sig = signWebhook(event, time);
  const responses = await Promise.all([
    receiveWebhook(event, sig, time, pool),
    receiveWebhook(event, sig, time, pool),
  ]);
  assert.equal(responses.filter((r) => r.duplicate).length, 1);
  assert.ok(responses.every((r) => r.status === "PAID"));
  assert.equal((await executeBilling(actor, input, pool)).status, "PAID");
  assert.equal(
    (
      await pool.query("SELECT count(*)::int AS n FROM journal_entries WHERE reference=$1", [
        `payment:${i.id}`,
      ])
    ).rows[0].n,
    1,
  );
  assert.equal(
    (await pool.query("SELECT status FROM support_tickets WHERE invoice_id=$1", [i.id])).rows[0]
      .status,
    "RESOLVED",
  );
  await bill("refund_invoice", { invoiceId: i.id });
  await bill("refund_invoice", { invoiceId: i.id });
  assert.equal(
    (
      await pool.query("SELECT count(*)::int AS n FROM journal_entries WHERE reference=$1", [
        `refund:${i.id}`,
      ])
    ).rows[0].n,
    1,
  );
});
test("provider outage creates no charge; recovery reuses the attempt and tenant mutations are denied", async () => {
  const i = await invoice();
  await bill("pay_invoice", { invoiceId: i.id, behavior: "outage" });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM provider_charges")).rows[0].n, 0);
  await assert.rejects(bill("reconcile_invoice", { invoiceId: i.id }), {
    code: "PROVIDER_UNCONFIRMED",
  });
  assert.equal(
    (await bill("pay_invoice", { invoiceId: i.id, behavior: "success" })).status,
    "PAID",
  );
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM payment_attempts")).rows[0].n, 1);
  await assert.rejects(
    executeBilling(
      PERSONAS.observer,
      { commandId: randomUUID(), action: "reconcile_invoice", invoiceId: i.id },
      pool,
    ),
    { code: "NOT_FOUND" },
  );
  await assert.rejects(
    executeBilling(
      PERSONAS.auditor,
      { commandId: randomUUID(), action: "refund_invoice", invoiceId: i.id },
      pool,
    ),
    { code: "FORBIDDEN" },
  );
});
test("security investigation requires a finding and preserves attributable resolution", async () => {
  const s = await executeCase(
    actor,
    { commandId: randomUUID(), action: "inject_security_campaign" },
    pool,
  );
  await assert.rejects(
    executeCase(
      actor,
      {
        commandId: randomUUID(),
        action: "resolve_security",
        id: s.id,
        finding: "Reviewed simulated denied requests.",
      },
      pool,
    ),
    { code: "INVESTIGATION_REQUIRED" },
  );
  await executeCase(
    actor,
    { commandId: randomUUID(), action: "investigate_security", id: s.id },
    pool,
  );
  await executeCase(
    actor,
    {
      commandId: randomUUID(),
      action: "resolve_security",
      id: s.id,
      finding: "Reviewed eight simulated denied requests; no real account compromise occurred.",
    },
    pool,
  );
  const record = (
    await pool.query("SELECT status,resolved_by FROM security_investigations WHERE id=$1", [s.id])
  ).rows[0];
  assert.deepEqual(record, { status: "RESOLVED", resolved_by: actor.id });
});
