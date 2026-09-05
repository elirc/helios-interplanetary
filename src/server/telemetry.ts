import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  readingSchema,
  type ReadingInput,
  type Principal,
  type IngestResult,
} from "../domain/contracts";
import { evaluateReading } from "../domain/telemetry-rules";
import { audit } from "./audit";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";
import { requireOperator } from "./identity";

interface AssetRow {
  id: string;
  designation: string;
  last_observed_at: Date | null;
}

export async function lockAsset(client: PoolClient, principal: Principal, assetId: string) {
  const result = await client.query<AssetRow>(
    "SELECT id, designation, last_observed_at FROM assets WHERE organization_id=$1 AND id=$2 FOR UPDATE",
    [principal.organizationId, assetId],
  );
  if (!result.rows[0]) throw new DomainError(404, "NOT_FOUND", "Asset not found.");
  return result.rows[0];
}

export async function ingestReadingTx(
  client: PoolClient,
  principal: Principal,
  input: ReadingInput,
): Promise<IngestResult> {
  requireOperator(principal);
  // Every transition for this asset shares this lock, including scenario and incident commands.
  const asset = await lockAsset(client, principal, input.assetId);
  const existing = await client.query<{
    asset_id: string;
    observed_at: Date;
    pressure_bar: number;
    vibration_mms: number;
    temperature_c: number;
    incident_id: string | null;
    correlation_id: string;
  }>("SELECT * FROM telemetry_readings WHERE organization_id=$1 AND id=$2", [
    principal.organizationId,
    input.id,
  ]);
  if (existing.rows[0]) {
    const row = existing.rows[0];
    if (
      row.asset_id !== input.assetId ||
      row.observed_at.toISOString() !== new Date(input.observedAt).toISOString() ||
      row.pressure_bar !== input.pressureBar ||
      row.vibration_mms !== input.vibrationMms ||
      row.temperature_c !== input.temperatureC ||
      row.correlation_id !== input.correlationId
    ) {
      throw new DomainError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This reading ID already belongs to different data.",
      );
    }
    return {
      readingId: input.id,
      incidentId: row.incident_id,
      disposition: "duplicate",
      incidentCreated: false,
    };
  }

  const applied =
    !asset.last_observed_at ||
    new Date(input.observedAt).getTime() > asset.last_observed_at.getTime();
  const rule = evaluateReading(input);
  await client.query(
    `INSERT INTO telemetry_readings (id,organization_id,asset_id,observed_at,pressure_bar,vibration_mms,temperature_c,applied,breached,correlation_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      input.id,
      principal.organizationId,
      input.assetId,
      input.observedAt,
      input.pressureBar,
      input.vibrationMms,
      input.temperatureC,
      applied,
      rule.breached,
      input.correlationId,
    ],
  );

  let incidentId: string | null = null;
  let incidentCreated = false;
  if (applied) {
    const active = await client.query<{ id: string }>(
      "SELECT id FROM incidents WHERE organization_id=$1 AND asset_id=$2 AND status <> 'RESOLVED'",
      [principal.organizationId, input.assetId],
    );
    incidentId = active.rows[0]?.id ?? null;
    if (rule.breached && !incidentId) {
      incidentId = randomUUID();
      incidentCreated = true;
      await client.query(
        `INSERT INTO incidents (id,organization_id,asset_id,title,trigger_reading_id,correlation_id,opened_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          incidentId,
          principal.organizationId,
          input.assetId,
          `${asset.designation} · Coolant system anomaly`,
          input.id,
          input.correlationId,
          input.observedAt,
        ],
      );
      await audit(client, principal, "IncidentOpened", incidentId, input.correlationId, {
        readingId: input.id,
        assetId: input.assetId,
        reasons: rule.reasons,
        observedAt: input.observedAt,
      });
    }
    await client.query(
      "UPDATE assets SET status=$3, last_observed_at=$4 WHERE organization_id=$1 AND id=$2",
      [
        principal.organizationId,
        input.assetId,
        rule.breached ? "DEGRADED" : "NOMINAL",
        input.observedAt,
      ],
    );
    if (incidentId)
      await client.query(
        "UPDATE telemetry_readings SET incident_id=$3 WHERE organization_id=$1 AND id=$2",
        [principal.organizationId, input.id, incidentId],
      );
  }
  await audit(client, principal, "TelemetryRecorded", input.id, input.correlationId, {
    assetId: input.assetId,
    incidentId,
    observedAt: input.observedAt,
    applied,
    breached: rule.breached,
    pressureBar: input.pressureBar,
    vibrationMms: input.vibrationMms,
  });
  return {
    readingId: input.id,
    incidentId,
    disposition: applied ? "applied" : "stale",
    incidentCreated,
  };
}

export async function ingestReading(
  principal: Principal,
  rawInput: unknown,
  pool: Pool = getPool(),
) {
  const input = readingSchema.parse(rawInput);
  return transaction(pool, (client) => ingestReadingTx(client, principal, input));
}
