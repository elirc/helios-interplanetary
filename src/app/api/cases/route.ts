import { route, json, readJson } from "../../../server/http";
import { assertSameOrigin, principalFromRequest } from "../../../server/identity";
import { executeCase } from "../../../server/cases";
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    return json(await executeCase(principalFromRequest(request), await readJson(request)));
  });
}
