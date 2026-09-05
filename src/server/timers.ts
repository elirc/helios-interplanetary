import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Principal } from "../domain/contracts";
import { getPool, transaction } from "./db";
import { audit } from "./audit";
export async function processTimers(p: Principal, pool: Pool = getPool()) {
  return transaction(pool, async (c) => {
    const due = (
      await c.query(
        "SELECT id,resource_id FROM workflow_instances WHERE organization_id=$1 AND status='PENDING_APPROVAL' AND due_at<clock_timestamp() AND escalated_at IS NULL FOR UPDATE SKIP LOCKED",
        [p.organizationId],
      )
    ).rows;
    for (const workflow of due) {
      await c.query(
        "UPDATE workflow_instances SET escalated_at=clock_timestamp(),history=history||jsonb_build_array(jsonb_build_object('type','ApprovalEscalated','occurredAt',clock_timestamp())) WHERE organization_id=$1 AND id=$2",
        [p.organizationId, workflow.id],
      );
      await audit(c, p, "ApprovalEscalated", workflow.resource_id, randomUUID(), {
        workflowId: workflow.id,
      });
    }
    const expired = (
      await c.query(
        "UPDATE agent_runs SET status='FAILED',error='Execution interrupted or exceeded its two-minute recovery deadline.',finished_at=clock_timestamp() WHERE organization_id=$1 AND status='RUNNING' AND started_at<clock_timestamp()-interval '2 minutes' RETURNING id",
        [p.organizationId],
      )
    ).rows;
    for (const run of expired)
      await audit(c, p, "AgentRunRecovered", run.id, run.id, {
        status: "FAILED",
        reason: "interrupted_or_timed_out",
      });
    await c.query(
      "DELETE FROM request_spans WHERE organization_id=$1 AND started_at<clock_timestamp()-interval '7 days'",
      [p.organizationId],
    );
    return { escalated: due.length, recovered: expired.length };
  });
}
