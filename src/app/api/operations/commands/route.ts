import { route, json, readJson } from "../../../../server/http";
import { assertSameOrigin, principalFromRequest } from "../../../../server/identity";
import { executeOperation } from "../../../../server/operations";

export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    return json(await executeOperation(principalFromRequest(request), await readJson(request)));
  });
}
