BEGIN;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS scan_options jsonb NOT NULL DEFAULT '{}';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS next_check_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE domains ADD COLUMN IF NOT EXISTS check_lease_until timestamptz;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS check_lease_token uuid;
CREATE INDEX IF NOT EXISTS domains_due_idx ON domains (next_check_at) WHERE is_active;
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS alert_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 channel_id uuid NOT NULL REFERENCES alert_channels(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 context jsonb NOT NULL, status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
 last_error text, sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT delivery_event_channel_unique UNIQUE (event_id, channel_id)
);
CREATE INDEX IF NOT EXISTS deliveries_due_idx ON alert_deliveries(status, next_attempt_at);
COMMIT;
