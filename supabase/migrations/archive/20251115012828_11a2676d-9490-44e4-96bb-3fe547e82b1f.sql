-- Function to extract domain from email
CREATE OR REPLACE FUNCTION extract_email_domain(email TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(SPLIT_PART(email, '@', 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-track partner email domains
CREATE OR REPLACE FUNCTION auto_track_partner_email_domain()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  user_email TEXT;
  user_company_id UUID;
BEGIN
  -- Only process if role is 'partner'
  IF NEW.role = 'partner' THEN
    -- Get user email and company_id from profiles
    SELECT email, company_id INTO user_email, user_company_id
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Only proceed if email and company_id exist
    IF user_email IS NOT NULL AND user_company_id IS NOT NULL THEN
      -- Extract domain from email
      email_domain := extract_email_domain(user_email);
      
      -- Insert domain if it doesn't exist (ignore duplicates)
      INSERT INTO public.company_email_domains (
        company_id,
        domain,
        is_active,
        auto_tracked
      )
      VALUES (
        user_company_id,
        email_domain,
        true,
        true
      )
      ON CONFLICT (company_id, domain) 
      DO UPDATE SET 
        is_active = true,
        auto_tracked = true,
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS trigger_auto_track_partner_domains ON public.user_roles;
CREATE TRIGGER trigger_auto_track_partner_domains
  AFTER INSERT OR UPDATE OF role
  ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION auto_track_partner_email_domain();