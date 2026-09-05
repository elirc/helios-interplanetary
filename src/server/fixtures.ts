import type { Pool } from "pg";
import { transaction } from "./db";
import { audit } from "./audit";
import { PERSONAS } from "./identity";
import { FIXTURE_START, stableReadingId } from "./scenarios";
import { generateScenario } from "../domain/simulation";
import { ingestReadingTx } from "./telemetry";
import { seedEnterpriseTx } from "./enterprise-fixtures";

export async function seed(pool: Pool) {
  await transaction(pool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(741043)");
    const fixtures = [
      {
        principal: PERSONAS.controller,
        station: "station-kepler",
        name: "Kepler Station",
        location: "Lunar orbit · Earth–Moon L2",
        callsign: "KPL-01",
        asset: "pump-b17",
        runId: "10000000-0000-4000-8000-000000000001",
      },
      {
        principal: PERSONAS.observer,
        station: "station-selene",
        name: "Selene Outpost",
        location: "Moon · South pole",
        callsign: "SEL-02",
        asset: "pump-s04",
        runId: "10000000-0000-4000-8000-000000000002",
      },
    ];
    for (const fixture of fixtures) {
      const p = fixture.principal;
      await client.query(
        "INSERT INTO organizations (id,name) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [p.organizationId, p.organizationName],
      );
      await client.query(
        "INSERT INTO stations (id,organization_id,name,location,callsign) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [fixture.station, p.organizationId, fixture.name, fixture.location, fixture.callsign],
      );
      const inserted = await client.query(
        "INSERT INTO assets (id,organization_id,station_id,name,designation) VALUES ($1,$2,$3,'Primary coolant pump',$4) ON CONFLICT DO NOTHING RETURNING id",
        [
          fixture.asset,
          p.organizationId,
          fixture.station,
          fixture.asset === "pump-b17" ? "Pump B-17" : "Pump S-04",
        ],
      );
      if (!inserted.rowCount) continue;
      const readings = generateScenario("nominal", 17, new Date(FIXTURE_START), 36);
      for (const [index, reading] of readings.entries())
        await ingestReadingTx(client, p, {
          ...reading,
          id: stableReadingId(fixture.runId, index),
          assetId: fixture.asset,
          correlationId: fixture.runId,
        });
      await audit(client, p, "StationCommissioned", fixture.station, fixture.runId, {
        stationName: fixture.name,
        readingsAdded: readings.length,
        observedAt: readings.at(-1)!.observedAt,
      });
    }
    await seedEnterpriseTx(client);
  });
}

export async function resetFixtures(pool: Pool) {
  // Only used by explicit CLI reset and the isolated integration suite.
  await pool.query(
    "TRUNCATE scenario_runs,audit_events,incidents,telemetry_readings,assets,stations,organizations RESTART IDENTITY CASCADE",
  );
  await seed(pool);
}
