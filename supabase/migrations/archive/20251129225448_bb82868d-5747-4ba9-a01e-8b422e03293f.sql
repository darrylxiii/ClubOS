-- Add UPDATE policy for user_page_analytics to allow tracking service to update on page exit
CREATE POLICY "Users can update own page analytics"
ON public.user_page_analytics
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);