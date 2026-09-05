import { route, json } from "../../../server/http";
import { principalFromRequest } from "../../../server/identity";
import { getHubSnapshot } from "../../../server/hub";
export async function GET(request: Request) {
  return route(async () => json(await getHubSnapshot(principalFromRequest(request))));
}
