# Preserve the baseline and report new evidence

The acceptance evidence for this mini-course belongs to execution plan 003 (`docs/exec-plans/003-repair-rollback-regression.md`). The earlier local program (Run 002) and its recorded results remain historical baseline evidence. This improvement added one late-failure PostgreSQL regression, an owned local verification helper, and this learning material; it does not claim to reimplement the application.

## What the helper does

`scripts/test-owned-postgres.py` runs `initdb` into a fresh temp directory (prefix `astra1-check-`), starts that cluster on a free loopback port, creates separate `helios` and `helios_test` databases, and sets fixture-only environment values (`HELIOS_MODEL_PROVIDER=fixture`, a test `SESSION_SECRET`, `DEMO_MODE=true`). Modes:

- `--mode check`: `npm run check` (lint, typecheck, unit, integration, build).
- `--mode api`: points `DATABASE_URL` at the test database, prepares it, starts `next start` on a free port, waits for `/api/health`, runs `npm run test:api`, then stops the server.
- `--mode browser`: `npm run test:e2e -- operations.spec.ts --grep "coolant repair"`.

In `finally` it stops the server and the cluster and deletes only its own temp directory, after asserting the directory is under the system temp dir and has the expected prefix.

The first full check passed lint, types, and unit tests, then correctly stopped at the integration isolation guard (`tests/helpers.ts:16`, `assert.notEqual(url, process.env.DATABASE_URL)`) because the launcher had supplied identical application and test URLs. The corrected launcher creates the two separate databases; the guard was not weakened.

## Recorded command evidence

| Check | Command (run with a local Python 3.13 on Windows) | Exit | Started (UTC) | Record |
|---|---|---:|---|---|
| `astra-astra1-owned-check-r2` | `python scripts/test-owned-postgres.py --mode check` | 0 | 2026-09-20 21:48, ~40 min | [json](evidence/astra-astra1-owned-check-r2.json) |
| `astra-astra1-owned-api-r1` | `python scripts/test-owned-postgres.py --mode api` | 0 | 2026-09-20 22:29, ~4 min | [json](evidence/astra-astra1-owned-api-r1.json) |
| `astra-astra1-owned-browser-r1` | `python scripts/test-owned-postgres.py --mode browser` | 0 | 2026-09-20 22:33, ~8 min | [json](evidence/astra-astra1-owned-browser-r1.json) |

The JSON records name a `.log` file each; those logs were not committed, so the exit codes and timings above are the surviving evidence.

**49 distinct passing tests** = 11 unit (`tests/unit/*.test.ts`: 5 + 3 + 3) + 37 integration (`tests/integration/*.test.ts`: 4 + 5 + 13 + 8 + 7) from the check run, plus 1 Playwright case (`tests/e2e/operations.spec.ts:35`) from the browser run. The two HTTP smoke programs (`scripts/api-smoke.ts`, `scripts/program-smoke.ts`) are counted separately. Recount with `grep -c '^test(' tests/unit/*.ts tests/integration/*.ts`.

## Browser screenshots from the accepted run

- [operations-overview.png](evidence/operations-overview.png)
- [intelligence-trace.png](evidence/intelligence-trace.png)
- [cargo-delay.png](evidence/cargo-delay.png)
- [repair-complete.png](evidence/repair-complete.png)

## What this does not prove

These are local fixture checks. They do not verify physical systems, a public deployment, live model providers, or the learner's understanding. Passing software checks is not evidence of human mastery.

[README](README.md)
