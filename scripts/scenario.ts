import { randomUUID } from "node:crypto";
import { getPool } from "../src/server/db";
import { PERSONAS } from "../src/server/identity";
import { runScenario } from "../src/server/scenarios";

const pool = getPool();
try {
  const result = await runScenario(
    PERSONAS.controller,
    {
      kind: process.argv[2] || "degradation",
      seed: Number(process.argv[3] ?? 17),
      runId: process.argv[4] || randomUUID(),
      assetId: "pump-b17",
    },
    pool,
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}
