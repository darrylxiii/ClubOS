-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.crm_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'contact', 'deal', 'company', etc.
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    actor_id UUID REFERENCES auth.users(id),
    changes JSONB DEFAULT '{}'::jsonb, -- Store { field: { old: 'val', new: 'val' } }
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast querying
CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_entity ON public.crm_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_actor ON public.crm_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_created_at ON public.crm_audit_logs(created_at DESC);

-- RLS Policies
ALTER TABLE public.crm_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Strategists can view audit logs"
    ON public.crm_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'strategist')
        )
    );

CREATE POLICY "Users can create audit logs"
    ON public.crm_audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() = actor_id);

-- Trigger Function to auto-log changes
CREATE OR REPLACE FUNCTION log_crm_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_action TEXT;
    audit_changes JSONB := '{}'::jsonb;
    old_row JSONB;
    new_row JSONB;
    key TEXT;
    val_old JSONB;
    val_new JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        audit_action := 'delete';
        audit_changes := to_jsonb(OLD);
        
        INSERT INTO public.crm_audit_logs (entity_type, entity_id, action, actor_id, changes)
        VALUES (TG_TABLE_NAME, OLD.id, audit_action, auth.uid(), audit_changes);
        
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action := 'update';
        old_row := to_jsonb(OLD);
        new_row := to_jsonb(NEW);
        
        -- Compare fields to find what changed
        FOR key IN SELECT jsonb_object_keys(new_row)
        LOOP
            val_old := old_row->key;
            val_new := new_row->key;
            
            -- If values are different (and not both null/undefined equivalent)
            IF (val_old IS DISTINCT FROM val_new) THEN
                audit_changes := jsonb_set(audit_changes, ARRAY[key], jsonb_build_object('old', val_old, 'new', val_new));
            END IF;
        END LOOP;
        
        -- Only log if there are actual changes
        IF (audit_changes != '{}'::jsonb) THEN
            INSERT INTO public.crm_audit_logs (entity_type, entity_id, action, actor_id, changes)
            VALUES (TG_TABLE_NAME, NEW.id, audit_action, auth.uid(), audit_changes);
        END IF;
        
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        audit_action := 'create';
        audit_changes := to_jsonb(NEW);
        
        INSERT INTO public.crm_audit_logs (entity_type, entity_id, action, actor_id, changes)
        VALUES (TG_TABLE_NAME, NEW.id, audit_action, auth.uid(), audit_changes);
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Triggers to CRM tables (add more as needed)
DROP TRIGGER IF EXISTS audit_crm_contacts ON public.crm_contacts;
CREATE TRIGGER audit_crm_contacts
    AFTER INSERT OR UPDATE OR DELETE ON public.crm_contacts
    FOR EACH ROW EXECUTE FUNCTION log_crm_changes();

DROP TRIGGER IF EXISTS audit_crm_deals ON public.crm_deals;
CREATE TRIGGER audit_crm_deals
    AFTER INSERT OR UPDATE OR DELETE ON public.crm_deals
    FOR EACH ROW EXECUTE FUNCTION log_crm_changes();

DROP TRIGGER IF EXISTS audit_crm_companies ON public.companies;
CREATE TRIGGER audit_crm_companies
    AFTER INSERT OR UPDATE OR DELETE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION log_crm_changes();
