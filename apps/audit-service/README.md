# audit-service

PostgreSQL-backed audit event ingest and query API (Go). The SouqSnap Nest API batches events and `POST`s them here; the admin UI reads logs through Nest, which proxies to this service with a shared secret.

## Environment

| Variable | Description |
|----------|-------------|
| `AUDIT_HTTP_ADDR` | Listen address (default `:3040`) |
| `AUDIT_DATABASE_URL` or `DATABASE_URL` | Postgres connection string |
| `AUDIT_SERVICE_KEY` | Shared secret; required on `X-Audit-Service-Key` for all `/internal/*` routes |
| `AUDIT_RETENTION_DAYS` | Delete events older than this many days (default `90`) |
| `AUDIT_RETENTION_INTERVAL_HOURS` | How often to run retention sweeps (default `24`) |
| `AUDIT_MAX_INGEST_BATCH` | Max events per ingest request (default `500`, cap `500`) |

## HTTP

- `GET /health` — process liveness (no auth).
- `GET /readyz` — database ping (no auth).
- `POST /internal/v1/events` — body `{"events":[{...}]}`; header `X-Audit-Service-Key`.
- `GET /internal/v1/events` — keyset pagination and filters (`limit`, `cursor`, `from`, `to`, `actorId`, `action`, `resourceType`, `resourceId`, `statusCode`, `path`, `correlationId`); same header.
- `GET /internal/v1/events/tail` — `since` (RFC3339), `limit`; ascending rows after `since` for polling.

## Nest API (producer)

Set on the API process:

- `AUDIT_ENABLED=true`
- `AUDIT_SERVICE_URL=http://audit-service:3040` (no trailing slash required)
- `AUDIT_SERVICE_KEY` — must match this service’s `AUDIT_SERVICE_KEY`

Optional tuning: `AUDIT_FLUSH_INTERVAL_MS`, `AUDIT_MAX_BATCH_SIZE`, `AUDIT_MAX_BUFFER_EVENTS`, `AUDIT_REQUEST_TIMEOUT_MS`, `AUDIT_CIRCUIT_FAILURE_THRESHOLD`, `AUDIT_CIRCUIT_HALF_OPEN_AFTER_MS`.

## Local run

```bash
export AUDIT_DATABASE_URL='postgres://user:pass@localhost:5432/audit?sslmode=disable'
export AUDIT_SERVICE_KEY='dev-shared-secret'
go run ./cmd/server
```

Schema is applied automatically on startup from embedded SQL in `internal/migrate/`.

## Docker

```bash
docker build -t souqsnap-audit ./apps/audit-service
```

## Notes

- In-memory batching in Nest is not durable across API crashes; for stronger guarantees add a queue between API and this service.
- `gen_random_uuid()` requires PostgreSQL 13+.
