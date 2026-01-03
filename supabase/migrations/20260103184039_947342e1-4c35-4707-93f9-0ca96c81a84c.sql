-- Fix security definer views by setting security_invoker
ALTER VIEW cash_flow_pipeline SET (security_invoker = on);
ALTER VIEW data_integrity_issues SET (security_invoker = on);