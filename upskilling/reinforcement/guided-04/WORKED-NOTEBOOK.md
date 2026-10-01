# Runnable worked notebook: Audit a command identity without mixing organizations

This notebook adds three solved examples around the existing `inspectReceipts` teaching reference. It preserves the earlier unfinished starter. Reading or running these solved examples is study, not an independent completion of that exercise.

## Contract and owner

Inputs are validated {org,id,fingerprint,result} records containing strings. Group by the exact (org,id) pair without delimiter collisions. Return {org,id,state,attempts} per group in first-seen group order. State is consistent if every record in the group has the same fingerprint AND result as its first record; otherwise conflict. attempts counts all records. Different organizations are separate. Empty input returns empty; no mutation. This read-only synthetic audit does not implement command receipts or prove actual transaction behavior.

The [original coding exercise](../interview-03/coding/README.md) contains the complete practice workflow. The [reference source](../interview-03/_interviewer/reference.mjs) is deliberately separate from the starter. The new runner imports that reference and checks the literal expected values printed below; it does not call the live application.

## A slow walk through the main example

The first A/K receipt establishes the comparison fingerprint and result. A matching repetition increases attempts without conflict. B/K creates a separate group because organization belongs to identity. A later A/K with a changed result marks only the A group conflicting, even though its fingerprint is unchanged. Group order remains first-seen order.

**The distinction to retain:** This is a read-only consistency audit. It does not choose an authoritative conflicting result or implement the real receipt transaction.

Before looking at code, draw the state after each meaningful step. If the operation maintains an index or a set, write what enters it and what its key means. If it makes a transition decision, write the branch order and the first branch that accepts or rejects the input. These two ways of tracing make hidden assumptions more visible than jumping straight from input to final output.

Do not change the expected result merely to match an implementation. When there is a disagreement, return to the written contract. Decide whether the input violates a stated precondition, the expectation misreads a policy, or the implementation fails the rule. Each possibility leads to different corrective work.

## Example 1: Same command in two scopes with a result conflict

Arguments, in parameter order:

```json
[
  [
    {
      "org": "A",
      "id": "K",
      "fingerprint": "P",
      "result": "ok"
    },
    {
      "org": "A",
      "id": "K",
      "fingerprint": "P",
      "result": "ok"
    },
    {
      "org": "B",
      "id": "K",
      "fingerprint": "Q",
      "result": "ok"
    },
    {
      "org": "A",
      "id": "K",
      "fingerprint": "P",
      "result": "other"
    }
  ]
]
```

Expected returned value:

```json
[
  {
    "org": "A",
    "id": "K",
    "state": "conflict",
    "attempts": 3
  },
  {
    "org": "B",
    "id": "K",
    "state": "consistent",
    "attempts": 1
  }
]
```

Read the arguments before the result. Identify the entity identity, meaningful order, and boundary values. Then compare every result field, including preserved values and empty collections. A partial assertion can miss the exact distinction the example was chosen to expose.


## Example 2: Tuple identity avoids separator collisions

Arguments, in parameter order:

```json
[
  [
    {
      "org": "A|B",
      "id": "C",
      "fingerprint": "p",
      "result": "ok"
    },
    {
      "org": "A",
      "id": "B|C",
      "fingerprint": "p",
      "result": "ok"
    }
  ]
]
```

Expected returned value:

```json
[
  {
    "org": "A|B",
    "id": "C",
    "state": "consistent",
    "attempts": 1
  },
  {
    "org": "A",
    "id": "B|C",
    "state": "consistent",
    "attempts": 1
  }
]
```

Read the arguments before the result. Identify the entity identity, meaningful order, and boundary values. Then compare every result field, including preserved values and empty collections. A partial assertion can miss the exact distinction the example was chosen to expose.


## Example 3: No observations produce no groups

Arguments, in parameter order:

```json
[
  []
]
```

Expected returned value:

```json
[]
```

Read the arguments before the result. Identify the entity identity, meaningful order, and boundary values. Then compare every result field, including preserved values and empty collections. A partial assertion can miss the exact distinction the example was chosen to expose.

## Run the worked examples

From this guided block's `examples` directory:

```powershell
node --test check.mjs
```

Three named checks compare complete returned values and confirm that the supplied argument values remain unchanged. The runner freezes input structures recursively, so accidental mutation is also exposed in these fixtures. It uses Node's built-in test and assertion modules and needs no install, server, database, account, or network call.

The reference function is imported from the preceding interview block. If you move this folder independently, preserve that relative relationship or update the import deliberately. The source link and import target are included in the local navigation checks. This runner does not alter or mark your earlier starter as solved.

## Read the implementation after the trace

A composite tuple separates organization identity from command identity without ambiguous concatenation. The first observation establishes the comparison pair; any later mismatch permanently marks the group conflicting. With n receipts and g groups, expected Map work is O(n) plus string-key construction and space is O(g). The audit does not decide which conflicting result is authoritative. Locate the actual command transaction and receipt constraints before making a stronger application claim.

Now connect the explanation to actual lines in the reference. Mark input validation or assumed preconditions, identity construction, the main decision, output construction, and preservation of caller-owned state. Not every helper has every category. If a category is absent because the contract delegates it to the caller, write that rather than imagining hidden validation.

Compare the first example with each variation. Identify the changed dimension before looking at the new result. The empty or boundary case is not an afterthought: it reveals what the function means when ordinary work is absent or when a threshold is exactly reached. A deterministic tie or scope check can be decisive even when most fields look identical.

## From solved reading to independent practice

Close the reference and reconstruct the main decision in a separate practice file. Keep your first attempt, including its mistakes. Add a fourth fixture that rejects a plausible wrong implementation. Write the expected result before execution and explain why it follows from the contract.

If your code differs from the reference, compare behavior rather than spelling. Another loop, data structure, or decomposition can be valid. State its time and space costs and its effect on clarity. Do not add a framework or dependency merely to make the exercise look more advanced.

## Connect the model back to Helios / astra1

The project boundary to inspect is authorized server command and PostgreSQL transaction. The model can explain a policy while omitting authorization, persistence, browser interaction, or concurrent execution. Locate the real caller and name the missing guarantee before proposing an application change.

An accurate learning journal can say that the three solved examples ran and matched their expected values. It cannot turn that result into a claim that the application was built, deployed, browser-tested, or verified against an external provider. Record your own source trace and integration evidence separately when you perform them.

## Explain it without the code

Use this speaking sequence: the user wants __; the input identifies __; the function preserves __; the surprising branch is __; the result is __; the real application still needs __. Then have a listener change one input. If you can predict the changed result and identify the decisive step, you have evidence of understanding beyond recognizing the reference.
