-- =============================================
-- VALUATION READINESS TABLES (with IF NOT EXISTS)
-- =============================================

-- 1. Risk Registry Table
CREATE TABLE IF NOT EXISTS public.risk_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  likelihood TEXT NOT NULL,
  impact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  owner TEXT,
  mitigation TEXT,
  last_review TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. SLA Violations Table
CREATE TABLE IF NOT EXISTS public.sla_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sla_commitment_id UUID,
  violation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actual_value NUMERIC NOT NULL,
  target_value NUMERIC NOT NULL,
  variance NUMERIC,
  root_cause TEXT,
  remediation TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Data Room Documents Table
CREATE TABLE IF NOT EXISTS public.data_room_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  access_level TEXT NOT NULL DEFAULT 'confidential',
  uploaded_by UUID REFERENCES auth.users(id),
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Capacity Metrics Table
CREATE TABLE IF NOT EXISTS public.capacity_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  current_value NUMERIC NOT NULL,
  max_value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  trend_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'healthy',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Scaling Triggers Table
CREATE TABLE IF NOT EXISTS public.scaling_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric TEXT NOT NULL,
  threshold TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Scaling Readiness Checklist Table
CREATE TABLE IF NOT EXISTS public.scaling_readiness_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  is_complete BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES (using user_roles table)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.risk_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scaling_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scaling_readiness_checklist ENABLE ROW LEVEL SECURITY;

-- Risk Registry Policies
DROP POLICY IF EXISTS "Admins can view all risks" ON public.risk_registry;
CREATE POLICY "Admins can view all risks" ON public.risk_registry
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can insert risks" ON public.risk_registry;
CREATE POLICY "Admins can insert risks" ON public.risk_registry
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can update risks" ON public.risk_registry;
CREATE POLICY "Admins can update risks" ON public.risk_registry
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can delete risks" ON public.risk_registry;
CREATE POLICY "Admins can delete risks" ON public.risk_registry
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- SLA Violations Policies
DROP POLICY IF EXISTS "Admins can manage SLA violations" ON public.sla_violations;
CREATE POLICY "Admins can manage SLA violations" ON public.sla_violations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Data Room Documents Policies
DROP POLICY IF EXISTS "Admins can manage data room documents" ON public.data_room_documents;
CREATE POLICY "Admins can manage data room documents" ON public.data_room_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Capacity Metrics Policies
DROP POLICY IF EXISTS "Admins can manage capacity metrics" ON public.capacity_metrics;
CREATE POLICY "Admins can manage capacity metrics" ON public.capacity_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Scaling Triggers Policies
DROP POLICY IF EXISTS "Admins can manage scaling triggers" ON public.scaling_triggers;
CREATE POLICY "Admins can manage scaling triggers" ON public.scaling_triggers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Scaling Readiness Checklist Policies
DROP POLICY IF EXISTS "Admins can manage checklist" ON public.scaling_readiness_checklist;
CREATE POLICY "Admins can manage checklist" ON public.scaling_readiness_checklist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS update_risk_registry_updated_at ON public.risk_registry;
CREATE TRIGGER update_risk_registry_updated_at
  BEFORE UPDATE ON public.risk_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_room_documents_updated_at ON public.data_room_documents;
CREATE TRIGGER update_data_room_documents_updated_at
  BEFORE UPDATE ON public.data_room_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scaling_triggers_updated_at ON public.scaling_triggers;
CREATE TRIGGER update_scaling_triggers_updated_at
  BEFORE UPDATE ON public.scaling_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scaling_readiness_checklist_updated_at ON public.scaling_readiness_checklist;
CREATE TRIGGER update_scaling_readiness_checklist_updated_at
  BEFORE UPDATE ON public.scaling_readiness_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED DATA (only if tables are empty)
-- =============================================

-- Scaling Readiness Checklist seed
INSERT INTO public.scaling_readiness_checklist (category, item, is_complete)
SELECT * FROM (VALUES
  ('technology', 'Horizontal scaling architecture implemented', false),
  ('technology', 'Database sharding strategy defined', false),
  ('technology', 'CDN and edge caching configured', false),
  ('technology', 'Auto-scaling policies configured', false),
  ('team', 'On-call rotation established', false),
  ('team', 'Incident response team trained', false),
  ('team', 'Knowledge documentation complete', false),
  ('team', 'Cross-training program in place', false),
  ('process', 'Runbooks for common issues created', false),
  ('process', 'Escalation procedures documented', false),
  ('process', 'Change management process defined', false),
  ('process', 'Capacity planning reviews scheduled', false),
  ('finance', 'Cloud cost optimization reviewed', false),
  ('finance', 'Reserved instances purchased', false),
  ('finance', 'Budget forecasting for growth complete', false),
  ('finance', 'Vendor contracts negotiated for scale', false)
) AS v(category, item, is_complete)
WHERE NOT EXISTS (SELECT 1 FROM public.scaling_readiness_checklist LIMIT 1);

-- Capacity Metrics seed
INSERT INTO public.capacity_metrics (metric_name, current_value, max_value, unit, trend_percentage, status)
SELECT * FROM (VALUES
  ('Database Connections', 450, 1000, 'connections', 5, 'healthy'),
  ('API Rate Limit', 8500, 10000, 'req/min', 12, 'warning'),
  ('Storage Usage', 2.1, 5, 'TB', 8, 'healthy'),
  ('Memory Usage', 68, 100, 'percent', -3, 'healthy')
) AS v(metric_name, current_value, max_value, unit, trend_percentage, status)
WHERE NOT EXISTS (SELECT 1 FROM public.capacity_metrics LIMIT 1);

-- Scaling Triggers seed
INSERT INTO public.scaling_triggers (metric, threshold, action, status)
SELECT * FROM (VALUES
  ('CPU Usage', '>80%', 'Add 2 instances', 'active'),
  ('Memory Usage', '>85%', 'Scale up instance', 'active'),
  ('Request Latency', '>500ms', 'Enable additional caching', 'active'),
  ('Error Rate', '>1%', 'Alert on-call + rollback', 'active')
) AS v(metric, threshold, action, status)
WHERE NOT EXISTS (SELECT 1 FROM public.scaling_triggers LIMIT 1);

-- =============================================
-- STORAGE BUCKET FOR DATA ROOM
-- =============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('data-room', 'data-room', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for data-room bucket
DROP POLICY IF EXISTS "Admins can upload to data-room" ON storage.objects;
CREATE POLICY "Admins can upload to data-room" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'data-room' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can view data-room files" ON storage.objects;
CREATE POLICY "Admins can view data-room files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'data-room' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Admins can delete data-room files" ON storage.objects;
CREATE POLICY "Admins can delete data-room files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'data-room' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );