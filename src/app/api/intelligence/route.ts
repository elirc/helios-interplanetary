import { route, json, readJson } from "../../../server/http";
import { assertSameOrigin, principalFromRequest } from "../../../server/identity";
import { agentDecision, runAgent } from "../../../server/intelligence";
import { runEvaluations } from "../../../server/evaluations";
import { z } from "zod";
export async function POST(request: Request) {
  return route(async () => {
    assertSameOrigin(request);
    const p = principalFromRequest(request),
      input = await readJson(request);
    if (input?.action === "run_evaluations") {
      z.object({ action: z.literal("run_evaluations"), commandId: z.uuid() })
        .strict()
        .parse(input);
      return json(await runEvaluations(p));
    }
    return json(
      input?.action === "run_agent" ? await runAgent(p, input) : await agentDecision(p, input),
    );
  });
}
