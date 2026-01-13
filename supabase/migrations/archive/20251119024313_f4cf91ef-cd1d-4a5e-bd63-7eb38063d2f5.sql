-- Fix security issue: Add fixed search_path to trigger functions
-- These functions were missing search_path parameter, which could allow
-- search_path-based attacks if a malicious schema is created

-- 1. update_company_email_domains_updated_at
CREATE OR REPLACE FUNCTION update_company_email_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. update_detected_interviews_updated_at
CREATE OR REPLACE FUNCTION update_detected_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. update_email_template_timestamp (SECURITY DEFINER - most critical)
CREATE OR REPLACE FUNCTION update_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = now();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. update_incident_logs_updated_at
CREATE OR REPLACE FUNCTION update_incident_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5. update_pilot_updated_at
CREATE OR REPLACE FUNCTION update_pilot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 6. update_translation_job_updated_at
CREATE OR REPLACE FUNCTION update_translation_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;