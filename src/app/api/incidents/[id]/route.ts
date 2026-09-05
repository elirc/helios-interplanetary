import { z } from "zod";
import { principalFromRequest, assertSameOrigin } from "@/server/identity";
import { json, readJson, route } from "@/server/http";
import { getIncident } from "@/server/queries";
import { transitionIncident } from "@/server/incidents";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return route(async () =>
    json(
      await getIncident(principalFromRequest(request), z.uuid().parse((await context.params).id)),
    ),
  );
}

export async function PATCH(request: Request, context: Context) {
  return route(async () => {
    assertSameOrigin(request);
    const principal = principalFromRequest(request);
    const id = z.uuid().parse((await context.params).id);
    const { action } = z
      .object({ action: z.enum(["acknowledge", "resolve"]) })
      .strict()
      .parse(await readJson(request));
    return json(await transitionIncident(principal, id, action));
  });
}
