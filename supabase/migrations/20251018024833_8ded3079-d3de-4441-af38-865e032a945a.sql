
-- Add RLS policies for module_experts table
-- This table links academy modules to expert contributors

-- Admins can manage all expert assignments
CREATE POLICY "Admins can manage all module experts"
ON public.module_experts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Module creators can manage experts for their modules
CREATE POLICY "Module creators can manage their experts"
ON public.module_experts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_experts.module_id
    AND m.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.modules m
    WHERE m.id = module_experts.module_id
    AND m.created_by = auth.uid()
  )
);

-- Anyone can view module experts (for attribution)
CREATE POLICY "Anyone can view module experts"
ON public.module_experts
FOR SELECT
USING (true);

-- Experts can view their own associations
CREATE POLICY "Experts can view their own associations"
ON public.module_experts
FOR SELECT
USING (auth.uid() = expert_id);
