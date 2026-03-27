-- Email verification cache to avoid redundant API calls to MillionVerifier/Findymail
-- Results are cached for 30 days (enforced at application level)

CREATE TABLE IF NOT EXISTS email_verification_cache (
  email TEXT PRIMARY KEY,
  quality TEXT NOT NULL,
  reason TEXT,
  provider TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evc_verified_at ON email_verification_cache(verified_at);

-- Enable RLS
ALTER TABLE email_verification_cache ENABLE ROW LEVEL SECURITY;

-- Service role only (edge functions use service role key)
CREATE POLICY "Service role access only"
  ON email_verification_cache
  FOR ALL
  USING (auth.role() = 'service_role');
