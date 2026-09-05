import { getPool } from "@/server/db";
import { json } from "@/server/http";

export const runtime = "nodejs";
export async function GET() {
  try {
    await getPool().query("SELECT name FROM schema_migrations LIMIT 1");
    return json({ status: "ready", service: "helios", database: "connected" });
  } catch {
    return json({ status: "unavailable", service: "helios", database: "unavailable" }, 503);
  }
}
