import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { Principal } from "../domain/contracts";
import {
  chunkDocument,
  tokenEmbedding,
  KNOWLEDGE_FIXTURES,
  type SourceChunk,
} from "../domain/knowledge";
import { getPool, transaction } from "./db";
import { idempotentCommand } from "./operations";
import { audit } from "./audit";
import { DomainError } from "./errors";

export async function insertDocumentTx(
  c: PoolClient,
  p: Principal,
  input: { slug: string; title: string; body: string },
  approved = false,
) {
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `${p.organizationId}:document:${input.slug}`,
  ]);
  const version = (
    await c.query(
      "SELECT COALESCE(max(version),0)+1 AS n FROM knowledge_documents WHERE organization_id=$1 AND slug=$2",
      [p.organizationId, input.slug],
    )
  ).rows[0].n;
  const id = randomUUID();
  await c.query(
    "INSERT INTO knowledge_documents(id,organization_id,slug,title,body,version,created_by,status,approved_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      id,
      p.organizationId,
      input.slug,
      input.title,
      input.body,
      version,
      p.id,
      approved ? "APPROVED" : "DRAFT",
      approved ? p.id : null,
    ],
  );
  for (const [ordinal, content] of chunkDocument(input.body).entries())
    await c.query(
      "INSERT INTO knowledge_chunks(id,organization_id,document_id,ordinal,content,embedding) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), p.organizationId, id, ordinal, content, tokenEmbedding(content)],
    );
  return { id, status: approved ? "APPROVED" : "DRAFT", version };
}
export async function seedKnowledgeTx(c: PoolClient, p: Principal) {
  for (const doc of KNOWLEDGE_FIXTURES) {
    if (
      (
        await c.query("SELECT id FROM knowledge_documents WHERE organization_id=$1 AND slug=$2", [
          p.organizationId,
          doc.slug,
        ])
      ).rowCount
    )
      continue;
    await insertDocumentTx(c, p, doc, true);
  }
}
export async function searchKnowledgeTx(
  c: PoolClient,
  p: Principal,
  query: string,
): Promise<SourceChunk[]> {
  const bounded = z.string().trim().min(2).max(300).parse(query);
  const result = await c.query<SourceChunk>(
    `SELECT c.id,c.document_id,d.title,d.slug,d.version,c.content,
    (SELECT COALESCE(sum(a*b),0) FROM unnest(c.embedding,$3::real[]) AS v(a,b)) +
    2*ts_rank(c.search_vector,plainto_tsquery('english',$2)) AS score
    FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id AND d.organization_id=c.organization_id
    WHERE c.organization_id=$1 AND d.status='APPROVED'
    AND d.version=(SELECT max(v.version) FROM knowledge_documents v WHERE v.organization_id=$1 AND v.slug=d.slug AND v.status='APPROVED')
    ORDER BY score DESC,c.id LIMIT 5`,
    [p.organizationId, bounded, tokenEmbedding(bounded)],
  );
  return result.rows.filter((r) => r.score > 0.08);
}
export async function searchKnowledge(p: Principal, query: string, pool: Pool = getPool()) {
  return transaction(pool, (c) => searchKnowledgeTx(c, p, query));
}
const docSchema = z.discriminatedUnion("action", [
  z
    .object({
      commandId: z.uuid(),
      action: z.literal("ingest_document"),
      slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
      title: z.string().min(3).max(120),
      body: z.string().min(40).max(10000),
    })
    .strict(),
  z.object({ commandId: z.uuid(), action: z.literal("approve_document"), id: z.uuid() }).strict(),
]);
export async function documentCommand(p: Principal, raw: unknown, pool: Pool = getPool()) {
  const input = docSchema.parse(raw);
  return idempotentCommand(
    p,
    input,
    async (c) => {
      let result;
      if (input.action === "ingest_document") result = await insertDocumentTx(c, p, input);
      else {
        const row = await c.query(
          "UPDATE knowledge_documents SET status='APPROVED',approved_by=$3 WHERE organization_id=$1 AND id=$2 RETURNING id",
          [p.organizationId, input.id, p.id],
        );
        if (!row.rowCount) throw new DomainError(404, "NOT_FOUND", "Document not found.");
        result = { id: input.id, status: "APPROVED" };
      }
      await audit(c, p, "KnowledgeDocumentUpdated", result.id, input.commandId, {
        action: input.action,
      });
      return result;
    },
    pool,
  );
}
