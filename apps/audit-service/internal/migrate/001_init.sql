CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL,
  http_method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INT NOT NULL,
  duration_ms INT NOT NULL DEFAULT 0,
  actor_type TEXT NOT NULL DEFAULT '',
  actor_id TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT '',
  resource_id TEXT NOT NULL DEFAULT '',
  correlation_id TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_id
  ON audit_events (occurred_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id
  ON audit_events (correlation_id);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor_occurred
  ON audit_events (actor_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_action_occurred
  ON audit_events (action, occurred_at DESC);
