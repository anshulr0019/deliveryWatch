BEGIN;
CREATE TABLE IF NOT EXISTS profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, full_name text,
 password_hash text, google_id text UNIQUE, avatar_url text, plan text NOT NULL DEFAULT 'community',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS domains (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 domain text NOT NULL, is_active boolean NOT NULL DEFAULT true, latest_score integer NOT NULL DEFAULT 0,
 last_checked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT domains_user_domain_unique UNIQUE(user_id, domain)
);
CREATE INDEX IF NOT EXISTS domains_user_idx ON domains(user_id);
CREATE TABLE IF NOT EXISTS checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), domain_id uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
 score integer NOT NULL, spf_status text NOT NULL DEFAULT 'unknown', spf_details jsonb NOT NULL DEFAULT '{}',
 dkim_status text NOT NULL DEFAULT 'unknown', dkim_details jsonb NOT NULL DEFAULT '{}',
 dmarc_status text NOT NULL DEFAULT 'unknown', dmarc_details jsonb NOT NULL DEFAULT '{}',
 mx_status text NOT NULL DEFAULT 'unknown', mx_details jsonb NOT NULL DEFAULT '{}',
 rbl_status text NOT NULL DEFAULT 'unknown', rbl_details jsonb NOT NULL DEFAULT '{}', checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checks_domain_idx ON checks(domain_id, checked_at);
CREATE TABLE IF NOT EXISTS events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), domain_id uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
 type text NOT NULL, severity text NOT NULL, title text NOT NULL, description text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_domain_idx ON events(domain_id, created_at);
CREATE TABLE IF NOT EXISTS alert_channels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 type text NOT NULL, config jsonb NOT NULL DEFAULT '{}', is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_channels_user_idx ON alert_channels(user_id);
COMMIT;
