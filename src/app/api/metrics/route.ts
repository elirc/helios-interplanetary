import { NextResponse } from "next/server";
import { route } from "../../../server/http";
import { principalFromRequest } from "../../../server/identity";
import { getPool } from "../../../server/db";
export async function GET(request: Request) {
  return route(async () => {
    const p = principalFromRequest(request),
      pool = getPool();
    const row = (
      await pool.query(
        "SELECT count(*)::int AS samples,count(*) FILTER(WHERE status_code>=500)::int AS errors,COALESCE(percentile_cont(.95) WITHIN GROUP(ORDER BY duration_ms),0) AS p95 FROM request_spans WHERE organization_id=$1 AND started_at>clock_timestamp()-interval '1 hour'",
        [p.organizationId],
      )
    ).rows[0];
    const queue = (
      await pool.query(
        "SELECT status,count(*)::int AS n FROM outbox_events WHERE organization_id=$1 GROUP BY status",
        [p.organizationId],
      )
    ).rows;
    const body =
      [
        "# TYPE helios_request_samples gauge",
        `helios_request_samples ${row.samples}`,
        "# TYPE helios_request_server_errors gauge",
        `helios_request_server_errors ${row.errors}`,
        "# TYPE helios_request_p95_ms gauge",
        `helios_request_p95_ms ${row.p95}`,
        "# TYPE helios_outbox_events gauge",
        ...queue.map((q) => `helios_outbox_events{status="${q.status}"} ${q.n}`),
      ].join("\n") + "\n";
    return new NextResponse(body, {
      headers: { "Content-Type": "text/plain; version=0.0.4", "Cache-Control": "no-store" },
    });
  });
}
