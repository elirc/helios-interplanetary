# A real failure from the first build: valid local requests were denied

This happened during implementation. It was not an intentionally planted bug.

## Symptom

The pure identity tests and PostgreSQL domain tests passed, but the HTTP smoke test received 403 where an unauthenticated request should receive 401. Browser tests could not reach the demo sign-in flow. Server logs consistently reported `HOST_DENIED`.

## Initial assumption

The host check compared the origin from `request.url` with the configured `http://127.0.0.1:3000`. The unit tests constructed standard Web `Request` objects with that URL and passed.

## Evidence that changed the diagnosis

The installed Next.js implementation in `node_modules/next/dist/server/web/next-url.js` normalizes loopback hostnames to `localhost`. This happens at the framework boundary, before the route handler sees the URL. The browser's original Host header still identifies `127.0.0.1:3000`.

The domain tests had no reason to detect the discrepancy: they called server services directly and did not execute the Next.js HTTP adapter.

## Correction

`assertLocalRequest` now validates the original Host header against the configured host and port, and validates the protocol. It deliberately ignores forwarded-host headers. Mutation origin checks remain exact. A regression test represents the normalized URL and checks both an accepted local Host and denied hostile/wrong-port Hosts.

## Your learning exercise

Before reading the code change, propose two competing explanations for the original 403. Write one experiment that distinguishes them. Explain why disabling the host check entirely would be a poor correction, and why rerunning only the unchanged domain suite would be weak evidence.

Record the final HTTP/browser outcome from the execution plan. This case study documents the diagnosis and correction; it should not be used to imply every integration boundary has been tested.
