import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { Principal } from "../domain/contracts";
import { audit } from "./audit";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";
import { requireOperator } from "./identity";
import { postJournalTx } from "./ledger";
import { idempotentCommand } from "./operations";
import { demand, simulationNow } from "./operations-common";

const base = { commandId: z.uuid() };
export const billingSchema = z.discriminatedUnion("action", [
  z
    .object({
      ...base,
      action: z.literal("issue_invoice"),
      subscriptionId: z.string().min(1).max(80),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("record_usage"),
      subscriptionId: z.string().min(1).max(80),
      quantity: z.number().int().min(1).max(10000),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("pay_invoice"),
      invoiceId: z.uuid(),
      behavior: z.enum(["timeout", "success", "outage"]).default("timeout"),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.enum(["reconcile_invoice", "deliver_webhook", "refund_invoice"]),
      invoiceId: z.uuid(),
    })
    .strict(),
]);
type InvoiceRow = { id: string; status: string; amount_cents: number; correlation_id: string };
type AttemptRow = {
  id: string;
  provider_key: string;
  amount_cents: number;
  invoice_id: string;
  status: string;
};
async function lockInvoice(c: PoolClient, p: Principal, id: string) {
  const row = (
    await c.query<InvoiceRow>(
      "SELECT * FROM invoices WHERE organization_id=$1 AND id=$2 FOR UPDATE",
      [p.organizationId, id],
    )
  ).rows[0];
  if (!row) throw new DomainError(404, "NOT_FOUND", "Invoice not found.");
  return row;
}
async function supportUncertainty(c: PoolClient, p: Principal, invoice: InvoiceRow) {
  await c.query(
    "INSERT INTO support_tickets(id,organization_id,invoice_id,title,summary,correlation_id) VALUES($1,$2,$3,'Payment confirmation pending','The provider outcome is uncertain. Reconcile the existing attempt before retrying a charge.',$4) ON CONFLICT(organization_id,invoice_id) DO NOTHING",
    [randomUUID(), p.organizationId, invoice.id, invoice.correlation_id],
  );
}
export async function settlePaymentTx(c: PoolClient, p: Principal, invoiceId: string) {
  const invoice = await lockInvoice(c, p, invoiceId);
  if (invoice.status === "PAID" || invoice.status === "REFUNDED")
    return { id: invoiceId, status: invoice.status };
  const attempt = (
    await c.query<AttemptRow>(
      "SELECT * FROM payment_attempts WHERE organization_id=$1 AND invoice_id=$2 FOR UPDATE",
      [p.organizationId, invoiceId],
    )
  ).rows[0];
  demand(attempt, "PAYMENT_MISSING", "No payment attempt exists.");
  const charge = (
    await c.query("SELECT * FROM provider_charges WHERE organization_id=$1 AND provider_key=$2", [
      p.organizationId,
      attempt.provider_key,
    ])
  ).rows[0];
  demand(
    charge?.status === "SUCCEEDED" && charge.amount_cents === invoice.amount_cents,
    "PROVIDER_UNCONFIRMED",
    "The provider has no matching successful charge. Retry the same attempt after provider recovery.",
  );
  await c.query(
    "UPDATE invoices SET status='PAID',paid_at=clock_timestamp() WHERE organization_id=$1 AND id=$2",
    [p.organizationId, invoiceId],
  );
  await c.query(
    "UPDATE payment_attempts SET status='SUCCEEDED' WHERE organization_id=$1 AND id=$2",
    [p.organizationId, attempt.id],
  );
  await postJournalTx(c, p, `payment:${invoiceId}`, "Customer payment settled", [
    { account: "CASH", side: "DEBIT", cents: invoice.amount_cents },
    { account: "AR", side: "CREDIT", cents: invoice.amount_cents },
  ]);
  await c.query(
    "UPDATE support_tickets SET status='RESOLVED',resolution='Payment reconciled against the provider charge.' WHERE organization_id=$1 AND invoice_id=$2",
    [p.organizationId, invoiceId],
  );
  await audit(c, p, "PaymentReconciled", invoiceId, invoice.correlation_id, {
    attemptId: attempt.id,
    amountCents: invoice.amount_cents,
  });
  return { id: invoiceId, status: "PAID" };
}

async function payInvoice(
  p: Principal,
  input: Extract<z.infer<typeof billingSchema>, { action: "pay_invoice" }>,
  pool: Pool,
) {
  const plan = await idempotentCommand(
    p,
    input,
    async (c) => {
      const invoice = await lockInvoice(c, p, input.invoiceId);
      if (["PAID", "REFUNDED"].includes(invoice.status))
        return { id: invoice.id, status: invoice.status, attemptId: null };
      const previous = (
        await c.query<AttemptRow>(
          "SELECT * FROM payment_attempts WHERE organization_id=$1 AND invoice_id=$2",
          [p.organizationId, invoice.id],
        )
      ).rows[0];
      const id = previous?.id ?? randomUUID();
      if (!previous)
        await c.query(
          "INSERT INTO payment_attempts(id,organization_id,invoice_id,amount_cents,provider_key,status) VALUES($1,$2,$3,$4,$1,'UNKNOWN')",
          [id, p.organizationId, invoice.id, invoice.amount_cents],
        );
      await c.query("UPDATE invoices SET status='UNKNOWN' WHERE organization_id=$1 AND id=$2", [
        p.organizationId,
        invoice.id,
      ]);
      await supportUncertainty(c, p, invoice);
      if (!previous)
        await audit(c, p, "PaymentAttempted", invoice.id, invoice.correlation_id, {
          attemptId: id,
          amountCents: invoice.amount_cents,
        });
      return { id: invoice.id, status: "UNKNOWN", attemptId: id };
    },
    pool,
  );
  if (!plan.attemptId) return plan;
  const current = (
    await pool.query<InvoiceRow>("SELECT status FROM invoices WHERE organization_id=$1 AND id=$2", [
      p.organizationId,
      input.invoiceId,
    ])
  ).rows[0];
  if (["PAID", "REFUNDED"].includes(current.status))
    return { id: input.invoiceId, status: current.status };
  const attempt = (
    await pool.query<AttemptRow>(
      "SELECT * FROM payment_attempts WHERE organization_id=$1 AND id=$2",
      [p.organizationId, plan.attemptId],
    )
  ).rows[0];
  if (input.behavior !== "outage")
    await transaction(pool, async (c) => {
      await c.query(
        "INSERT INTO provider_charges(provider_key,organization_id,invoice_id,amount_cents,status) VALUES($1,$2,$3,$4,'SUCCEEDED') ON CONFLICT(provider_key) DO NOTHING",
        [attempt.provider_key, p.organizationId, input.invoiceId, attempt.amount_cents],
      );
    });
  if (input.behavior !== "success")
    return {
      id: input.invoiceId,
      status: "UNKNOWN",
      message:
        input.behavior === "timeout"
          ? "Simulated timeout after provider commit. Reconcile or deliver the signed delayed webhook; keep the same payment attempt."
          : "Simulated provider outage. No charge was committed; retry uses the same attempt.",
    };
  return transaction(pool, (c) => settlePaymentTx(c, p, input.invoiceId));
}

const webhookSchema = z
  .object({
    eventId: z.uuid(),
    organizationId: z.string().min(1).max(80),
    attemptId: z.uuid(),
    amountCents: z.number().int().positive(),
    status: z.literal("SUCCEEDED"),
  })
  .strict();
function webhookSecret() {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new DomainError(
      503,
      "WEBHOOK_NOT_CONFIGURED",
      "Configure the payment webhook signing secret.",
    );
  return secret;
}
export function signWebhook(payload: unknown, timestamp: number) {
  const parsed = webhookSchema.parse(payload);
  return createHmac("sha256", webhookSecret())
    .update(`${timestamp}.${JSON.stringify(parsed)}`)
    .digest("hex");
}
export async function receiveWebhook(
  raw: unknown,
  signature: string,
  timestamp: number,
  pool: Pool = getPool(),
) {
  const input = webhookSchema.parse(raw);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300)
    throw new DomainError(
      401,
      "WEBHOOK_EXPIRED",
      "Webhook timestamp is outside the five-minute window.",
    );
  const expected = Buffer.from(signWebhook(input, timestamp), "hex"),
    received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    throw new DomainError(401, "WEBHOOK_SIGNATURE", "Invalid provider signature.");
  const p: Principal = {
    id: "service:payment-provider",
    name: "Simulated payment provider",
    organizationId: input.organizationId,
    organizationName: "Provider scope",
    role: "operator",
  };
  return transaction(pool, async (c) => {
    const attempt = (
      await c.query<AttemptRow>(
        "SELECT * FROM payment_attempts WHERE organization_id=$1 AND id=$2",
        [input.organizationId, input.attemptId],
      )
    ).rows[0];
    if (!attempt) throw new DomainError(404, "NOT_FOUND", "Payment attempt not found.");
    await lockInvoice(c, p, attempt.invoice_id);
    demand(
      attempt.amount_cents === input.amountCents,
      "WEBHOOK_AMOUNT",
      "Webhook amount does not match the attempt.",
    );
    const previous = (
      await c.query("SELECT payload=$2::jsonb AS same FROM payment_webhooks WHERE id=$1", [
        input.eventId,
        JSON.stringify(input),
      ])
    ).rows[0];
    demand(
      !previous || previous.same,
      "IDEMPOTENCY_CONFLICT",
      "Webhook identity was reused with different content.",
    );
    if (!previous)
      await c.query(
        "INSERT INTO payment_webhooks(id,organization_id,attempt_id,payload) VALUES($1,$2,$3,$4)",
        [input.eventId, input.organizationId, input.attemptId, JSON.stringify(input)],
      );
    return { ...(await settlePaymentTx(c, p, attempt.invoice_id)), duplicate: !!previous };
  });
}

export async function executeBilling(p: Principal, raw: unknown, pool: Pool = getPool()) {
  requireOperator(p);
  const input = billingSchema.parse(raw);
  if (input.action === "pay_invoice") return payInvoice(p, input, pool);
  if (input.action === "deliver_webhook") {
    const attempt = (
      await pool.query<AttemptRow>(
        "SELECT * FROM payment_attempts WHERE organization_id=$1 AND invoice_id=$2",
        [p.organizationId, input.invoiceId],
      )
    ).rows[0];
    if (!attempt) throw new DomainError(404, "NOT_FOUND", "Payment attempt not found.");
    const payload = {
        eventId: input.commandId,
        organizationId: p.organizationId,
        attemptId: attempt.id,
        amountCents: attempt.amount_cents,
        status: "SUCCEEDED",
      },
      timestamp = Math.floor(Date.now() / 1000);
    return receiveWebhook(payload, signWebhook(payload, timestamp), timestamp, pool);
  }
  return idempotentCommand(
    p,
    input,
    async (c) => {
      if (input.action === "reconcile_invoice") return settlePaymentTx(c, p, input.invoiceId);
      if (input.action === "refund_invoice") {
        const invoice = await lockInvoice(c, p, input.invoiceId);
        if (invoice.status === "REFUNDED") return { id: invoice.id, status: invoice.status };
        demand(
          invoice.status === "PAID",
          "PAYMENT_REQUIRED",
          "Only a paid invoice can be refunded.",
        );
        await c.query(
          "UPDATE provider_charges SET status='REFUNDED' WHERE organization_id=$1 AND invoice_id=$2",
          [p.organizationId, invoice.id],
        );
        await c.query(
          "UPDATE payment_attempts SET status='REFUNDED' WHERE organization_id=$1 AND invoice_id=$2",
          [p.organizationId, invoice.id],
        );
        await c.query("UPDATE invoices SET status='REFUNDED' WHERE organization_id=$1 AND id=$2", [
          p.organizationId,
          invoice.id,
        ]);
        await postJournalTx(c, p, `refund:${invoice.id}`, "Full simulated customer refund", [
          { account: "REVENUE", side: "DEBIT", cents: invoice.amount_cents },
          { account: "CASH", side: "CREDIT", cents: invoice.amount_cents },
        ]);
        await audit(c, p, "InvoiceRefunded", invoice.id, invoice.correlation_id, {
          amountCents: invoice.amount_cents,
        });
        return { id: invoice.id, status: "REFUNDED" };
      }
      if (!("subscriptionId" in input))
        throw new DomainError(400, "UNKNOWN_COMMAND", "Unsupported billing command.");
      const sub = (
        await c.query("SELECT * FROM subscriptions WHERE organization_id=$1 AND id=$2 FOR UPDATE", [
          p.organizationId,
          input.subscriptionId,
        ])
      ).rows[0];
      if (!sub) throw new DomainError(404, "NOT_FOUND", "Subscription not found.");
      const period = (await simulationNow(c, p)).toISOString().slice(0, 7);
      const existing = (
        await c.query<InvoiceRow>(
          "SELECT * FROM invoices WHERE organization_id=$1 AND subscription_id=$2 AND period=$3",
          [p.organizationId, sub.id, period],
        )
      ).rows[0];
      if (input.action === "record_usage") {
        demand(!existing, "PERIOD_CLOSED", "This billing period is already invoiced.");
        await c.query(
          "INSERT INTO usage_records(id,organization_id,subscription_id,period,quantity) VALUES($1,$2,$3,$4,$5)",
          [input.commandId, p.organizationId, sub.id, period, input.quantity],
        );
        await audit(c, p, "UsageRecorded", sub.id, input.commandId, {
          period,
          quantity: input.quantity,
        });
        return { id: sub.id, status: "RECORDED" };
      }
      if (existing) return { id: existing.id, status: existing.status };
      const usage = (
        await c.query(
          "SELECT COALESCE(sum(quantity),0)::int AS n FROM usage_records WHERE organization_id=$1 AND subscription_id=$2 AND period=$3",
          [p.organizationId, sub.id, period],
        )
      ).rows[0].n;
      const amount = sub.base_cents + usage * sub.unit_cents;
      demand(
        Number.isSafeInteger(amount) && amount > 0 && amount <= 1000000000,
        "INVOICE_LIMIT",
        "Invoice amount exceeds supported limits.",
      );
      const id = randomUUID();
      await c.query(
        "INSERT INTO invoices(id,organization_id,subscription_id,customer_id,period,amount_cents,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id, p.organizationId, sub.id, sub.customer_id, period, amount, input.commandId],
      );
      await c.query(
        "INSERT INTO invoice_lines(organization_id,invoice_id,line_key,description,quantity,unit_cents) VALUES($1,$2,'base',$3,1,$4)",
        [p.organizationId, id, sub.plan, sub.base_cents],
      );
      if (usage > 0)
        await c.query(
          "INSERT INTO invoice_lines(organization_id,invoice_id,line_key,description,quantity,unit_cents) VALUES($1,$2,'usage','Habitat compute units',$3,$4)",
          [p.organizationId, id, usage, sub.unit_cents],
        );
      await postJournalTx(c, p, `invoice:${id}`, `Subscription invoice ${period}`, [
        { account: "AR", side: "DEBIT", cents: amount },
        { account: "REVENUE", side: "CREDIT", cents: amount },
      ]);
      await audit(c, p, "InvoiceIssued", id, input.commandId, {
        period,
        amountCents: amount,
        usage,
      });
      return { id, status: "OPEN" };
    },
    pool,
  );
}
