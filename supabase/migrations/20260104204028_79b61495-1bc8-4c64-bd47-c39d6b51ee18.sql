-- Phase 3: Autonomous Workflows - Event Triggers
-- Create trigger function to publish agent events from key tables

CREATE OR REPLACE FUNCTION public.publish_agent_event()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to get user_id from the record
  v_user_id := COALESCE(
    (NEW).user_id,
    (OLD).user_id,
    NULL
  );
  
  -- Only insert if we have a valid user_id
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.agent_events (
      event_type, 
      event_source, 
      entity_type, 
      entity_id, 
      user_id, 
      event_data,
      priority
    )
    VALUES (
      TG_OP || '_' || TG_TABLE_NAME,
      'database',
      TG_TABLE_NAME,
      COALESCE((NEW).id, (OLD).id),
      v_user_id,
      jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'new_data', CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
        'old_data', CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END
      ),
      CASE 
        WHEN TG_TABLE_NAME = 'applications' THEN 8
        WHEN TG_TABLE_NAME = 'pilot_tasks' THEN 6
        WHEN TG_TABLE_NAME = 'quantum_meetings' THEN 7
        ELSE 5
      END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers on key tables for autonomous agent processing

-- Applications trigger
DROP TRIGGER IF EXISTS applications_agent_event ON public.applications;
CREATE TRIGGER applications_agent_event
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.publish_agent_event();

-- Pilot tasks trigger  
DROP TRIGGER IF EXISTS pilot_tasks_agent_event ON public.pilot_tasks;
CREATE TRIGGER pilot_tasks_agent_event
  AFTER INSERT OR UPDATE ON public.pilot_tasks
  FOR EACH ROW EXECUTE FUNCTION public.publish_agent_event();

-- Agent goals trigger (self-referential for goal tracking)
DROP TRIGGER IF EXISTS agent_goals_event ON public.agent_goals;
CREATE TRIGGER agent_goals_event
  AFTER INSERT OR UPDATE ON public.agent_goals
  FOR EACH ROW EXECUTE FUNCTION public.publish_agent_event();

-- Seed default autonomy settings for existing users
INSERT INTO public.agent_autonomy_settings (user_id, action_type, autonomy_level, notification_preference)
SELECT p.id, 'send_follow_up', 'suggest', 'summary'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_autonomy_settings aas 
  WHERE aas.user_id = p.id AND aas.action_type = 'send_follow_up'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_autonomy_settings (user_id, action_type, autonomy_level, notification_preference)
SELECT p.id, 'schedule_interview', 'autonomous', 'immediate'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_autonomy_settings aas 
  WHERE aas.user_id = p.id AND aas.action_type = 'schedule_interview'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_autonomy_settings (user_id, action_type, autonomy_level, notification_preference)
SELECT p.id, 'create_task', 'autonomous', 'none'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_autonomy_settings aas 
  WHERE aas.user_id = p.id AND aas.action_type = 'create_task'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_autonomy_settings (user_id, action_type, autonomy_level, notification_preference)
SELECT p.id, 'submit_to_client', 'ask', 'immediate'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_autonomy_settings aas 
  WHERE aas.user_id = p.id AND aas.action_type = 'submit_to_client'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_autonomy_settings (user_id, action_type, autonomy_level, notification_preference)
SELECT p.id, 'make_offer', 'disabled', 'immediate'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_autonomy_settings aas 
  WHERE aas.user_id = p.id AND aas.action_type = 'make_offer'
)
ON CONFLICT DO NOTHING;