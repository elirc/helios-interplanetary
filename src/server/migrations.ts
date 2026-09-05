import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool } from "pg";
import { transaction } from "./db";

export async function migrate(pool: Pool) {
  const directory = join(process.cwd(), "db", "migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  await transaction(pool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(741042)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const file of files) {
      const sql = await readFile(join(directory, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = await client.query<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE name=$1",
        [file],
      );
      if (previous.rows[0]) {
        if (previous.rows[0].checksum !== checksum)
          throw new Error(`Applied migration ${file} changed. Add a new migration instead.`);
        continue;
      }
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name,checksum) VALUES ($1,$2)", [
        file,
        checksum,
      ]);
    }
  });
}
