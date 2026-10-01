# Preserve the baseline and report new evidence

The new acceptance evidence belongs to execution plan 003. The prior local workflow program and its recorded results remain historical baseline evidence. This improvement adds one late-failure PostgreSQL regression, an owned local verification helper, and source-based learning material; it does not claim to reimplement the completed application.

The helper creates a fresh helios_test database bound to loopback, supplies fixture-only model and session settings, and runs requested checks there. API smoke starts an owned local application on a free port, waits for health, runs the existing smoke programs, and stops that process. Browser verification uses the existing Playwright configuration and the affected coolant-repair case. Database and browser modes run sequentially because they reset fixture data.

The first full check passed lint, types, and eleven unit tests, then correctly stopped at the integration isolation guard because the new launcher supplied identical application and test URLs. The corrected launcher creates separate helios and helios_test databases inside its owned temporary cluster. Integration assertions remain unchanged. Only the isolated HTTP smoke server is pointed at the test fixture after those checks; no existing database is used.

The recorded commands below determine which of these checks completed successfully. A dependency install, a partial build, or pending browser process must not be described as acceptance. Test counts use distinct cases, while smoke programs are identified separately. Missing or failed verification remains explicit until resolved.

The curriculum also appears under upskilling/repair-rollback to follow this repository's learning-material convention. Original prompts and prior learning records are preserved. Passing software checks is not evidence of human mastery, and no quiz or approval interruption is required for this local BUILD task. External providers and the existing packaged preview are outside the owned test environment.

## Source excerpt

From [scripts/test-owned-postgres.py](../../scripts/test-owned-postgres.py).

```py
try:
    run([str(binary/('initdb'+suffix)), '-D', str(data), '-U', 'astra_test',
         '-A', 'trust', '--no-locale', '--no-sync', '-E', 'UTF8'])
    port = free_port()
    run([str(binary/('pg_ctl'+suffix)), '-D', str(data), '-l', str(scratch/'postgres.log'),
         '-o', f'-p {port} -h 127.0.0.1', '-w', 'start'])
    started = True
    run([str(binary/('createdb'+suffix)), '-h', '127.0.0.1', '-p', str(port),
         '-U', 'astra_test', 'helios_test'])
    run([str(binary/('createdb'+suffix)), '-h', '127.0.0.1', '-p', str(port),
         '-U', 'astra_test', 'helios'])
    app_port = free_port()
    env = os.environ.copy()
    env.update(DATABASE_URL=f'postgresql://astra_test@127.0.0.1:{port}/helios',
               TEST_DATABASE_URL=f'postgresql://astra_test@127.0.0.1:{port}/helios_test',
               DEMO_MODE='true', HELIOS_MODEL_PROVIDER='fixture',
               SESSION_SECRET='owned-local-test-session-secret-32-characters',
               APP_ORIGIN=f'http://127.0.0.1:{app_port}', HELIOS_E2E_PORT=str(app_port),
               HELIOS_E2E_CONTAINER='false', NEXT_TELEMETRY_DISABLED='1')
    if os.name == 'nt':
        node = shutil.which('node')
        if not node:
            raise RuntimeError('Node.js is required')
        npm_cli = Path(node).parent/'node_modules/npm/bin/npm-cli.js'
        if not npm_cli.is_file():
            raise RuntimeError('Expected npm CLI beside the Node.js installation')
        npm = [node, str(npm_cli)]
    else:
        npm = ['npm']
    if args.mode in ['check', 'all']:
        run(npm+['run', 'check'], cwd=root, env=env)
    if args.mode in ['api', 'all']:
        # The isolated HTTP server serves the test fixture; integration checks above
        # retain distinct application/test URLs so their isolation guard stays active.
        env['DATABASE_URL'] = env['TEST_DATABASE_URL']
        run(['node', '--import', 'tsx', 'scripts/prepare-test-db.ts'], cwd=root, env=env)
        server_output = (scratch/'server.log').open('wb')
        server = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'start',
                                   '--hostname', '127.0.0.1', '--port', str(app_port)],
                                  cwd=root, env=env, stdout=server_output,
                                  stderr=subprocess.STDOUT, creationflags=flags)
        deadline = time.monotonic() + 300
        while True:
            if server.poll() is not None:
                raise RuntimeError('Owned application exited before readiness')
            try:
                with urllib.request.urlopen(env['APP_ORIGIN']+'/api/health', timeout=5) as response:
                    if response.status == 200:
                        break
            except (OSError, TimeoutError):
                pass
            if time.monotonic() >= deadline:
                raise TimeoutError('Owned application did not become ready')
            time.sleep(1)
        run(npm+['run', 'test:api'], cwd=root, env=env)
        stop_server()
    if args.mode in ['browser', 'all']:
        run(npm+['run', 'test:e2e', '--', 'operations.spec.ts', '--grep', 'coolant repair'],
            cwd=root, env=env)
finally:
    try:
        stop_server()
    finally:
        if started:
            run([str(binary/('pg_ctl'+suffix)), '-D', str(data), '-m', 'fast', '-w', 'stop'])
        assert scratch.parent == Path(tempfile.gettempdir()).resolve()
        assert scratch.name.startswith('astra1-check-')
        shutil.rmtree(scratch)
```

## Course navigation

[README](README.md) / [01-CODEBASE-MAP](01-CODEBASE-MAP.md) / [02-CONCEPTS](02-CONCEPTS.md) / [03-WORKED-CHANGE](03-WORKED-CHANGE.md) / [04-TESTING-AND-DEBUGGING](04-TESTING-AND-DEBUGGING.md) / [05-PRACTICE](05-PRACTICE.md) / [06-SOLUTIONS-AND-REVIEW](06-SOLUTIONS-AND-REVIEW.md) / [07-TRACE-LAB](07-TRACE-LAB.md) / [VERIFICATION](VERIFICATION.md)

## Recorded command evidence

The accepted test evidence covers **49 distinct passing tests**. The commands below define the verified scope; repeated targeted runs do not increase the count.

| Check | Recorded command | Exit | Evidence |
|---|---|---:|---|
| `astra-astra1-owned-check-r2` | `["C:\\Python313\\python.exe", "scripts/test-owned-postgres.py", "--mode", "check"]` | 0 | [record](../../astraupskill/evidence/astra-astra1-owned-check-r2.json), [log](../../astraupskill/evidence/astra-astra1-owned-check-r2.log) |
| `astra-astra1-owned-api-r1` | `["C:\\Python313\\python.exe", "scripts/test-owned-postgres.py", "--mode", "api"]` | 0 | [record](../../astraupskill/evidence/astra-astra1-owned-api-r1.json), [log](../../astraupskill/evidence/astra-astra1-owned-api-r1.log) |
| `astra-astra1-owned-browser-r1` | `["C:\\Python313\\python.exe", "scripts/test-owned-postgres.py", "--mode", "browser"]` | 0 | [record](../../astraupskill/evidence/astra-astra1-owned-browser-r1.json), [log](../../astraupskill/evidence/astra-astra1-owned-browser-r1.log) |

## Browser screenshots from the accepted run

- [operations-overview.png](../../astraupskill/evidence/operations-overview.png)
- [intelligence-trace.png](../../astraupskill/evidence/intelligence-trace.png)
- [cargo-delay.png](../../astraupskill/evidence/cargo-delay.png)
- [repair-complete.png](../../astraupskill/evidence/repair-complete.png)
