import { route, json, readJson } from "../../../server/http";
import { assertSameOrigin, principalFromRequest } from "../../../server/identity";
import { executeBilling } from "../../../server/billing";
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    return json(await executeBilling(principalFromRequest(request), await readJson(request)));
  });
}
