-- Phase 1: Security Hardening - Reinstall extensions in extensions schema
-- pg_net doesn't support SET SCHEMA, so we need to drop and recreate

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Drop pg_net from public (will recreate in extensions)
DROP EXTENSION IF EXISTS pg_net;

-- Recreate pg_net in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Move vector extension to extensions schema (vector supports SET SCHEMA)
ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant execute on extension functions to roles
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO authenticated, service_role;