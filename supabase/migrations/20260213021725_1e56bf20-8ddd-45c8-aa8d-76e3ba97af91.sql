DROP POLICY IF EXISTS "Users can insert own calendar connections" ON public.calendar_connections;
CREATE POLICY "Users can insert own calendar connections"
  ON public.calendar_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);