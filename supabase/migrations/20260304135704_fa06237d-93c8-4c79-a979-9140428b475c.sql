
-- Tighten blog_post_relations RLS: restrict writes to admin/strategist
DROP POLICY IF EXISTS "Authenticated can manage relations" ON public.blog_post_relations;

CREATE POLICY "Admins and strategists can manage relations"
ON public.blog_post_relations
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'strategist')
);
