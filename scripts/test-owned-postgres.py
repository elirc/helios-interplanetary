"""Verify Helios using a fresh, helper-owned local PostgreSQL database."""
from pathlib import Path
import argparse
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--postgres-bin', default='C:/Program Files/PostgreSQL/18/bin')
parser.add_argument('--mode', choices=['check', 'api', 'browser', 'all'], default='all')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
binary = Path(args.postgres_bin)
suffix = '.exe' if os.name == 'nt' else ''
flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
scratch = Path(tempfile.mkdtemp(prefix='astra1-check-')).resolve()
assert scratch.parent == Path(tempfile.gettempdir()).resolve()
assert scratch.name.startswith('astra1-check-')
data = scratch/'data'
started = False
server = None
server_output = None

def free_port():
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        return probe.getsockname()[1]

def run(command, **kwargs):
    print('Running: ' + ' '.join(map(str, command)), flush=True)
    return subprocess.run(command, stdout=sys.stdout, stderr=subprocess.STDOUT,
                          creationflags=flags, check=True, **kwargs)

def stop_server():
    global server, server_output
    if server is not None and server.poll() is None:
        if os.name == 'nt':
            run(['taskkill', '/PID', str(server.pid), '/T', '/F'])
        else:
            server.terminate()
        server.wait(timeout=30)
    if server_output is not None:
        server_output.close()
        print((scratch/'server.log').read_text(encoding='utf-8', errors='replace'), flush=True)
    server = None
    server_output = None

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
