
-- Fix blog_reactions: Replace ALL public with granular policies
-- (Previous migration already applied policies 1-6 successfully, 
-- only the reactions DELETE policy failed due to missing user_id column)
DROP POLICY IF EXISTS "Anyone can manage reactions" ON public.blog_reactions;

CREATE POLICY "Anyone can read reactions"
ON public.blog_reactions FOR SELECT TO public
USING (true);

CREATE POLICY "Anyone can insert reactions"
ON public.blog_reactions FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Users can delete own reactions"
ON public.blog_reactions FOR DELETE TO public
USING (anonymous_id IS NOT NULL);
