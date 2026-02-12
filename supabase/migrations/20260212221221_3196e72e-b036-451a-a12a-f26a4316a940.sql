
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_events (
    event_type,
    resource_type,
    resource_id,
    actor_id,
    action,
    metadata,
    created_at
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::UUID,
    auth.uid(),
    TG_OP,
    jsonb_build_object(
      'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    ),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
