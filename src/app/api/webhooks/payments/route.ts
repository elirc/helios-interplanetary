import { route, json, readJson } from "../../../../server/http";
import { assertLocalRequest } from "../../../../server/identity";
import { receiveWebhook } from "../../../../server/billing";
export async function POST(request: Request) {
  return route(async () => {
    assertLocalRequest(request);
    return json(
      await receiveWebhook(
        await readJson(request),
        request.headers.get("x-helios-signature") ?? "",
        Number(request.headers.get("x-helios-timestamp")),
      ),
    );
  });
}
