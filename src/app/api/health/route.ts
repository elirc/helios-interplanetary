import { getPool } from "@/server/db";
import { json } from "@/server/http";

export const runtime = "nodejs";
export async function GET() {
  try {
    const ready = await getPool().query(
      "SELECT name FROM schema_migrations WHERE name='006-observability-and-run-recovery.sql'",
    );
    if (!ready.rowCount)
      return json(
        { status: "unavailable", service: "helios", database: "migration_required" },
        503,
      );
    return json({ status: "ready", service: "helios", database: "connected" });
  } catch {
    return json({ status: "unavailable", service: "helios", database: "unavailable" }, 503);
  }
}
