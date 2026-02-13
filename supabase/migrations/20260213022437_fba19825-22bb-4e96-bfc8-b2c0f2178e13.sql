DROP POLICY "Users can update own calendar connections" ON public.calendar_connections;

CREATE POLICY "Users can update own calendar connections"
  ON public.calendar_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);