import type { Pool, PoolClient } from "pg";
import type { AuditEvent, Incident, Principal, Reading, Snapshot } from "../domain/contracts";
import { getPool, transaction } from "./db";
import { DomainError } from "./errors";

const incidentJson = `jsonb_build_object('id',id,'number',number,'assetId',asset_id,'title',title,'severity',severity,'status',status,'openedAt',opened_at,'acknowledgedAt',acknowledged_at,'resolvedAt',resolved_at,'triggerReadingId',trigger_reading_id,'correlationId',correlation_id)`;
const eventJson = `jsonb_build_object('id',id,'actorId',actor_id,'action',action,'resourceId',resource_id,'correlationId',correlation_id,'occurredAt',occurred_at,'details',details)`;
const readingJson = `jsonb_build_object('id',id,'observedAt',observed_at,'pressureBar',pressure_bar,'vibrationMms',vibration_mms,'temperatureC',temperature_c,'applied',applied,'breached',breached,'correlationId',correlation_id,'incidentId',incident_id)`;

async function incidentById(client: PoolClient, principal: Principal, id: string) {
  const result = await client.query<{ data: Incident }>(
    `SELECT ${incidentJson} AS data FROM incidents WHERE organization_id=$1 AND id=$2`,
    [principal.organizationId, id],
  );
  if (!result.rows[0]) throw new DomainError(404, "NOT_FOUND", "Incident not found.");
  return result.rows[0].data;
}

export async function getIncident(principal: Principal, id: string, pool: Pool = getPool()) {
  return transaction(pool, async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const incident = await incidentById(client, principal, id);
    const trigger = await client.query<{ data: Reading }>(
      `SELECT ${readingJson} AS data FROM telemetry_readings WHERE organization_id=$1 AND id=$2`,
      [principal.organizationId, incident.triggerReadingId],
    );
    const events = await client.query<{ data: AuditEvent }>(
      `SELECT ${eventJson} AS data FROM audit_events WHERE organization_id=$1 AND (resource_id=$2 OR details->>'incidentId'=$2) ORDER BY occurred_at DESC, id LIMIT 100`,
      [principal.organizationId, id],
    );
    return { incident, trigger: trigger.rows[0].data, events: events.rows.map((row) => row.data) };
  });
}

export async function getSnapshot(principal: Principal, pool: Pool = getPool()): Promise<Snapshot> {
  return transaction(pool, async (client) => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const context = await client.query<{ station: Snapshot["station"]; asset: Snapshot["asset"] }>(
      `SELECT jsonb_build_object('id',s.id,'name',s.name,'location',s.location,'callsign',s.callsign) AS station,
       jsonb_build_object('id',a.id,'name',a.name,'designation',a.designation,'status',a.status,'lastObservedAt',a.last_observed_at) AS asset
       FROM assets a JOIN stations s ON s.id=a.station_id AND s.organization_id=a.organization_id
       WHERE a.organization_id=$1 ORDER BY a.id LIMIT 1`,
      [principal.organizationId],
    );
    if (!context.rows[0])
      throw new DomainError(503, "FIXTURES_MISSING", "No station available. Run npm run db:seed.");
    const { station, asset } = context.rows[0];
    const readings = await client.query<{ data: Reading }>(
      `SELECT ${readingJson} AS data FROM telemetry_readings WHERE organization_id=$1 AND asset_id=$2 ORDER BY observed_at DESC, applied DESC, received_at DESC LIMIT 60`,
      [principal.organizationId, asset.id],
    );
    const incidents = await client.query<{ data: Incident }>(
      `SELECT ${incidentJson} AS data FROM incidents WHERE organization_id=$1 AND asset_id=$2 ORDER BY (status <> 'RESOLVED') DESC, opened_at DESC LIMIT 20`,
      [principal.organizationId, asset.id],
    );
    const events = await client.query<{ data: AuditEvent }>(
      `SELECT ${eventJson} AS data FROM audit_events WHERE organization_id=$1 AND action <> 'TelemetryRecorded' ORDER BY occurred_at DESC, id LIMIT 12`,
      [principal.organizationId],
    );
    const counts = await client.query<{
      totalReadings: number;
      activeIncidents: number;
      scenarioRuns: number;
    }>(
      `SELECT (SELECT count(*)::int FROM telemetry_readings WHERE organization_id=$1 AND asset_id=$2) AS "totalReadings",
       (SELECT count(*)::int FROM incidents WHERE organization_id=$1 AND asset_id=$2 AND status <> 'RESOLVED') AS "activeIncidents",
       (SELECT count(*)::int FROM scenario_runs WHERE organization_id=$1 AND asset_id=$2) AS "scenarioRuns"`,
      [principal.organizationId, asset.id],
    );
    return {
      operator: principal,
      station,
      asset,
      readings: readings.rows.map((row) => row.data).reverse(),
      incidents: incidents.rows.map((row) => row.data),
      events: events.rows.map((row) => row.data),
      stats: counts.rows[0],
      fetchedAt: new Date().toISOString(),
    };
  });
}
