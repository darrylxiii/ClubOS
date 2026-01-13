-- Create Saved Views Table
CREATE TABLE IF NOT EXISTS public.crm_saved_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'contact', 'deal', 'company'
    filters JSONB DEFAULT '{}'::jsonb, -- Store filter configuration
    sorting JSONB DEFAULT '{}'::jsonb, -- Store sorting configuration
    columns JSONB DEFAULT '[]'::jsonb, -- Store visible columns and order
    is_shared BOOLEAN DEFAULT false, -- If true, viewable by organization
    owner_id UUID REFERENCES auth.users(id),
    company_id UUID, -- For multi-tenant organizations (optional, if using company filtering)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast retrieval
CREATE INDEX IF NOT EXISTS idx_crm_saved_views_owner ON public.crm_saved_views(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_saved_views_entity ON public.crm_saved_views(entity_type);

-- RLS Policies
ALTER TABLE public.crm_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own views"
    ON public.crm_saved_views
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can view shared views"
    ON public.crm_saved_views
    FOR SELECT
    USING (is_shared = true);

-- Helper function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crm_saved_views_updated_at
    BEFORE UPDATE ON public.crm_saved_views
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
