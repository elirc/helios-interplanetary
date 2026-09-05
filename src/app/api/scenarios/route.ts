import { assertSameOrigin, principalFromRequest } from "@/server/identity";
import { json, readJson, route } from "@/server/http";
import { runScenario } from "@/server/scenarios";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    const result = await runScenario(principalFromRequest(request), await readJson(request));
    return json(result, result.replayed ? 200 : 201);
  });
}
