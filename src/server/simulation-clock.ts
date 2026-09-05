import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { Principal } from "../domain/contracts";
import { energyBalance, type EnergyState } from "../domain/energy";
import { generateScenario } from "../domain/simulation";
import { audit } from "./audit";
import { getPool, transaction } from "./db";
import { idempotentCommand } from "./operations";
import { demand, simulationNow } from "./operations-common";
import { stableReadingId } from "./scenarios";
import { ingestReadingTx } from "./telemetry";

export const clockSchema = z.discriminatedUnion("action", [
  z
    .object({
      commandId: z.uuid(),
      action: z.enum([
        "pause",
        "resume",
        "solar_outage",
        "shed_load",
        "restore_load",
        "repair_solar",
      ]),
    })
    .strict(),
  z
    .object({
      commandId: z.uuid(),
      action: z.literal("advance"),
      seconds: z.number().int().min(1).max(3600),
    })
    .strict(),
  z
    .object({
      commandId: z.uuid(),
      action: z.literal("speed"),
      speed: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(60)]),
    })
    .strict(),
]);

export async function advanceClockTx(
  c: PoolClient,
  p: Principal,
  seconds: number,
  correlationId: string,
) {
  const clock = (
    await c.query<{ now_at: Date; seed: string; tick: string }>(
      "SELECT * FROM simulation_state WHERE organization_id=$1 FOR UPDATE",
      [p.organizationId],
    )
  ).rows[0];
  demand(clock, "CLOCK_MISSING", "Simulation clock has not been seeded.");
  const now = await simulationNow(c, p),
    next = new Date(now.getTime() + seconds * 1000);
  const grid = (
    await c.query<EnergyState>("SELECT * FROM energy_grids WHERE organization_id=$1 FOR UPDATE", [
      p.organizationId,
    ])
  ).rows[0];
  const result = energyBalance(grid, seconds);
  await c.query("UPDATE energy_grids SET battery_kwh=$2,updated_at=$3 WHERE organization_id=$1", [
    p.organizationId,
    result.batteryKwh,
    next,
  ]);
  await c.query(
    "INSERT INTO energy_readings(id,organization_id,observed_at,generation_kw,demand_kw,battery_kwh,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      randomUUID(),
      p.organizationId,
      next,
      result.generationKw,
      result.demandKw,
      result.batteryKwh,
      correlationId,
    ],
  );
  await c.query(
    "UPDATE projects SET status=CASE WHEN completed_units>=target_units THEN 'COMPLETE' WHEN $2 THEN 'BLOCKED_ENERGY' ELSE 'ACTIVE' END,completed_units=LEAST(target_units,completed_units+CASE WHEN $2 THEN 0 ELSE rate_per_hour*$3/3600.0 END) WHERE organization_id=$1",
    [p.organizationId, grid.load_shed || result.unservedKw > 0, seconds],
  );
  const assets = (
    await c.query<{ id: string; status: string; last_observed_at: Date }>(
      "SELECT id,status,last_observed_at FROM assets WHERE organization_id=$1 ORDER BY id FOR UPDATE",
      [p.organizationId],
    )
  ).rows;
  for (const [i, asset] of assets.entries()) {
    const sample = generateScenario(
      asset.status === "NOMINAL" ? "nominal" : "degradation",
      (Number(clock.seed) + Number(clock.tick)) >>> 0,
      now,
    ).at(-1)!;
    // The explicit step represents one sampled endpoint, not every skipped sensor interval.
    await ingestReadingTx(c, p, {
      ...sample,
      observedAt: new Date(
        Math.max(next.getTime(), asset.last_observed_at?.getTime() + 1 || 0),
      ).toISOString(),
      id: stableReadingId(correlationId, i),
      assetId: asset.id,
      correlationId,
    });
  }
  await c.query(
    "UPDATE simulation_state SET now_at=$2,tick=tick+1,wall_tick_at=clock_timestamp() WHERE organization_id=$1",
    [p.organizationId, next],
  );
  await audit(c, p, "SimulationAdvanced", p.organizationId, correlationId, {
    seconds,
    now: next.toISOString(),
    energy: result,
  });
  return { id: p.organizationId, status: "ADVANCED", now: next.toISOString(), energy: result };
}

export async function executeClock(p: Principal, raw: unknown, pool: Pool = getPool()) {
  const input = clockSchema.parse(raw);
  return idempotentCommand(
    p,
    input,
    async (c) => {
      await c.query(
        "SELECT organization_id FROM simulation_state WHERE organization_id=$1 FOR UPDATE",
        [p.organizationId],
      );
      if (input.action === "advance") return advanceClockTx(c, p, input.seconds, input.commandId);
      if (input.action === "pause" || input.action === "resume")
        await c.query(
          "UPDATE simulation_state SET paused=$2,wall_tick_at=clock_timestamp() WHERE organization_id=$1",
          [p.organizationId, input.action === "pause"],
        );
      else if (input.action === "speed")
        await c.query(
          "UPDATE simulation_state SET speed=$2,wall_tick_at=clock_timestamp() WHERE organization_id=$1",
          [p.organizationId, input.speed],
        );
      else {
        const grid = (
          await c.query<EnergyState>(
            "SELECT * FROM energy_grids WHERE organization_id=$1 FOR UPDATE",
            [p.organizationId],
          )
        ).rows[0];
        if (input.action === "solar_outage")
          await c.query(
            "UPDATE energy_grids SET outage=true,repair_status='PLANNED' WHERE organization_id=$1",
            [p.organizationId],
          );
        if (input.action === "shed_load")
          await c.query("UPDATE energy_grids SET load_shed=true WHERE organization_id=$1", [
            p.organizationId,
          ]);
        if (input.action === "restore_load") {
          demand(
            !grid.outage,
            "SOLAR_REPAIR_REQUIRED",
            "Restore generation before returning industrial loads.",
          );
          await c.query("UPDATE energy_grids SET load_shed=false WHERE organization_id=$1", [
            p.organizationId,
          ]);
        }
        if (input.action === "repair_solar") {
          demand(grid.outage, "NO_OUTAGE", "No solar repair is pending.");
          demand(
            grid.load_shed,
            "ISOLATION_REQUIRED",
            "Shed industrial load before isolating the damaged array.",
          );
          await c.query(
            "UPDATE energy_grids SET outage=false,repair_status='REPAIRED' WHERE organization_id=$1",
            [p.organizationId],
          );
        }
        await c.query(
          "UPDATE projects SET status=CASE WHEN completed_units>=target_units THEN 'COMPLETE' WHEN (SELECT load_shed FROM energy_grids WHERE organization_id=$1) THEN 'BLOCKED_ENERGY' ELSE 'ACTIVE' END WHERE organization_id=$1",
          [p.organizationId],
        );
      }
      await audit(c, p, "SimulationControl", p.organizationId, input.commandId, {
        action: input.action,
        ...("speed" in input ? { speed: input.speed } : {}),
      });
      return { id: p.organizationId, status: input.action.toUpperCase() };
    },
    pool,
  );
}

export async function tickSimulation(p: Principal, pool: Pool = getPool()) {
  return transaction(pool, async (c) => {
    const clock = (
      await c.query<{ paused: boolean; speed: number; elapsed: number }>(
        "SELECT paused,speed,EXTRACT(EPOCH FROM clock_timestamp()-wall_tick_at)::float AS elapsed FROM simulation_state WHERE organization_id=$1 FOR UPDATE SKIP LOCKED",
        [p.organizationId],
      )
    ).rows[0];
    if (!clock || clock.paused || clock.elapsed < 5) return false;
    // Bounded catch-up prevents an offline worker from jumping years ahead on restart.
    await advanceClockTx(c, p, Math.floor(Math.min(60, clock.elapsed)) * clock.speed, randomUUID());
    return true;
  });
}
