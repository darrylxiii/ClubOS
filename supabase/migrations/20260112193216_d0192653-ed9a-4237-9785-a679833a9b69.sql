
-- Fix SECURITY DEFINER view issue: rag_metrics_summary needs security_invoker
ALTER VIEW public.rag_metrics_summary SET (security_invoker = true);
