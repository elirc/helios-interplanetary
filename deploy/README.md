# Local container deployment

The deployment package runs the same application and durable worker against the dedicated Helios PostgreSQL service. It publishes only loopback port 3002, uses a nonroot Node user, excludes `.env` from the image, and applies migrations before starting app/worker services.

From the repository root, after `npm run setup`:

```sh
docker compose -f deploy/compose.local.yaml build
docker compose -f deploy/compose.local.yaml up -d --wait
```

Open http://127.0.0.1:3002. The existing host preview on port 3000 can coexist; both see the same development data. Run exactly one continuous worker for a simple demo. PostgreSQL leases support multiple event workers; simulation ticks share an organization clock lock.

Inspect:

```sh
docker compose -f deploy/compose.local.yaml ps
docker compose -f deploy/compose.local.yaml logs --tail 60 app worker
```

Stop the preview without deleting its database:

```sh
docker compose -f deploy/compose.local.yaml down
```

The image intentionally includes the TypeScript runtime and migration tools so the same image can serve requests, migrate, seed, and run the worker. A later production image can separate build and migration dependencies once that deployment has a concrete target.

## Verify the packaged image

The browser suite can serve the built image against `helios_test` on the local Helios Docker network. In PowerShell, after building the image and installing Playwright Chromium:

```powershell
$env:HELIOS_E2E_CONTAINER = 'true'
$env:HELIOS_E2E_PORT = '3013' # Optional: default 3001 may belong to another project.
npm run test:e2e
Remove-Item Env:HELIOS_E2E_CONTAINER
Remove-Item Env:HELIOS_E2E_PORT
```

This mode reserves the selected loopback port and uses the explicitly named disposable `helios-browser-test` container. The normal test mode and CI use the host production build. Both modes reset `helios_test`; do not run either alongside integration tests. If an interrupted Docker CLI leaves that test container behind, remove only it with `docker rm -f helios-browser-test` before retrying.

## Prepare a review world

Stop the preview worker, then run `npm run showcase` from the host. This command **resets the local disposable development fixtures** and executes the real domain workflow: a completed repair and recovered solar crisis, an uncertain payment, an open simulated security investigation, adviser traces and a recorded evaluation. Both clocks remain paused. Start the worker again afterward. To start instead from an untouched nominal world, stop the worker and use `npm run db:reset`.

## Backup rehearsal

Pause both simulation clocks and stop the worker. Avoid domain writes during the comparison. Run:

```sh
node scripts/backup-rehearsal.mjs
```

This command writes a PostgreSQL custom archive, restores it into a newly created `helios_restore_probe` database, compares operational row counts and journal balance, then removes only that newly created probe database. It refuses an existing probe. Evidence and the archive remain in ignored `artifacts/`. This is a local restore rehearsal, not a disaster-recovery SLA or an offsite backup policy.

## External deployment boundary

No cloud account, region, domain, production identity provider, secret store, or paid infrastructure was selected. The local persona mechanism intentionally rejects nonloopback origins. A public deployment must replace it with real authentication and membership-based authorization; exposing this fixture login is not a production deployment path.

Before external publication, select the target, configure real identity and secrets, define resource costs and data retention, and review an exact deployment plan. No cloud resources are created by this package. Remote CI configuration is provided but local verification is reported separately.
