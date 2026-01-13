-- Blocked IPs table for manual and automatic blocks
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('manual', 'auto_brute_force', 'auto_rate_limit', 'auto_suspicious', 'auto_enumeration')),
  reason TEXT,
  blocked_by UUID,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ip_address, is_active)
);

-- Threat Events table for detected attacks
CREATE TABLE IF NOT EXISTS public.threat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('brute_force', 'credential_stuffing', 'enumeration', 'rate_abuse', 'suspicious_login', 'impossible_travel', 'known_bad_ip')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address TEXT,
  user_id UUID,
  email TEXT,
  description TEXT,
  attack_details JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geo-IP Cache for location enrichment
CREATE TABLE IF NOT EXISTS public.ip_geo_cache (
  ip_address TEXT PRIMARY KEY,
  country_code TEXT,
  country_name TEXT,
  city TEXT,
  region TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_vpn BOOLEAN DEFAULT false,
  is_proxy BOOLEAN DEFAULT false,
  is_tor BOOLEAN DEFAULT false,
  isp TEXT,
  threat_score INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Sessions Security for tracking active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  ip_address TEXT,
  device_fingerprint TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  is_suspicious BOOLEAN DEFAULT false,
  suspicious_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Security configuration table
CREATE TABLE IF NOT EXISTS public.security_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_geo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_ips (admin only)
CREATE POLICY "Admins can view blocked IPs" ON public.blocked_ips
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for threat_events (admin only)
CREATE POLICY "Admins can view threat events" ON public.threat_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage threat events" ON public.threat_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for ip_geo_cache (admin only)
CREATE POLICY "Admins can view geo cache" ON public.ip_geo_cache
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage geo cache" ON public.ip_geo_cache
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for user_sessions_security (admin only)
CREATE POLICY "Admins can view sessions" ON public.user_sessions_security
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage sessions" ON public.user_sessions_security
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for security_config (admin only)
CREATE POLICY "Admins can view security config" ON public.security_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage security config" ON public.security_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON public.blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON public.blocked_ips(is_active);
CREATE INDEX IF NOT EXISTS idx_threat_events_type ON public.threat_events(event_type);
CREATE INDEX IF NOT EXISTS idx_threat_events_severity ON public.threat_events(severity);
CREATE INDEX IF NOT EXISTS idx_threat_events_created ON public.threat_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_events_resolved ON public.threat_events(is_resolved);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions_security(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip ON public.user_sessions_security(ip_address);

-- Function to detect brute force attacks
CREATE OR REPLACE FUNCTION public.detect_brute_force_attacks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attack_count INTEGER := 0;
  ip_rec RECORD;
BEGIN
  -- Find IPs with 10+ failed logins in 5 minutes
  FOR ip_rec IN
    SELECT 
      ip_address,
      COUNT(*) as attempt_count,
      ARRAY_AGG(DISTINCT email) as emails
    FROM login_attempts
    WHERE 
      success = false 
      AND created_at > NOW() - INTERVAL '5 minutes'
      AND ip_address IS NOT NULL
    GROUP BY ip_address
    HAVING COUNT(*) >= 10
  LOOP
    -- Check if threat already exists for this IP in last hour
    IF NOT EXISTS (
      SELECT 1 FROM threat_events 
      WHERE ip_address = ip_rec.ip_address 
      AND event_type = 'brute_force'
      AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN
      -- Create threat event
      INSERT INTO threat_events (event_type, severity, ip_address, description, attack_details)
      VALUES (
        'brute_force',
        CASE WHEN ip_rec.attempt_count >= 50 THEN 'critical'
             WHEN ip_rec.attempt_count >= 25 THEN 'high'
             ELSE 'medium' END,
        ip_rec.ip_address,
        format('Brute force attack detected: %s failed login attempts in 5 minutes', ip_rec.attempt_count),
        jsonb_build_object(
          'attempt_count', ip_rec.attempt_count,
          'targeted_emails', ip_rec.emails,
          'detection_time', NOW()
        )
      );
      
      -- Auto-block if severe
      IF ip_rec.attempt_count >= 25 THEN
        INSERT INTO blocked_ips (ip_address, block_type, reason, expires_at)
        VALUES (
          ip_rec.ip_address,
          'auto_brute_force',
          format('Auto-blocked: %s failed login attempts', ip_rec.attempt_count),
          CASE WHEN ip_rec.attempt_count >= 50 THEN NOW() + INTERVAL '24 hours'
               ELSE NOW() + INTERVAL '1 hour' END
        )
        ON CONFLICT (ip_address, is_active) DO UPDATE
        SET expires_at = EXCLUDED.expires_at,
            reason = EXCLUDED.reason,
            updated_at = NOW();
      END IF;
      
      attack_count := attack_count + 1;
    END IF;
  END LOOP;
  
  RETURN attack_count;
END;
$$;

-- Function to detect enumeration attacks
CREATE OR REPLACE FUNCTION public.detect_enumeration_attacks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attack_count INTEGER := 0;
  ip_rec RECORD;
BEGIN
  -- Find IPs checking many different emails (via rate limits or check-email-exists calls)
  FOR ip_rec IN
    SELECT 
      ip_address,
      COUNT(DISTINCT email) as unique_emails,
      COUNT(*) as total_attempts
    FROM login_attempts
    WHERE 
      created_at > NOW() - INTERVAL '1 hour'
      AND ip_address IS NOT NULL
    GROUP BY ip_address
    HAVING COUNT(DISTINCT email) >= 20
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM threat_events 
      WHERE ip_address = ip_rec.ip_address 
      AND event_type = 'enumeration'
      AND created_at > NOW() - INTERVAL '2 hours'
    ) THEN
      INSERT INTO threat_events (event_type, severity, ip_address, description, attack_details)
      VALUES (
        'enumeration',
        CASE WHEN ip_rec.unique_emails >= 100 THEN 'high' ELSE 'medium' END,
        ip_rec.ip_address,
        format('Email enumeration detected: %s unique emails checked', ip_rec.unique_emails),
        jsonb_build_object(
          'unique_emails', ip_rec.unique_emails,
          'total_attempts', ip_rec.total_attempts,
          'detection_time', NOW()
        )
      );
      attack_count := attack_count + 1;
    END IF;
  END LOOP;
  
  RETURN attack_count;
END;
$$;

-- Function to get threat summary
CREATE OR REPLACE FUNCTION public.get_threat_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_threats_24h', (SELECT COUNT(*) FROM threat_events WHERE created_at > NOW() - INTERVAL '24 hours'),
    'critical_threats', (SELECT COUNT(*) FROM threat_events WHERE severity = 'critical' AND is_resolved = false),
    'high_threats', (SELECT COUNT(*) FROM threat_events WHERE severity = 'high' AND is_resolved = false),
    'medium_threats', (SELECT COUNT(*) FROM threat_events WHERE severity = 'medium' AND is_resolved = false),
    'blocked_ips_active', (SELECT COUNT(*) FROM blocked_ips WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())),
    'blocked_ips_today', (SELECT COUNT(*) FROM blocked_ips WHERE blocked_at > NOW() - INTERVAL '24 hours'),
    'attacks_by_type', (
      SELECT COALESCE(jsonb_object_agg(event_type, cnt), '{}'::jsonb)
      FROM (
        SELECT event_type, COUNT(*) as cnt 
        FROM threat_events 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY event_type
      ) t
    ),
    'threat_level', CASE 
      WHEN (SELECT COUNT(*) FROM threat_events WHERE severity = 'critical' AND is_resolved = false) > 0 THEN 'critical'
      WHEN (SELECT COUNT(*) FROM threat_events WHERE severity = 'high' AND is_resolved = false) > 5 THEN 'high'
      WHEN (SELECT COUNT(*) FROM threat_events WHERE severity IN ('high', 'medium') AND is_resolved = false) > 10 THEN 'medium'
      ELSE 'low'
    END
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Insert default security config
INSERT INTO public.security_config (config_key, config_value, description)
VALUES 
  ('brute_force_threshold', '{"attempts": 10, "window_minutes": 5}', 'Threshold for brute force detection'),
  ('auto_block_duration', '{"brute_force_hours": 1, "severe_hours": 24}', 'Auto-block duration settings'),
  ('enumeration_threshold', '{"unique_emails": 20, "window_minutes": 60}', 'Threshold for enumeration detection'),
  ('rate_limit_block_threshold', '{"hits": 100, "window_minutes": 60}', 'Rate limit violation threshold for auto-block')
ON CONFLICT (config_key) DO NOTHING;

-- Enable realtime for threat monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.threat_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_ips;