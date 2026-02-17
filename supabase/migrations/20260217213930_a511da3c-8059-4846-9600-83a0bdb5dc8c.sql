
CREATE TABLE IF NOT EXISTS public.user_pinned_kpis (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kpi_id text NOT NULL,
    kpi_domain text NOT NULL,
    pinned_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_kpi_unique UNIQUE (user_id, kpi_id)
);

CREATE INDEX IF NOT EXISTS idx_user_pinned_kpis_user_id ON public.user_pinned_kpis(user_id);

ALTER TABLE public.user_pinned_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pinned KPIs"
ON public.user_pinned_kpis FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can pin their own KPIs"
ON public.user_pinned_kpis FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unpin their own KPIs"
ON public.user_pinned_kpis FOR DELETE
USING (auth.uid() = user_id);
