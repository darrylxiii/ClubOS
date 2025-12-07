
-- Phase 1: Enhanced Threat Detection Functions

-- 1.1 Impossible Travel Detection
-- Detects when a user logs in from two locations that are impossible to travel between
CREATE OR REPLACE FUNCTION public.detect_impossible_travel()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  detected_count INTEGER := 0;
  login_record RECORD;
  prev_login RECORD;
  distance_km NUMERIC;
  time_diff_hours NUMERIC;
  max_speed_kmh NUMERIC := 1000; -- Max realistic travel speed (supersonic jet)
BEGIN
  -- Check recent logins against previous logins for the same user
  FOR login_record IN 
    SELECT DISTINCT ON (la.email) 
      la.email,
      la.ip_address,
      la.created_at,
      igc.latitude AS curr_lat,
      igc.longitude AS curr_lon,
      igc.country_code AS curr_country,
      igc.city AS curr_city
    FROM login_attempts la
    LEFT JOIN ip_geo_cache igc ON igc.ip_address = la.ip_address
    WHERE la.created_at > NOW() - INTERVAL '1 hour'
      AND la.success = true
      AND igc.latitude IS NOT NULL
    ORDER BY la.email, la.created_at DESC
  LOOP
    -- Get previous successful login for this user
    SELECT 
      la.ip_address,
      la.created_at,
      igc.latitude,
      igc.longitude,
      igc.country_code,
      igc.city
    INTO prev_login
    FROM login_attempts la
    LEFT JOIN ip_geo_cache igc ON igc.ip_address = la.ip_address
    WHERE la.email = login_record.email
      AND la.success = true
      AND la.created_at < login_record.created_at
      AND la.ip_address != login_record.ip_address
      AND igc.latitude IS NOT NULL
    ORDER BY la.created_at DESC
    LIMIT 1;
    
    IF prev_login.latitude IS NOT NULL THEN
      -- Calculate distance using Haversine formula (simplified)
      distance_km := 6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(login_record.curr_lat - prev_login.latitude) / 2), 2) +
        COS(RADIANS(prev_login.latitude)) * COS(RADIANS(login_record.curr_lat)) *
        POWER(SIN(RADIANS(login_record.curr_lon - prev_login.longitude) / 2), 2)
      ));
      
      -- Calculate time difference in hours
      time_diff_hours := EXTRACT(EPOCH FROM (login_record.created_at - prev_login.created_at)) / 3600;
      
      -- Check if travel is impossible (speed > max_speed_kmh)
      IF time_diff_hours > 0 AND (distance_km / time_diff_hours) > max_speed_kmh THEN
        -- Check if threat already exists
        IF NOT EXISTS (
          SELECT 1 FROM threat_events
          WHERE email = login_record.email
            AND event_type = 'impossible_travel'
            AND created_at > NOW() - INTERVAL '1 hour'
        ) THEN
          INSERT INTO threat_events (
            event_type, severity, ip_address, email, description, attack_details
          ) VALUES (
            'impossible_travel',
            'high',
            login_record.ip_address,
            login_record.email,
            format('Impossible travel detected: %s km in %s hours from %s to %s',
              ROUND(distance_km::numeric, 0),
              ROUND(time_diff_hours::numeric, 2),
              COALESCE(prev_login.city, prev_login.country_code, 'Unknown'),
              COALESCE(login_record.curr_city, login_record.curr_country, 'Unknown')
            ),
            jsonb_build_object(
              'distance_km', ROUND(distance_km::numeric, 0),
              'time_diff_hours', ROUND(time_diff_hours::numeric, 2),
              'calculated_speed_kmh', ROUND((distance_km / NULLIF(time_diff_hours, 0))::numeric, 0),
              'from_location', jsonb_build_object('city', prev_login.city, 'country', prev_login.country_code, 'lat', prev_login.latitude, 'lon', prev_login.longitude),
              'to_location', jsonb_build_object('city', login_record.curr_city, 'country', login_record.curr_country, 'lat', login_record.curr_lat, 'lon', login_record.curr_lon),
              'from_ip', prev_login.ip_address,
              'to_ip', login_record.ip_address
            )
          );
          detected_count := detected_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN detected_count;
END;
$$;

-- 1.2 Credential Stuffing Detection
-- Detects when a single IP tries many different emails (different from brute force which targets one email)
CREATE OR REPLACE FUNCTION public.detect_credential_stuffing()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  detected_count INTEGER := 0;
  stuffing_record RECORD;
  threshold_emails INTEGER := 10; -- 10+ different emails from same IP
  time_window INTERVAL := '10 minutes';
BEGIN
  FOR stuffing_record IN
    SELECT 
      ip_address,
      COUNT(DISTINCT email) as unique_emails,
      array_agg(DISTINCT email) as emails_tried,
      MIN(created_at) as first_attempt,
      MAX(created_at) as last_attempt
    FROM login_attempts
    WHERE created_at > NOW() - time_window
      AND success = false
    GROUP BY ip_address
    HAVING COUNT(DISTINCT email) >= threshold_emails
  LOOP
    -- Check if threat already exists for this IP
    IF NOT EXISTS (
      SELECT 1 FROM threat_events
      WHERE ip_address = stuffing_record.ip_address
        AND event_type = 'credential_stuffing'
        AND created_at > NOW() - time_window
    ) THEN
      INSERT INTO threat_events (
        event_type, severity, ip_address, description, attack_details
      ) VALUES (
        'credential_stuffing',
        CASE 
          WHEN stuffing_record.unique_emails >= 50 THEN 'critical'
          WHEN stuffing_record.unique_emails >= 25 THEN 'high'
          ELSE 'medium'
        END,
        stuffing_record.ip_address,
        format('Credential stuffing: %s unique emails tried from single IP in %s',
          stuffing_record.unique_emails,
          time_window
        ),
        jsonb_build_object(
          'unique_emails_count', stuffing_record.unique_emails,
          'sample_emails', (SELECT array_agg(e) FROM (SELECT unnest(stuffing_record.emails_tried) AS e LIMIT 5) sub),
          'first_attempt', stuffing_record.first_attempt,
          'last_attempt', stuffing_record.last_attempt,
          'time_window', time_window::text,
          'detection_time', NOW()
        )
      );
      detected_count := detected_count + 1;
      
      -- Auto-block IP for credential stuffing (1 hour for medium, 24 hours for high/critical)
      INSERT INTO blocked_ips (ip_address, block_type, reason, expires_at, metadata)
      VALUES (
        stuffing_record.ip_address,
        'auto_suspicious',
        format('Auto-blocked: Credential stuffing with %s unique emails', stuffing_record.unique_emails),
        CASE 
          WHEN stuffing_record.unique_emails >= 25 THEN NOW() + INTERVAL '24 hours'
          ELSE NOW() + INTERVAL '1 hour'
        END,
        jsonb_build_object('unique_emails', stuffing_record.unique_emails, 'auto_blocked', true)
      )
      ON CONFLICT (ip_address) DO UPDATE SET
        is_active = true,
        expires_at = EXCLUDED.expires_at,
        reason = EXCLUDED.reason,
        updated_at = NOW();
    END IF;
  END LOOP;
  
  RETURN detected_count;
END;
$$;

-- 1.3 Suspicious Login Detection
-- Detects logins at unusual times or from new locations
CREATE OR REPLACE FUNCTION public.detect_suspicious_logins()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  detected_count INTEGER := 0;
  login_record RECORD;
  usual_countries TEXT[];
  login_hour INTEGER;
BEGIN
  FOR login_record IN
    SELECT 
      la.email,
      la.ip_address,
      la.created_at,
      igc.country_code,
      igc.city,
      igc.is_vpn,
      igc.is_proxy,
      igc.is_tor
    FROM login_attempts la
    LEFT JOIN ip_geo_cache igc ON igc.ip_address = la.ip_address
    WHERE la.created_at > NOW() - INTERVAL '15 minutes'
      AND la.success = true
  LOOP
    login_hour := EXTRACT(HOUR FROM login_record.created_at);
    
    -- Get user's usual countries (last 30 days)
    SELECT array_agg(DISTINCT igc.country_code)
    INTO usual_countries
    FROM login_attempts la
    LEFT JOIN ip_geo_cache igc ON igc.ip_address = la.ip_address
    WHERE la.email = login_record.email
      AND la.success = true
      AND la.created_at > NOW() - INTERVAL '30 days'
      AND la.created_at < login_record.created_at
      AND igc.country_code IS NOT NULL;
    
    -- Check for suspicious indicators
    IF (
      -- VPN/Proxy/Tor usage
      (login_record.is_vpn = true OR login_record.is_proxy = true OR login_record.is_tor = true)
      -- OR unusual hour (2-5 AM)
      OR (login_hour BETWEEN 2 AND 5)
      -- OR new country
      OR (login_record.country_code IS NOT NULL AND usual_countries IS NOT NULL AND NOT login_record.country_code = ANY(usual_countries))
    ) THEN
      -- Check if already logged
      IF NOT EXISTS (
        SELECT 1 FROM threat_events
        WHERE email = login_record.email
          AND event_type = 'suspicious_login'
          AND created_at > NOW() - INTERVAL '1 hour'
      ) THEN
        INSERT INTO threat_events (
          event_type, severity, ip_address, email, description, attack_details
        ) VALUES (
          'suspicious_login',
          CASE 
            WHEN login_record.is_tor = true THEN 'high'
            WHEN login_record.is_vpn = true OR login_record.is_proxy = true THEN 'medium'
            ELSE 'low'
          END,
          login_record.ip_address,
          login_record.email,
          format('Suspicious login: %s',
            CASE 
              WHEN login_record.is_tor THEN 'Tor exit node detected'
              WHEN login_record.is_vpn THEN 'VPN detected'
              WHEN login_record.is_proxy THEN 'Proxy detected'
              WHEN login_hour BETWEEN 2 AND 5 THEN 'Unusual login hour (' || login_hour || ':00)'
              ELSE 'New country: ' || COALESCE(login_record.country_code, 'Unknown')
            END
          ),
          jsonb_build_object(
            'country', login_record.country_code,
            'city', login_record.city,
            'is_vpn', login_record.is_vpn,
            'is_proxy', login_record.is_proxy,
            'is_tor', login_record.is_tor,
            'login_hour', login_hour,
            'usual_countries', usual_countries
          )
        );
        detected_count := detected_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN detected_count;
END;
$$;

-- 1.4 Auto-Response Rules Configuration
-- Insert default auto-response rules into security_config
INSERT INTO security_config (config_key, config_value, description)
VALUES 
  ('auto_block_brute_force', '{"enabled": true, "threshold": 10, "block_duration_minutes": 60}', 'Auto-block IPs after N failed login attempts'),
  ('auto_block_credential_stuffing', '{"enabled": true, "threshold": 10, "block_duration_minutes": 1440}', 'Auto-block IPs trying multiple emails'),
  ('auto_block_enumeration', '{"enabled": true, "threshold": 20, "block_duration_minutes": 120}', 'Auto-block IPs enumerating user accounts'),
  ('threat_scan_interval_minutes', '{"value": 5}', 'How often to run automated threat scans'),
  ('ip_whitelist', '{"ips": []}', 'IPs that should never be blocked'),
  ('alert_on_critical', '{"enabled": true, "email": null}', 'Send alerts for critical threats')
ON CONFLICT (config_key) DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.detect_impossible_travel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_credential_stuffing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_logins() TO authenticated;
