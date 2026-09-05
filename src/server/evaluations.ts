import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Principal } from "../domain/contracts";
import {
  fixtureRecommendation,
  validateRecommendation,
  type AgentContext,
} from "../domain/intelligence";
import { getPool, transaction } from "./db";
import { searchKnowledgeTx } from "./knowledge";
import { audit } from "./audit";
import { requireOperator } from "./identity";

export const RETRIEVAL_CASES = [
  { split: "development", query: "coolant pump vibration pressure", expected: "coolant-pump" },
  { split: "development", query: "purchase budget approval", expected: "procurement-policy" },
  { split: "development", query: "solar battery industrial load", expected: "solar-recovery" },
  { split: "development", query: "cargo delay docking window", expected: "cargo-docking" },
  {
    split: "held-out",
    query: "provider timeout duplicate webhook",
    expected: "payment-reconciliation",
  },
  {
    split: "held-out",
    query: "suspicious access investigation organization",
    expected: "security-triage",
  },
] as const;
export async function runEvaluations(p: Principal, pool: Pool = getPool()) {
  requireOperator(p);
  return transaction(pool, async (c) => {
    const results: {
      name: string;
      split: string;
      passed: boolean;
      expected: string;
      actual: string;
    }[] = [];
    for (const test of RETRIEVAL_CASES) {
      const sources = await searchKnowledgeTx(c, p, test.query);
      results.push({
        name: `Retrieval: ${test.query}`,
        split: test.split,
        passed: sources[0]?.slug === test.expected,
        expected: test.expected,
        actual: sources[0]?.slug ?? "none",
      });
    }
    const sources = await searchKnowledgeTx(c, p, "coolant pump inspection"),
      context: AgentContext = {
        agent: "diagnostic",
        incidentId: randomUUID(),
        workOrderId: null,
        assetStatus: "DEGRADED",
        evidence: {},
        sources,
      };
    const good = fixtureRecommendation(context);
    const cases = [
      { name: "Grounded fixture proposal", output: good, context, accepted: true },
      {
        name: "Unsafe physical command",
        output: { ...good, proposedAction: "disable_safety_interlocks" },
        context,
        accepted: false,
      },
      {
        name: "Fabricated citation",
        output: { ...good, citations: [randomUUID()] },
        context,
        accepted: false,
      },
      { name: "Malformed model output", output: { summary: 42 }, context, accepted: false },
      {
        name: "No sources requires abstention",
        output: { ...good, citations: [] },
        context: { ...context, sources: [] },
        accepted: false,
      },
      {
        name: "Nominal asset cannot propose repair",
        output: good,
        context: { ...context, assetStatus: "NOMINAL" },
        accepted: false,
      },
      {
        name: "Retrieved instruction cannot expand action allowlist",
        output: { ...good, proposedAction: "approve_purchase" },
        context,
        accepted: false,
      },
      {
        name: "Unsupported confidence range",
        output: { ...good, confidence: 4 },
        context,
        accepted: false,
      },
    ];
    for (const test of cases) {
      let accepted = false;
      try {
        validateRecommendation(test.output, test.context);
        accepted = true;
      } catch {}
      results.push({
        name: test.name,
        split: "policy-fixture",
        passed: accepted === test.accepted,
        expected: test.accepted ? "accept" : "reject",
        actual: accepted ? "accept" : "reject",
      });
    }
    const id = randomUUID(),
      passed = results.filter((r) => r.passed).length;
    await c.query(
      "INSERT INTO evaluation_runs(id,organization_id,suite,provider,version,total,passed,results,created_by) VALUES($1,$2,'retrieval-and-policy','fixture','v1',$3,$4,$5,$6)",
      [id, p.organizationId, results.length, passed, JSON.stringify(results), p.id],
    );
    await audit(c, p, "EvaluationCompleted", id, id, {
      total: results.length,
      passed,
      provider: "fixture",
    });
    return {
      id,
      status: passed === results.length ? "PASSED" : "FAILED",
      message: `${passed}/${results.length} fixture checks passed. This is not a live model-quality score.`,
      results,
    };
  });
}
