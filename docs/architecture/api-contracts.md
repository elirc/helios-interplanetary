# HTTP contracts

All application responses use JSON and `Cache-Control: no-store`. Business routes use a signed `helios_session` cookie. Mutations require `Content-Type: application/json` and `Origin` equal to `APP_ORIGIN`; requests are limited to 16 KiB. Public payloads reject unknown fields.

| Route                      | Behavior                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/session`        | Body `{ "persona": "controller" }`; alternatives `observer`, `auditor`. Issues an eight-hour local demo session.                                          |
| `DELETE /api/session`      | Clears the current session.                                                                                                                               |
| `GET /api/mission`         | Tenant-scoped station, asset, last 60 readings, latest 20 incidents, latest 12 operational events, counts, and fetch timestamp.                           |
| `POST /api/telemetry`      | Ingests one reading. Returns 201 for new historical or applied data, 200 for identical replay.                                                            |
| `POST /api/scenarios`      | Body `{ "runId": "UUID", "assetId": "pump-b17", "kind": "degradation", "seed": 17 }`. Kinds: degradation, recovery, nominal. Returns 201 new, 200 replay. |
| `GET /api/incidents/:id`   | Incident, trigger reading, and latest 100 associated audit events.                                                                                        |
| `PATCH /api/incidents/:id` | Body `{ "action": "acknowledge" }` or `{ "action": "resolve" }`. Repeating an achieved transition is a no-op.                                             |
| `GET /api/health`          | 200 when database and migration table are reachable; 503 otherwise. Does not expose configuration.                                                        |

## Reading example

```json
{
  "id": "a1111111-1111-4111-8111-111111111111",
  "assetId": "pump-b17",
  "observedAt": "2042-03-19T15:00:00Z",
  "pressureBar": 1.8,
  "vibrationMms": 8.0,
  "temperatureC": 46.0,
  "correlationId": "a2222222-2222-4222-8222-222222222222"
}
```

Units are encoded in field names. UUIDs and timestamps must be valid; numerical values must be finite and within schema limits. Organization identity is absent from the payload by design.

## Errors

```json
{
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "This reading ID already belongs to different data.",
    "requestId": "request UUID"
  }
}
```

400 = invalid input; 401 = missing/invalid/expired session; 403 = denied role/origin/demo environment; 404 = resource absent within the authenticated organization; 409 = identity conflict or invalid state transition; 413 = oversized body; 415 = incorrect content type. Unexpected failures produce a generic 500 response and a request identifier. The server logs status, duration, error type, and request ID without logging cookies or secrets.

The current snapshot/timeline windows are bounded views, not a general paginated historical search API. Dedicated history pagination is future work.
