import { route, json, readJson } from "../../../server/http";
import { assertSameOrigin, principalFromRequest } from "../../../server/identity";
import { executeClock } from "../../../server/simulation-clock";
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    return json(await executeClock(principalFromRequest(request), await readJson(request)));
  });
}
