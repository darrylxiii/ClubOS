-- Add 'referral' to notification types if not exists
DO $$
BEGIN
  -- Drop the old constraint if it exists
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  -- Add new constraint with 'referral' type included
  ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('task', 'message', 'application', 'interview', 'system', 'referral'));
EXCEPTION
  WHEN others THEN
    NULL; -- Ignore if constraint doesn't exist
END $$;

-- Create function to notify referrers on application stage changes
CREATE OR REPLACE FUNCTION public.notify_referrer_on_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_name TEXT;
  v_candidate_name TEXT;
  v_job_title TEXT;
  v_company_name TEXT;
  v_old_stage TEXT;
  v_new_stage TEXT;
  v_earning_record RECORD;
BEGIN
  -- Only proceed if status or stage changed
  IF (TG_OP = 'UPDATE' AND 
      (OLD.status IS DISTINCT FROM NEW.status OR 
       OLD.current_stage_index IS DISTINCT FROM NEW.current_stage_index)) THEN
    
    -- Get referral earnings record for this application
    FOR v_earning_record IN 
      SELECT 
        re.referrer_id,
        re.id as earning_id,
        p.full_name as referrer_name,
        j.title as job_title,
        c.name as company_name
      FROM referral_earnings re
      JOIN profiles p ON p.id = re.referrer_id
      JOIN jobs j ON j.id = re.job_id
      LEFT JOIN companies c ON c.id = j.company_id
      WHERE re.application_id = NEW.id
        AND re.status IN ('pending', 'projected')
    LOOP
      -- Get candidate name
      v_candidate_name := COALESCE(NEW.candidate_full_name, 'A candidate');
      
      -- Determine stage names from JSON
      v_old_stage := COALESCE(
        (NEW.stages->(OLD.current_stage_index::int)->>'name')::text,
        'Previous Stage'
      );
      v_new_stage := COALESCE(
        (NEW.stages->(NEW.current_stage_index::int)->>'name')::text,
        'Next Stage'
      );
      
      -- Create notification for the referrer
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        category,
        action_url,
        metadata
      ) VALUES (
        v_earning_record.referrer_id,
        'referral',
        CASE 
          WHEN NEW.status = 'hired' THEN '🎉 Congratulations! Your referral was hired'
          WHEN NEW.status = 'rejected' THEN 'Referral update: Application closed'
          ELSE 'Your referral advanced to ' || v_new_stage
        END,
        CASE 
          WHEN NEW.status = 'hired' THEN 
            v_candidate_name || ' has been hired at ' || COALESCE(v_earning_record.company_name, 'the company') || ' for ' || v_earning_record.job_title || '. Your referral bonus is being processed!'
          WHEN NEW.status = 'rejected' THEN 
            v_candidate_name || '''s application for ' || v_earning_record.job_title || ' has been closed.'
          ELSE 
            v_candidate_name || ' has advanced from ' || v_old_stage || ' to ' || v_new_stage || ' for ' || v_earning_record.job_title || ' at ' || COALESCE(v_earning_record.company_name, 'the company') || '.'
        END,
        CASE 
          WHEN NEW.status = 'hired' THEN 'success'
          WHEN NEW.status = 'rejected' THEN 'info'
          ELSE 'update'
        END,
        '/referrals',
        jsonb_build_object(
          'application_id', NEW.id,
          'earning_id', v_earning_record.earning_id,
          'job_id', NEW.job_id,
          'old_stage', v_old_stage,
          'new_stage', v_new_stage,
          'status', NEW.status
        )
      );
      
      -- Update referral earnings status if hired
      IF NEW.status = 'hired' THEN
        UPDATE referral_earnings
        SET status = 'realized',
            payment_status = 'pending',
            updated_at = NOW()
        WHERE id = v_earning_record.earning_id;
      ELSIF NEW.status = 'rejected' THEN
        UPDATE referral_earnings
        SET status = 'forfeited',
            updated_at = NOW()
        WHERE id = v_earning_record.earning_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for application stage changes
DROP TRIGGER IF EXISTS trigger_notify_referrer_on_stage_change ON applications;
CREATE TRIGGER trigger_notify_referrer_on_stage_change
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_referrer_on_stage_change();

-- Create function to notify referrer when new application is submitted via their referral
CREATE OR REPLACE FUNCTION public.notify_referrer_on_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_job_title TEXT;
  v_company_name TEXT;
  v_candidate_name TEXT;
BEGIN
  -- Check if this application came from a referral
  IF NEW.source_context->>'referrer_id' IS NOT NULL THEN
    v_referrer_id := (NEW.source_context->>'referrer_id')::uuid;
    v_candidate_name := COALESCE(NEW.candidate_full_name, 'Someone');
    
    -- Get job details
    SELECT j.title, c.name INTO v_job_title, v_company_name
    FROM jobs j
    LEFT JOIN companies c ON c.id = j.company_id
    WHERE j.id = NEW.job_id;
    
    -- Create notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      category,
      action_url,
      metadata
    ) VALUES (
      v_referrer_id,
      'referral',
      '🔔 New application via your referral',
      v_candidate_name || ' applied for ' || COALESCE(v_job_title, 'a position') || ' at ' || COALESCE(v_company_name, 'a company') || ' using your referral link.',
      'info',
      '/referrals',
      jsonb_build_object(
        'application_id', NEW.id,
        'job_id', NEW.job_id,
        'event_type', 'new_application'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new applications
DROP TRIGGER IF EXISTS trigger_notify_referrer_on_new_application ON applications;
CREATE TRIGGER trigger_notify_referrer_on_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_referrer_on_new_application();

-- Add index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_type_user 
ON notifications(user_id, type) 
WHERE type = 'referral';