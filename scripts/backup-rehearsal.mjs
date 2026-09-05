import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
const exec = promisify(execFile),
  probe = "helios_restore_probe";
async function docker(...args) {
  return (await exec("docker", args, { maxBuffer: 8 * 1024 * 1024 })).stdout.trim();
}
const db = (...args) => docker("compose", "exec", "-T", "postgres", ...args);
const sql =
  "SELECT json_build_object('organizations',(SELECT count(*) FROM organizations),'readings',(SELECT count(*) FROM telemetry_readings),'workOrders',(SELECT count(*) FROM work_orders),'invoices',(SELECT count(*) FROM invoices),'journalEntries',(SELECT count(*) FROM journal_entries),'outbox',(SELECT count(*) FROM outbox_events))";
const exists = await db(
  "psql",
  "-U",
  "helios",
  "-d",
  "postgres",
  "-tAc",
  `SELECT 1 FROM pg_database WHERE datname='${probe}'`,
);
if (exists)
  throw new Error("Restore probe database already exists; inspect it before another rehearsal.");
const running = await db(
  "psql",
  "-U",
  "helios",
  "-d",
  "helios",
  "-tAc",
  "SELECT count(*) FROM simulation_state WHERE NOT paused",
);
if (running !== "0")
  throw new Error(
    "Pause simulation and stop background workers before a consistent comparison rehearsal.",
  );
await mkdir("artifacts", { recursive: true });
let created = false;
try {
  const before = JSON.parse(await db("psql", "-U", "helios", "-d", "helios", "-tAc", sql));
  await db("pg_dump", "-U", "helios", "-d", "helios", "-Fc", "-f", "/tmp/helios-rehearsal.dump");
  await db("createdb", "-U", "helios", probe);
  created = true;
  await db(
    "pg_restore",
    "-U",
    "helios",
    "-d",
    probe,
    "--exit-on-error",
    "/tmp/helios-rehearsal.dump",
  );
  const after = JSON.parse(await db("psql", "-U", "helios", "-d", probe, "-tAc", sql));
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("Restored counts differ; inspect concurrent domain writes and the dump.");
  const balance = await db(
    "psql",
    "-U",
    "helios",
    "-d",
    probe,
    "-tAc",
    "SELECT count(*) FROM (SELECT entry_id,sum(CASE WHEN side='DEBIT' THEN amount_cents ELSE -amount_cents END) AS net FROM journal_lines GROUP BY entry_id) b WHERE net<>0",
  );
  if (balance !== "0") throw new Error("Restored journal imbalance detected.");
  const container = await docker("compose", "ps", "-q", "postgres");
  await docker("cp", `${container}:/tmp/helios-rehearsal.dump`, "artifacts/helios-rehearsal.dump");
  const result = {
    status: "passed",
    verifiedAt: new Date().toISOString(),
    counts: after,
    unbalancedJournals: Number(balance),
    method: "pg_dump custom archive → fresh isolated database → counts and balances",
  };
  await writeFile("artifacts/backup-rehearsal.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  // This exact disposable database is created above by this invocation; production/demo databases are never dropped.
  if (created) await db("dropdb", "-U", "helios", probe);
}
