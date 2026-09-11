BEGIN;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
CREATE TABLE IF NOT EXISTS email_verifications (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
COMMIT;
