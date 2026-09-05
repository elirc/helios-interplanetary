import { route, json, readJson } from "../../../server/http";
import { assertSameOrigin, principalFromRequest } from "../../../server/identity";
import { documentCommand, searchKnowledge } from "../../../server/knowledge";
export async function GET(request: Request) {
  return route(async () =>
    json({
      sources: await searchKnowledge(
        principalFromRequest(request),
        new URL(request.url).searchParams.get("q") ?? "coolant pump",
      ),
    }),
  );
}
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    return json(await documentCommand(principalFromRequest(request), await readJson(request)));
  });
}
