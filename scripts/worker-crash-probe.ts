import assert from "node:assert/strict";
import { Pool } from "pg";
import { PERSONAS } from "../src/server/identity";
import { claimEvent, processNextEvent } from "../src/server/worker";
const url = process.env.TEST_DATABASE_URL;
assert.ok(
  url &&
    new URL(url).pathname === "/helios_test" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname),
);
const pool = new Pool({ connectionString: url });
if (process.argv.includes("--crash")) {
  const delivery = await claimEvent(PERSONAS.controller, pool, 1);
  process.stdout.write(JSON.stringify({ claimed: delivery?.id, pid: process.pid }), () =>
    process.exit(17),
  );
} else {
  try {
    console.log(JSON.stringify(await processNextEvent(PERSONAS.controller, pool)));
  } finally {
    await pool.end();
  }
}
