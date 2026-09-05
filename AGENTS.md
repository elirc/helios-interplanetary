# Helios engineering instructions

Build one verified vertical slice at a time. Read `docs/project/current-state.md` and its active execution plan before substantive work. Preserve user changes and both original prompt documents.

This is a Next.js / TypeScript modular monolith with real PostgreSQL. Route handlers own HTTP concerns; `src/server/` owns authorized domain operations; `src/domain/` contains pure rules and public contracts. The browser must never import server modules or supply trusted tenant identity.

Commands: `npm run db:up`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`. Use `.env.example` for prerequisites. `npm run db:reset` explicitly clears ONLY this project's disposable fixture data. Integration tests use `helios_test`, never the development database.

Validate behavior with targeted tests while iterating. Before completing a code milestone, run `npm run check`, the relevant API smoke test, and browser verification for affected user flows. Report missing verification accurately. Never weaken acceptance criteria or replace PostgreSQL integration assertions with mocks.

Keep active progress and evidence in `docs/exec-plans/`. Put lessons, exercises, assessment rubrics, and separate answer keys in `upskilling/`. Human learning is pending until the user demonstrates it; passing software tests is not evidence of human mastery.

Use local BUILD mode by default. Do not pause to quiz the user. Do not introduce deliberate application defects outside an explicitly selected LAB exercise. Do not spawn subagents unless the user selects delegation. No cloud publication or paid infrastructure is authorized by local build requests alone.
