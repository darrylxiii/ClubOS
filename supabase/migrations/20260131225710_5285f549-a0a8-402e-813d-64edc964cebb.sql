
-- Tighten remaining UPDATE policies with WITH CHECK (true)

-- success_patterns: Only admins can update
DROP POLICY IF EXISTS "success_patterns_update_service" ON public.success_patterns;
CREATE POLICY "Admins can update success patterns"
  ON public.success_patterns FOR UPDATE
  TO authenticated
  USING (public.has_admin_role(auth.uid()))
  WITH CHECK (public.has_admin_role(auth.uid()));

-- voice_booking_sessions: Only session owner (via user_id) can update
DROP POLICY IF EXISTS "Hosts can update voice sessions" ON public.voice_booking_sessions;
CREATE POLICY "Session owners can update voice sessions"
  ON public.voice_booking_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- whatsapp_booking_sessions: System-level updates (no user_id column)
-- This needs to be handled by service role or tied to booking link ownership
DROP POLICY IF EXISTS "Hosts can update whatsapp sessions" ON public.whatsapp_booking_sessions;
CREATE POLICY "System can update whatsapp sessions"
  ON public.whatsapp_booking_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM booking_links bl
      WHERE bl.id = whatsapp_booking_sessions.booking_link_id
        AND bl.user_id = auth.uid()
    )
  );
