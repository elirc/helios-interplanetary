# Run 003: repair completion rollback regression

Mode: BUILD. Status: complete after isolated local verification.

The existing repair implementation already runs reservation consumption, work-order completion, crew release, incident resolution, audit creation, postmortem creation, and command receipt persistence in one PostgreSQL transaction. This pass preserves that implementation and adds a regression that rejects the late postmortem insert with a test-owned trigger.

The regression proves all earlier effects, including audit and receipt writes, roll back. Trigger/function cleanup runs in finally. Retrying the same command after cleanup succeeds once; replay returns the saved result without consuming inventory again.

The new launcher creates a temporary PostgreSQL 18 cluster on loopback with separate helios and helios_test databases. Its initial run correctly failed the existing isolation guard because both URLs were identical; the launcher was corrected without weakening that guard. API smoke and browser verification use only the helper-owned fixture. The original development database, packaged preview, prompts, and Run 002 record remain preserved.

Accepted verification: the combined check passed lint, TypeScript, 11 unit tests, 37 real PostgreSQL integration tests, and the production build. Both existing HTTP smoke programs passed. The coolant-repair Playwright case passed, including durable COMPLETED/RESOLVED state and no page errors. This is 49 distinct test cases, with the two smoke programs recorded separately.

Exact commands and results are in [verification](../../astraupskill/VERIFICATION.md). The four desktop screenshots from this browser run were visually inspected and are included with that evidence. They show the overview, pending adviser approval, delayed shipment, and completed repair with recovery records. [Learning material](../../upskilling/repair-rollback/README.md) contains exercises and separate solutions. Human learning remains unassessed.

These are local fixture checks, not verification of physical systems, public deployment, or live model providers. Historical Run 002 claims remain its own evidence and are not inferred from this focused follow-up.
