-- Function to manually sync all existing partner email domains
-- This is useful for backfilling domains for partners that existed before the trigger
CREATE OR REPLACE FUNCTION sync_existing_partner_domains()
RETURNS TABLE (
  synced_count INT,
  company_id UUID,
  domain TEXT
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.company_email_domains (
    company_id,
    domain,
    is_active,
    auto_tracked
  )
  SELECT DISTINCT
    p.company_id,
    extract_email_domain(p.email) as domain,
    true,
    true
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'partner'
    AND p.email IS NOT NULL
    AND p.company_id IS NOT NULL
  ON CONFLICT (company_id, domain) 
  DO UPDATE SET 
    is_active = true,
    auto_tracked = true,
    updated_at = NOW()
  RETURNING 1 as synced_count, company_email_domains.company_id, company_email_domains.domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;