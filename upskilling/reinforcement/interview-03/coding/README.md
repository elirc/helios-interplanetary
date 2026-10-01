# Timed coding challenge: Audit repeated command receipts

Timebox: 35 minutes, followed by a 10-minute explanation. This is a new standalone interview exercise for Helios / astra1. No package installation, server, database, account, or paid service is required. Inputs and behavior are synthetic; the function is not a production patch.

## Exact contract

Export `inspectReceipts(receipts)` from `exercise.mjs`.

Inputs are validated {org,id,fingerprint,result} records containing strings. Group by the exact (org,id) pair without delimiter collisions. Return {org,id,state,attempts} per group in first-seen group order. State is consistent if every record in the group has the same fingerprint AND result as its first record; otherwise conflict. attempts counts all records. Different organizations are separate. Empty input returns empty; no mutation. This read-only synthetic audit does not implement command receipts or prove actual transaction behavior.

## Candidate workflow

Use minutes 0–5 to clarify the contract and write two concrete examples. Use minutes 5–25 for a baseline implementation. Use minutes 25–35 for edge cases, mutation checks, and a complexity explanation. Read `check.mjs` without editing its assertions. The starter deliberately throws `Not implemented`.

From this directory:

```powershell
node --test check.mjs
```

Add one discriminating test of your own. Explain which plausible wrong implementation it rejects before running it. The supplied seven tests are a contract sample, not an exhaustive proof of all possible inputs. Validation preconditions are part of the contract; do not silently claim to handle arbitrary untrusted JSON unless you add and test that boundary.

## Interview follow-ups

1. Trace a duplicate or boundary input through each branch.
2. Identify which input determines time and working-space growth.
3. Explain whether ordering is a requirement or an implementation accident.
4. Show an unchanged input or unrelated record after the operation.
5. State what changes if another process performs the same work concurrently.
6. Sketch a TypeScript signature or the project's JSDoc equivalent without changing the runtime contract.
7. Name the real repository boundary that would need integration verification before adopting the model.

After your own attempt, use the [separate reasoning guide](../_interviewer/coding.md). The reference command checks the author's answer, not your solution:

```powershell
node check.mjs --reference
```

Keep your first failing result, added assertion, corrected result, and an honest note about help used. The filename `check.mjs` avoids conventional test/spec discovery patterns in application runners; invoke it explicitly as shown. This challenge has no React or TypeScript build step, so passing it does not validate a component or a type sketch.
