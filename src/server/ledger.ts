import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Principal } from "../domain/contracts";
import { demand } from "./operations-common";
export interface JournalLine {
  account: string;
  side: "DEBIT" | "CREDIT";
  cents: number;
}
export function assertBalanced(lines: JournalLine[]) {
  demand(
    lines.length >= 2 && lines.every((l) => Number.isSafeInteger(l.cents) && l.cents > 0),
    "INVALID_JOURNAL",
    "Journal lines require positive integer cents.",
  );
  const net = lines.reduce((sum, l) => sum + (l.side === "DEBIT" ? l.cents : -l.cents), 0);
  demand(net === 0, "UNBALANCED_JOURNAL", "Debits must equal credits.");
}
export async function postJournalTx(
  c: PoolClient,
  p: Principal,
  reference: string,
  description: string,
  lines: JournalLine[],
) {
  assertBalanced(lines);
  const id = randomUUID();
  const inserted = await c.query(
    "INSERT INTO journal_entries(id,organization_id,reference,description) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,reference) DO NOTHING RETURNING id",
    [id, p.organizationId, reference, description],
  );
  if (!inserted.rowCount) return;
  for (const line of lines)
    await c.query(
      "INSERT INTO journal_lines(id,organization_id,entry_id,account,side,amount_cents) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), p.organizationId, id, line.account, line.side, line.cents],
    );
}
