import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { scenarioSchema, type Principal, type ScenarioResult } from "../domain/contracts";
import { generateScenario } from "../domain/simulation";
import { audit } from "./audit";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";
import { requireOperator } from "./identity";
import { ingestReadingTx, lockAsset } from "./telemetry";

export const FIXTURE_START = "2042-03-19T14:20:00.000Z";

export function stableReadingId(runId: string, index: number) {
  const bytes = createHash("sha256").update(`${runId}:${index}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function runScenario(
  principal: Principal,
  rawInput: unknown,
  pool: Pool = getPool(),
): Promise<ScenarioResult> {
  requireOperator(principal);
  const input = scenarioSchema.parse(rawInput);
  return transaction(pool, async (client) => {
    const asset = await lockAsset(client, principal, input.assetId);
    const previous = await client.query<{
      kind: string;
      seed: string;
      asset_id: string;
      result: ScenarioResult;
    }>("SELECT kind,seed,asset_id,result FROM scenario_runs WHERE organization_id=$1 AND id=$2", [
      principal.organizationId,
      input.runId,
    ]);
    if (previous.rows[0]) {
      const row = previous.rows[0];
      if (
        row.kind !== input.kind ||
        Number(row.seed) !== input.seed ||
        row.asset_id !== input.assetId
      )
        throw new DomainError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This run ID already belongs to another scenario.",
        );
      return { ...row.result, replayed: true };
    }
    const readings = generateScenario(
      input.kind,
      input.seed,
      asset.last_observed_at ?? new Date(FIXTURE_START),
    );
    let incidentId: string | null = null;
    for (const [index, reading] of readings.entries()) {
      const result = await ingestReadingTx(client, principal, {
        ...reading,
        id: stableReadingId(input.runId, index),
        assetId: input.assetId,
        correlationId: input.runId,
      });
      incidentId = result.incidentId ?? incidentId;
    }
    const result: ScenarioResult = {
      runId: input.runId,
      kind: input.kind,
      seed: input.seed,
      readingsAdded: readings.length,
      incidentId,
      replayed: false,
    };
    await client.query(
      "INSERT INTO scenario_runs (id,organization_id,asset_id,kind,seed,result) VALUES ($1,$2,$3,$4,$5,$6)",
      [
        input.runId,
        principal.organizationId,
        input.assetId,
        input.kind,
        input.seed,
        JSON.stringify(result),
      ],
    );
    await audit(client, principal, "ScenarioCompleted", input.runId, input.runId, {
      kind: input.kind,
      seed: input.seed,
      readingsAdded: readings.length,
      assetId: input.assetId,
      incidentId,
    });
    return result;
  });
}
