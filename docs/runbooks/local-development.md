# Local operations and recovery

## Application does not connect

Run `docker compose ps`, then `npm run db:up`. Check `http://127.0.0.1:3000/api/health` after starting the app. If PostgreSQL is up but migrations are missing, run `npm run db:migrate` and `npm run db:seed`.

If port 5438 is occupied, change the published host port in `compose.yaml` and both database URLs in `.env` together. Do not stop unrelated PostgreSQL containers. If port 3000 changes, update `APP_ORIGIN` and pass the same port to the Next.js command. Test browser port 3001 is separate.

Never print `.env` or session cookies to shared logs. `npm run configure` creates a random secret only when `.env` is missing.

## Demo access denied

Use exactly the configured origin, including `127.0.0.1` versus `localhost`. Confirm `DEMO_MODE=true` and a non-placeholder secret of at least 32 characters. Restart the app after changing configuration. A changed secret invalidates old sessions; sign in again.

## Simulation seems paused

That is expected between explicit scenario commands. Each action adds twelve readings and advances virtual time by 60 seconds. Browser polling refreshes current database state; it does not advance virtual time.

## Incident will not resolve

Inspect the incident, acknowledge it, run Restore nominal, and then resolve. The server checks current asset status while holding the same lock used by ingestion. An old normal reading cannot override a newer degraded reading.

## Interrupted scenario or ambiguous network failure

Keep the original run ID and payload. Replay that exact request. A committed run returns its stored result; a rolled-back run can execute again. Do not generate a new run ID merely because the network timed out. The UI's Replay delivery button retains the latest request during the current page session; for recovery after a page reload, use the recorded run ID from audit/CLI evidence.

## Return to a nominal demo

`npm run db:reset` truncates only the named local `helios` fixture database tables and reseeds them. It destroys demo readings, incidents, events, and runs. Use it only when that disposable history is no longer needed. `npm run db:seed` alone preserves current state.

`npm run db:down` stops the container and preserves the data volume. Avoid `docker compose down -v` unless intentionally discarding the database.

## Tests

Integration and browser suites reset `helios_test`. Run them sequentially. A refused reset indicates the safety guard did not recognize an explicitly named local test database; fix the configuration rather than removing the guard.

Browser failures save traces and screenshots under `artifacts/`. Use `npx playwright show-report artifacts/browser-report` to inspect the report. In this build session, the in-app browser failed to initialize; the independent Playwright suite is the reproducible verification path.

To check an actual application process restart, run `node --env-file-if-exists=.env scripts/persistence-check.mjs capture`, restart only this application's server, and run the same command with `verify`. Avoid changing simulation data between those steps. The comparison checks recorded values and incident/asset state; it is not a backup or disk-failure recovery test.
