import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import type { Principal } from "../domain/contracts";
import {
  fixtureRecommendation,
  validateRecommendation,
  type AgentContext,
} from "../domain/intelligence";
import type { SourceChunk } from "../domain/knowledge";
import { operationSchema } from "../domain/operations";
import { toolTx, type ToolName } from "./agent-tools";
import { audit } from "./audit";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";
import { requireOperator } from "./identity";
import { callOpenAI, PROMPT_VERSION, providerConfig } from "./model-gateway";
import { idempotentCommand, operationTx } from "./operations";
import { demand } from "./operations-common";

export const runAgentSchema = z
  .object({
    commandId: z.uuid(),
    action: z.literal("run_agent"),
    agent: z.enum(["diagnostic", "summary", "procurement", "support"]),
    incidentId: z.uuid().optional(),
    exercise: z.enum(["normal", "unsafe", "malformed", "provider_failure"]).default("normal"),
  })
  .strict();

export async function runAgent(
  p: Principal,
  raw: unknown,
  pool: Pool = getPool(),
): Promise<{ id: string; status: string; replayed?: boolean; message?: string }> {
  requireOperator(p);
  const input = runAgentSchema.parse(raw),
    config =
      input.exercise === "normal"
        ? providerConfig()
        : { provider: "fixture", model: "controlled-failure-v1" };
  const started = Date.now(),
    runId = input.commandId;
  const created = await idempotentCommand(
    p,
    input,
    async (c) => {
      if (
        input.incidentId &&
        !(
          await c.query("SELECT id FROM incidents WHERE organization_id=$1 AND id=$2", [
            p.organizationId,
            input.incidentId,
          ])
        ).rowCount
      )
        throw new DomainError(404, "NOT_FOUND", "Incident not found.");
      await c.query(
        "INSERT INTO agent_runs(id,organization_id,agent,provider,model,prompt_version,status,requested_by,incident_id,input) VALUES($1,$2,$3,$4,$5,$6,'RUNNING',$7,$8,$9)",
        [
          runId,
          p.organizationId,
          input.agent,
          config.provider,
          config.model,
          PROMPT_VERSION,
          p.id,
          input.incidentId ?? null,
          JSON.stringify(input),
        ],
      );
      return { id: runId, status: "RUNNING" };
    },
    pool,
  );
  if (created.replayed) {
    const run = (
      await pool.query("SELECT status FROM agent_runs WHERE organization_id=$1 AND id=$2", [
        p.organizationId,
        runId,
      ])
    ).rows[0];
    return { id: runId, status: run.status, replayed: true };
  }
  let ordinal = 0;
  let phase = "tool";
  const currentStatus = async () =>
    (
      await pool.query<{ status: string }>(
        "SELECT status FROM agent_runs WHERE organization_id=$1 AND id=$2",
        [p.organizationId, runId],
      )
    ).rows[0].status;
  async function step(name: string, kind: string, args: unknown, work: () => Promise<unknown>) {
    demand((await currentStatus()) === "RUNNING", "RUN_STOPPED", "This run has already stopped.");
    phase = kind;
    const n = ++ordinal,
      time = Date.now();
    demand(n <= 8, "STEP_BUDGET", "Agent exceeded its eight-step limit.");
    await pool.query(
      "INSERT INTO agent_steps(id,organization_id,run_id,ordinal,name,kind,input,status,duration_ms) VALUES($1,$2,$3,$4,$5,$6,$7,'RUNNING',0)",
      [randomUUID(), p.organizationId, runId, n, name, kind, JSON.stringify(args)],
    );
    try {
      const output = await work();
      await pool.query(
        "UPDATE agent_steps SET status='SUCCEEDED',output=$4,duration_ms=$5 WHERE organization_id=$1 AND run_id=$2 AND ordinal=$3",
        [p.organizationId, runId, n, JSON.stringify(output), Date.now() - time],
      );
      return output;
    } catch (error) {
      await pool.query(
        "UPDATE agent_steps SET status='FAILED',output=$4,duration_ms=$5 WHERE organization_id=$1 AND run_id=$2 AND ordinal=$3",
        [
          p.organizationId,
          runId,
          n,
          JSON.stringify({ error: error instanceof Error ? error.message : "Step failed" }),
          Date.now() - time,
        ],
      );
      throw error;
    }
  }
  try {
    const asset = (
      await pool.query<{ id: string; status: string }>(
        input.incidentId
          ? "SELECT a.id,a.status FROM assets a JOIN incidents i ON i.organization_id=a.organization_id AND i.asset_id=a.id WHERE i.organization_id=$1 AND i.id=$2"
          : "SELECT id,status FROM assets WHERE organization_id=$1 ORDER BY id LIMIT 1",
        input.incidentId ? [p.organizationId, input.incidentId] : [p.organizationId],
      )
    ).rows[0];
    demand(asset, "ASSET_MISSING", "No asset is available for diagnosis.");
    const work = (
      await pool.query<{ id: string }>(
        "SELECT id FROM work_orders WHERE organization_id=$1 AND incident_id=$2",
        [p.organizationId, input.incidentId ?? null],
      )
    ).rows[0];
    const query =
      input.agent === "procurement"
        ? "procurement budget inventory shortage"
        : input.agent === "support"
          ? "payment timeout reconciliation"
          : input.agent === "summary"
            ? "coolant repair verification"
            : "coolant pump pressure vibration inspection";
    const context: AgentContext = {
      agent: input.agent,
      incidentId: input.incidentId ?? null,
      workOrderId: work?.id ?? null,
      assetStatus: asset.status,
      evidence: {},
      sources: [],
    };
    const calls: [ToolName, Record<string, string>][] = [
      ["get_asset_details", { assetId: asset.id }],
      ["get_sensor_history", { assetId: asset.id }],
      ["get_maintenance_history", { assetId: asset.id }],
      ["check_inventory", { sku: "PUMP-B17" }],
      ["search_procedure_manual", { query }],
    ];
    if (input.agent === "support") calls.splice(0, 4, ["get_customer_context", {}]);
    if (input.agent === "summary" && input.incidentId)
      calls.splice(0, 2, ["get_incident_timeline", { incidentId: input.incidentId }]);
    for (const [name, args] of calls) {
      const result = await step(name, "tool", args, () =>
        transaction(pool, (c) => toolTx(c, p, name, args)),
      );
      if (name === "search_procedure_manual") context.sources = result as SourceChunk[];
      else context.evidence[name] = result;
    }
    let inputTokens: number | null = null,
      outputTokens: number | null = null;
    const rawOutput = await step(
      "model_gateway",
      "model",
      { provider: config.provider, model: config.model, promptVersion: PROMPT_VERSION },
      async () => {
        if (input.exercise === "provider_failure")
          throw new DomainError(502, "PROVIDER_FAILED", "Controlled provider timeout fixture.");
        if (input.exercise === "malformed") return { summary: 42 };
        if (input.exercise === "unsafe")
          return {
            ...fixtureRecommendation(context),
            proposedAction: "disable_safety_interlocks",
            confidence: 1,
          };
        if (config.provider === "openai") {
          const result = await callOpenAI(context);
          inputTokens = result.inputTokens;
          outputTokens = result.outputTokens;
          return result.output;
        }
        return fixtureRecommendation(context);
      },
    );
    const output = await step(
      "validate_sources_and_policy",
      "policy",
      {
        allowedActions: ["create_work_order", "request_purchase", "none"],
        sourceIds: context.sources.map((s) => s.id),
      },
      async () => validateRecommendation(rawOutput, context),
    );
    const checked = validateRecommendation(output, context);
    return await transaction(pool, async (c) => {
      const updated = await c.query(
        "UPDATE agent_runs SET status='SUCCEEDED',output=$3,finished_at=clock_timestamp(),duration_ms=$4,input_tokens=$5,output_tokens=$6 WHERE organization_id=$1 AND id=$2 AND status='RUNNING' RETURNING id",
        [
          p.organizationId,
          runId,
          JSON.stringify(checked),
          Date.now() - started,
          inputTokens,
          outputTokens,
        ],
      );
      if (!updated.rowCount) {
        const stopped = (
          await c.query<{ status: string }>(
            "SELECT status FROM agent_runs WHERE organization_id=$1 AND id=$2",
            [p.organizationId, runId],
          )
        ).rows[0];
        return { id: runId, status: stopped.status };
      }
      if (checked.proposedAction !== "none") {
        const id = randomUUID();
        const action =
          checked.proposedAction === "create_work_order"
            ? { commandId: id, action: "create_work_order", incidentId: context.incidentId }
            : { commandId: id, action: "request_purchase", workOrderId: context.workOrderId };
        await c.query(
          "INSERT INTO agent_approvals(id,organization_id,run_id,action) VALUES($1,$2,$3,$4)",
          [id, p.organizationId, runId, JSON.stringify(action)],
        );
      }
      await audit(c, p, "AgentRunCompleted", runId, runId, {
        agent: input.agent,
        provider: config.provider,
        proposedAction: checked.proposedAction,
        incidentId: context.incidentId,
      });
      return {
        id: runId,
        status: "SUCCEEDED",
        message:
          checked.proposedAction === "none"
            ? "Recommendation recorded with source evidence."
            : "Proposal recorded. Human approval is required before the domain action executes.",
      };
    });
  } catch (error) {
    const status = phase === "policy" ? "BLOCKED" : "FAILED";
    const message =
      error instanceof z.ZodError
        ? "Model output failed the structured recommendation contract."
        : error instanceof Error
          ? error.message
          : "Agent failed.";
    const terminal = await transaction(pool, async (c) => {
      const updated = await c.query(
        "UPDATE agent_runs SET status=$3,error=$4,finished_at=clock_timestamp(),duration_ms=$5 WHERE organization_id=$1 AND id=$2 AND status='RUNNING'",
        [p.organizationId, runId, status, message.slice(0, 1000), Date.now() - started],
      );
      if (!updated.rowCount) return null;
      await audit(c, p, "AgentRunBlocked", runId, runId, {
        status,
        reason: message.slice(0, 300),
        exercise: input.exercise,
      });
      return status;
    });
    return { id: runId, status: terminal ?? (await currentStatus()), message };
  }
}

const decisionSchema = z
  .object({
    commandId: z.uuid(),
    action: z.enum(["approve_agent_action", "reject_agent_action", "cancel_agent_run"]),
    id: z.uuid(),
  })
  .strict();
export async function agentDecision(p: Principal, raw: unknown, pool: Pool = getPool()) {
  const input = decisionSchema.parse(raw);
  demand(
    !p.id.startsWith("agent:") && !p.id.startsWith("worker:"),
    "HUMAN_REQUIRED",
    "A human operator must decide this proposal.",
  );
  return idempotentCommand(
    p,
    input,
    async (c) => {
      if (input.action === "cancel_agent_run") {
        const row = await c.query(
          "UPDATE agent_runs SET status='CANCELLED',finished_at=clock_timestamp() WHERE organization_id=$1 AND id=$2 AND status='RUNNING' RETURNING id",
          [p.organizationId, input.id],
        );
        demand(row.rowCount, "NOT_RUNNING", "This run is no longer running.");
        await audit(c, p, "AgentRunCancelled", input.id, input.commandId, {});
        return { id: input.id, status: "CANCELLED" };
      }
      const proposal = (
        await c.query<{ action: unknown; status: string; result: object; run_id: string }>(
          "SELECT action,status,result,run_id FROM agent_approvals WHERE organization_id=$1 AND id=$2 FOR UPDATE",
          [p.organizationId, input.id],
        )
      ).rows[0];
      if (!proposal) throw new DomainError(404, "NOT_FOUND", "Approval not found.");
      const target = input.action === "approve_agent_action" ? "APPROVED" : "REJECTED";
      if (proposal.status === target) return { id: input.id, status: target };
      demand(
        proposal.status === "PENDING",
        "ALREADY_DECIDED",
        "This proposal was already decided.",
      );
      const boundAction = operationSchema.parse(proposal.action);
      if (target === "APPROVED") {
        const valid = (
          await c.query(
            "SELECT id FROM agent_approvals WHERE organization_id=$1 AND id=$2 AND expires_at>clock_timestamp()",
            [p.organizationId, input.id],
          )
        ).rowCount;
        demand(valid, "APPROVAL_EXPIRED", "This proposal expired; run a fresh analysis.");
        if (boundAction.action === "create_work_order") {
          const asset = (
            await c.query<{ status: string }>(
              "SELECT a.status FROM assets a JOIN incidents i ON i.organization_id=a.organization_id AND i.asset_id=a.id WHERE i.organization_id=$1 AND i.id=$2 FOR UPDATE OF a",
              [p.organizationId, boundAction.incidentId],
            )
          ).rows[0];
          demand(
            asset?.status === "DEGRADED",
            "PROPOSAL_STALE",
            "The asset state changed; run a fresh analysis before approving maintenance.",
          );
        }
      }
      // Re-run the real domain transition and its current-state checks inside the approval transaction.
      const result = target === "APPROVED" ? await operationTx(c, p, boundAction) : null;
      await c.query(
        "UPDATE agent_approvals SET status=$3,decided_by=$4,decided_at=clock_timestamp(),result=$5 WHERE organization_id=$1 AND id=$2",
        [p.organizationId, input.id, target, p.id, JSON.stringify(result)],
      );
      await audit(c, p, "AgentProposalDecided", input.id, proposal.run_id, {
        decision: target,
        action: proposal.action,
        result,
      });
      return { id: input.id, status: target };
    },
    pool,
  );
}
