import { principalFromRequest } from "@/server/identity";
import { json, route } from "@/server/http";
import { getSnapshot } from "@/server/queries";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return route(async () => json(await getSnapshot(principalFromRequest(request))));
}
