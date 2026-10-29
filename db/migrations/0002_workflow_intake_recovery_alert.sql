-- A separate internal-only alert must never resend the customer's confirmation.
ALTER TABLE workflow_intakes ADD COLUMN review_email_json TEXT;
ALTER TABLE workflow_intakes ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE workflow_intakes ADD COLUMN review_first_attempt_at INTEGER;
ALTER TABLE workflow_intakes ADD COLUMN review_next_attempt_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workflow_intakes ADD COLUMN review_queued_at INTEGER;
