# Coding reasoning: Audit repeated command receipts

Attempt the [candidate challenge](../coding/README.md) first. The [reference implementation](reference.mjs) is one valid solution to the written contract, not a recommended production replacement.

A composite tuple separates organization identity from command identity without ambiguous concatenation. The first observation establishes the comparison pair; any later mismatch permanently marks the group conflicting. With n receipts and g groups, expected Map work is O(n) plus string-key construction and space is O(g). The audit does not decide which conflicting result is authoritative. Locate the actual command transaction and receipt constraints before making a stronger application claim.

## Review the mechanism

Have the candidate annotate the branch that enforces each relevant rule: identity, ordering, rejection, preservation, and output construction. Then change one input while keeping the contract valid. They should predict the result before executing the code. If two implementations differ only in style while producing the same required behavior, discuss readability rather than inventing a correctness defect.

## Strengthen the test evidence

The seven supplied cases check representative positive, boundary, and preservation behavior. Ask for an additional case and the wrong implementation it would detect. Avoid a test that simply copies the implementation's intermediate variables into an assertion. Prefer a public input/output example or an unchanged-input observation.

## Connect to this project

The actual boundary is authorized server command and PostgreSQL transaction. The model omits infrastructure and may choose fields or policy that differ from the application. Ask the candidate to locate the real caller and explain which validation, authorization, transaction, or UI behavior remains outside this helper. A useful answer can conclude that the application already has the behavior and only characterization evidence is needed.

The reference passing is author verification. The learner must still demonstrate an independent solution, a counterexample, and an explanation of the evidence limits. Mark a copied implementation as studied rather than independently solved.
