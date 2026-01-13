-- Add missing RLS policies for interaction tables

-- Policies for interaction_participants
CREATE POLICY "Admins and strategists can manage participants"
ON interaction_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Policies for interaction_messages
CREATE POLICY "Admins and strategists can manage messages"
ON interaction_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Policies for interaction_insights
CREATE POLICY "Admins and strategists can manage insights"
ON interaction_insights FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Policies for stakeholder_relationships
CREATE POLICY "Admins and strategists can manage relationships"
ON stakeholder_relationships FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Policies for whatsapp_imports
CREATE POLICY "Admins and strategists can manage imports"
ON whatsapp_imports FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

-- Policies for interaction_ml_features
CREATE POLICY "Admins and strategists can manage ml features"
ON interaction_ml_features FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);