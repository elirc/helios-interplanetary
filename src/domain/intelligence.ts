import { z } from "zod";
import type { SourceChunk } from "./knowledge";
export const recommendationSchema = z
  .object({
    summary: z.string().min(10).max(1800),
    recommendation: z.enum([
      "inspect_coolant",
      "plan_repair",
      "request_parts",
      "reconcile_payment",
      "summarize",
      "abstain",
    ]),
    confidence: z.number().min(0).max(1),
    citations: z.array(z.string()).max(5),
    proposedAction: z.enum(["create_work_order", "request_purchase", "none"]),
    limitation: z.string().min(10).max(600),
  })
  .strict();
export type Recommendation = z.infer<typeof recommendationSchema>;
export type AgentKind = "diagnostic" | "summary" | "procurement" | "support";
export interface AgentContext {
  agent: AgentKind;
  incidentId: string | null;
  workOrderId: string | null;
  assetStatus: string;
  evidence: Record<string, unknown>;
  sources: SourceChunk[];
}
export function validateRecommendation(raw: unknown, context: AgentContext): Recommendation {
  const result = recommendationSchema.parse(raw);
  if (result.citations.some((id) => !context.sources.some((s) => s.id === id)))
    throw new Error("Recommendation cites a source that was not retrieved.");
  if (result.recommendation !== "abstain" && result.citations.length === 0)
    throw new Error("A recommendation requires retrieved sources.");
  if (
    result.proposedAction === "create_work_order" &&
    (!context.incidentId || context.agent !== "diagnostic" || context.assetStatus !== "DEGRADED")
  )
    throw new Error("This context cannot authorize a repair proposal.");
  if (
    result.proposedAction === "request_purchase" &&
    (!context.workOrderId || context.agent !== "procurement")
  )
    throw new Error("This context cannot authorize a purchase proposal.");
  return result;
}
export function fixtureRecommendation(context: AgentContext): Recommendation {
  const sources = context.sources.slice(0, 2).map((s) => s.id),
    hasEvidence = sources.length > 0;
  const proposed =
    context.agent === "diagnostic" && context.incidentId && context.assetStatus === "DEGRADED"
      ? "create_work_order"
      : context.agent === "procurement" && context.workOrderId
        ? "request_purchase"
        : "none";
  return {
    summary:
      context.agent === "diagnostic"
        ? `The recorded asset state is ${context.assetStatus}. Review the triggering readings and inspect the coolant loop before confirming a failure mechanism.`
        : context.agent === "procurement"
          ? "Check the local reservation result, route any shortage to a purchase request, and obtain human budget approval before dispatch."
          : context.agent === "support"
            ? "Review the payment attempt and provider receipt. Preserve the idempotency key and reconcile uncertain status before retrying any charge."
            : "Review the incident timeline, completed work, and verification observation. The operational record describes a simulated recovery; it does not establish a production incident.",
    recommendation: !hasEvidence
      ? "abstain"
      : context.agent === "diagnostic"
        ? "inspect_coolant"
        : context.agent === "procurement"
          ? "request_parts"
          : context.agent === "support"
            ? "reconcile_payment"
            : "summarize",
    confidence: hasEvidence ? 0.7 : 0.1,
    citations: sources,
    proposedAction: hasEvidence ? proposed : "none",
    limitation:
      "Deterministic provider fixture. Source checks establish provenance, not factual entailment or live model quality. Physical diagnosis requires human inspection.",
  };
}
