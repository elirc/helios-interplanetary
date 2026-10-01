# Foundations: Stable pagination and query-result reasoning

## Read order before performance

Read getIncident and getSnapshot in `src/server/queries.ts`. Copy the ORDER BY clauses for their audit-event reads. Record the direction of every term; do not assume the second term inherits DESC from the first. Identify the organization predicate and the transaction's isolation mode.

The lab below uses synthetic invoice rows and a deliberately specified descending tuple. It is a proposed pagination contract, not a claim that an existing invoice-history endpoint implements it.

## Equal timestamps need a tie-breaker

Write four rows for organization A: IDs a,b,c at timestamp 20, and d at timestamp 10. With descending `(createdAt,id)`, predict two pages of size two. Explain how ordering only by timestamp can duplicate or omit rows across requests when tied rows are returned in a different order.

Now add organization B's row z at timestamp 30. Decide whether tenant filtering happens before or after page limiting. Explain both the data-isolation issue and the short-page issue if you page globally first.

## Cursor is not a snapshot

Draw a new row inserted ahead of the cursor between page one and page two. Explain why a traversal can intentionally miss that new row until refresh. Then consider a row whose sort timestamp changes after page one. A tuple cursor alone does not promise a consistent historical snapshot across separate requests.

## SQL reading task

Write a parameterized SELECT matching the synthetic contract. Mark the tenant predicate, the strict tuple comparison, both ordering terms, and the limit. Propose an index from those access conditions, but do not claim it improves performance until you measure the actual query plan.

## Before you code

Write one prediction you are least sure of and name the smallest observation that would settle it. Distinguish a fact you read in source from behavior you actually ran. Use the source map in [README](README.md) to check the exact files.
