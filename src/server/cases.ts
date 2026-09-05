import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import type { Principal } from "../domain/contracts";
import { audit } from "./audit";
import { getPool } from "./db";
import { DomainError } from "./errors";
import { idempotentCommand } from "./operations";
import { demand } from "./operations-common";

const schema = z.discriminatedUnion("action", [
  z.object({ commandId: z.uuid(), action: z.literal("inject_security_campaign") }).strict(),
  z
    .object({
      commandId: z.uuid(),
      action: z.enum(["investigate_security", "investigate_ticket"]),
      id: z.uuid(),
    })
    .strict(),
  z
    .object({
      commandId: z.uuid(),
      action: z.enum(["resolve_security", "resolve_ticket"]),
      id: z.uuid(),
      finding: z.string().trim().min(12).max(1000),
    })
    .strict(),
]);
export async function executeCase(p: Principal, raw: unknown, pool: Pool = getPool()) {
  const input = schema.parse(raw);
  return idempotentCommand(
    p,
    input,
    async (c) => {
      if (input.action === "inject_security_campaign") {
        const id = randomUUID(),
          signals = Array.from({ length: 8 }, (_, i) => ({
            sequence: i + 1,
            result: "ACCESS_DENIED",
            source: "simulated-access-probe",
            resource: i % 2 ? "inventory" : "incident",
            simulated: true,
          }));
        await c.query(
          "INSERT INTO security_investigations(id,organization_id,title,signals,correlation_id) VALUES($1,$2,'Repeated denied access · controlled exercise',$3,$4)",
          [id, p.organizationId, JSON.stringify(signals), input.commandId],
        );
        await audit(c, p, "SecurityInvestigationOpened", id, input.commandId, {
          signalCount: signals.length,
          simulated: true,
        });
        return { id, status: "OPEN" };
      }
      const security = input.action.endsWith("security"),
        resolve = input.action.startsWith("resolve"),
        table = security ? "security_investigations" : "support_tickets";
      const row = (
        await c.query<{ status: string; correlation_id: string; invoice_id?: string }>(
          `SELECT * FROM ${table} WHERE organization_id=$1 AND id=$2 FOR UPDATE`,
          [p.organizationId, input.id],
        )
      ).rows[0];
      if (!row) throw new DomainError(404, "NOT_FOUND", "Case not found.");
      const status = resolve ? "RESOLVED" : "INVESTIGATING";
      if (row.status === status) return { id: input.id, status };
      demand(
        row.status !== "RESOLVED",
        "INVALID_TRANSITION",
        "Resolved cases cannot return to investigation.",
      );
      if (resolve) {
        demand(
          row.status === "INVESTIGATING",
          "INVESTIGATION_REQUIRED",
          "Begin investigation before recording a resolution.",
        );
        if (!security && row.invoice_id) {
          const invoice = (
            await c.query("SELECT status FROM invoices WHERE organization_id=$1 AND id=$2", [
              p.organizationId,
              row.invoice_id,
            ])
          ).rows[0];
          demand(
            ["PAID", "REFUNDED"].includes(invoice.status),
            "PAYMENT_UNRESOLVED",
            "Reconcile the payment before closing its support case.",
          );
        }
        await c.query(
          `UPDATE ${table} SET status=$3,${security ? "finding" : "resolution"}=$4${security ? ",resolved_by=$5" : ""} WHERE organization_id=$1 AND id=$2`,
          security
            ? [p.organizationId, input.id, status, "finding" in input ? input.finding : "", p.id]
            : [p.organizationId, input.id, status, "finding" in input ? input.finding : ""],
        );
      } else
        await c.query(`UPDATE ${table} SET status=$3 WHERE organization_id=$1 AND id=$2`, [
          p.organizationId,
          input.id,
          status,
        ]);
      await audit(
        c,
        p,
        security ? "SecurityInvestigationUpdated" : "SupportTicketUpdated",
        input.id,
        row.correlation_id,
        { status, ...("finding" in input ? { finding: input.finding } : {}) },
      );
      return { id: input.id, status };
    },
    pool,
  );
}
