# PROJECT_STORIES.md — Helios Interplanetary (raw-SQL performance + telemetry)

Complete these after doing the review, the EXPLAIN journal, and both incidents. Write your own words — these
are STAR-shaped prompts, not fill-in-the-blank.

## 1. Debugging story — the invoice history slowdown
**Situation / Task / Action / Result.** Walk through how you diagnosed INC-001: what told you it was
cost-proportional-to-depth rather than a resource or deploy issue, how you confirmed the missing index against
the schema, and why you chose keyset pagination over "just add the index." What would you say if an
interviewer asked "why not just cap OFFSET at some max depth instead"?

## 2. Trade-off story — index vs. query rewrite
For the ledger query (Q1 in the EXPLAIN journal), you had two levers: add indexes, or rewrite the query to
fetch entry ids first and join lines second. Explain the trade-off in plain terms: what does each option cost
to build, what does each cost to maintain, and under what future change (e.g. "ledger entries can now have 500
lines") would the index-only fix stop being enough?

## 3. Incident story — the metrics blind spot
Tell INC-002 as you'd tell it in an interview: "we had a dashboard that looked green during a real incident."
What made this bug hard to *notice* (as opposed to hard to *fix*, once found)? What's the one code-review
question you'd add to your own checklist after this, that would have caught it before merge?

## 4. Review story — the repeated `OR` query
`queries.ts:28` and `agent-tools.ts:61` have the identical index-defeating `OR` clause. Why does duplication
like this matter more for a performance bug than for, say, a typo? How would you structure a fix so both call
sites can't drift apart again (a shared query function? a view? a comment pointing at the twin?).

## 5. Agent-caught-bug story (optional — fill in only if you do the Phase-5 exercise for this batch)
If you run an agentic implement→review loop on any of these fixes, note here what the reviewer model caught
that you (or the implementer model) missed, and what that tells you about what to double-check yourself before
trusting an agent's DB-performance fix.
