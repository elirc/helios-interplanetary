import { setTimeout } from "node:timers/promises";
import { getPool } from "../src/server/db";
import { PERSONAS } from "../src/server/identity";
import { processNextEvent } from "../src/server/worker";
import { tickSimulation } from "../src/server/simulation-clock";
import { processTimers } from "../src/server/timers";

const pool = getPool(),
  id = `worker-${process.pid}`;
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
try {
  do {
    let processed = 0;
    for (const persona of [PERSONAS.controller, PERSONAS.observer]) {
      const p = {
        ...persona,
        id: `worker:${persona.organizationId}`,
        name: "Helios background worker",
      };
      for (let i = 0; i < 20; i++) {
        if (!(await processNextEvent(p, pool))) break;
        processed++;
      }
      await tickSimulation(p, pool);
      await processTimers(p, pool);
    }
    await pool.query(
      "INSERT INTO worker_heartbeats(id,processed) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET seen_at=clock_timestamp(),processed=worker_heartbeats.processed+EXCLUDED.processed",
      [id, processed],
    );
    if (process.argv.includes("--once")) break;
    await setTimeout(1000);
  } while (!stopping);
} catch (error) {
  console.error(
    JSON.stringify({
      event: "worker.failed",
      type: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "Worker failed",
    }),
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
