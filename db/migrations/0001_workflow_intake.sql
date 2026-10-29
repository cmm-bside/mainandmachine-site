-- Private recovery record and transactional email outbox. No public read route.
CREATE TABLE IF NOT EXISTS workflow_intakes (
  request_id TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  batch_json TEXT,
  deadline_at TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'queued', 'needs_review')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  first_attempt_at INTEGER,
  last_attempt_at INTEGER,
  next_attempt_at INTEGER NOT NULL,
  lease_token TEXT,
  lease_until INTEGER,
  last_reason TEXT,
  queued_at INTEGER
);
CREATE INDEX IF NOT EXISTS workflow_intakes_pending ON workflow_intakes(email_status, next_attempt_at);
CREATE INDEX IF NOT EXISTS workflow_intakes_expiry ON workflow_intakes(expires_at);
