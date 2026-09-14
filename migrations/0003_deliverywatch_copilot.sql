BEGIN;

CREATE TABLE IF NOT EXISTS domain_setup_profiles (
  domain_id uuid PRIMARY KEY REFERENCES domains(id) ON DELETE CASCADE,
  dns_provider text,
  email_providers jsonb NOT NULL DEFAULT '[]'::jsonb,
  sending_purposes jsonb NOT NULL DEFAULT '[]'::jsonb,
  dkim_selectors jsonb NOT NULL DEFAULT '[]'::jsonb,
  sending_ips jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT setup_email_providers_array CHECK (jsonb_typeof(email_providers) = 'array'),
  CONSTRAINT setup_sending_purposes_array CHECK (jsonb_typeof(sending_purposes) = 'array'),
  CONSTRAINT setup_dkim_selectors_array CHECK (jsonb_typeof(dkim_selectors) = 'array'),
  CONSTRAINT setup_sending_ips_array CHECK (jsonb_typeof(sending_ips) = 'array')
);

CREATE TABLE IF NOT EXISTS copilot_investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  source_check_id uuid NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
  previous_check_id uuid REFERENCES checks(id) ON DELETE SET NULL,
  verification_check_id uuid REFERENCES checks(id) ON DELETE SET NULL,
  finding_key text NOT NULL,
  protocol text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  title text NOT NULL,
  report jsonb NOT NULL,
  original_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_action jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution_note text,
  verification_result jsonb,
  verified_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT copilot_investigation_status CHECK (status IN ('open', 'resolved')),
  CONSTRAINT copilot_investigation_protocol CHECK (protocol IN ('spf', 'dkim', 'dmarc', 'mx', 'rbl')),
  CONSTRAINT copilot_source_finding_unique UNIQUE (source_check_id, finding_key)
);

CREATE INDEX IF NOT EXISTS copilot_domain_updated_idx
  ON copilot_investigations(domain_id, updated_at);
CREATE INDEX IF NOT EXISTS copilot_domain_status_idx
  ON copilot_investigations(domain_id, status);

COMMIT;
