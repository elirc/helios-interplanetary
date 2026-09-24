import { route, json, readJson } from "../../../server/http";
import { assertSameOrigin, principalFromRequest } from "../../../server/identity";
import { executeBilling, listInvoiceHistory } from "../../../server/billing";
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    return json(await executeBilling(principalFromRequest(request), await readJson(request)));
  });
}
export async function GET(request: Request) {
  return route(async () => {
    const principal = principalFromRequest(request);
    const url = new URL(request.url);
    const page = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);
    return json(await listInvoiceHistory(principal, page));
  });
}
