import { assertSameOrigin, principalFromRequest } from "@/server/identity";
import { json, readJson, route } from "@/server/http";
import { ingestReading } from "@/server/telemetry";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    const principal = principalFromRequest(request);
    const result = await ingestReading(principal, await readJson(request));
    return json(result, result.disposition === "duplicate" ? 200 : 201);
  });
}
