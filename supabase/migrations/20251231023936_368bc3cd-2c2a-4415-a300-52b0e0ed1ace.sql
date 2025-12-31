-- Phase 5: Team & Enterprise Features

-- Add recurrence support to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS recurrence_rule text,
ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.bookings(id),
ADD COLUMN IF NOT EXISTS recurrence_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS series_id uuid;

-- Add team assignment tracking
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS assigned_team_member uuid,
ADD COLUMN IF NOT EXISTS assignment_method text CHECK (assignment_method IN ('round_robin', 'collective', 'manual', 'load_balanced'));

-- Add last_booked_at for round robin tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_booked_at timestamptz;

-- Create booking deletion cascade tracking
CREATE TABLE IF NOT EXISTS public.booking_deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  deleted_by uuid,
  deletion_reason text,
  booking_data jsonb,
  related_meeting_ids uuid[],
  deleted_at timestamptz DEFAULT now(),
  gdpr_deletion boolean DEFAULT false
);

-- Create calendar health monitoring table
CREATE TABLE IF NOT EXISTS public.calendar_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calendar_connection_id uuid REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'warning', 'error', 'expired')),
  last_check_at timestamptz DEFAULT now(),
  next_check_at timestamptz,
  error_details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team booking assignments for collective scheduling
CREATE TABLE IF NOT EXISTS public.team_booking_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create booking conversion funnel tracking
CREATE TABLE IF NOT EXISTS public.booking_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  booking_link_id uuid REFERENCES public.booking_links(id),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  user_agent text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for Phase 5
CREATE INDEX IF NOT EXISTS idx_bookings_recurrence_parent ON public.bookings(recurrence_parent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_series_id ON public.bookings(series_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_team_member ON public.bookings(assigned_team_member);
CREATE INDEX IF NOT EXISTS idx_team_booking_assignments_booking ON public.team_booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_team_booking_assignments_member ON public.team_booking_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_calendar_health_user ON public.calendar_health_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_funnel_session ON public.booking_funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_booking_funnel_link ON public.booking_funnel_events(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_profiles_last_booked ON public.profiles(last_booked_at);

-- RLS Policies
ALTER TABLE public.booking_deletion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_booking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_funnel_events ENABLE ROW LEVEL SECURITY;

-- Deletion logs: only admins and the user who deleted
CREATE POLICY "Users can view their own deletion logs" ON public.booking_deletion_logs
  FOR SELECT USING (deleted_by = auth.uid());

-- Calendar health: users can view their own
CREATE POLICY "Users can view their own calendar health" ON public.calendar_health_checks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own calendar health" ON public.calendar_health_checks
  FOR ALL USING (user_id = auth.uid());

-- Team assignments: team members can view their assignments
CREATE POLICY "Team members can view their assignments" ON public.team_booking_assignments
  FOR SELECT USING (team_member_id = auth.uid());

CREATE POLICY "Booking owners can manage team assignments" ON public.team_booking_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

-- Funnel events: public insert for tracking, owners can read
CREATE POLICY "Anyone can insert funnel events" ON public.booking_funnel_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Link owners can view funnel events" ON public.booking_funnel_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.booking_links bl
      WHERE bl.id = booking_link_id AND bl.user_id = auth.uid()
    )
  );

-- Function to select next team member for round robin
CREATE OR REPLACE FUNCTION select_round_robin_member(p_team_members uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selected_member uuid;
BEGIN
  -- Select team member who was booked longest ago (or never)
  SELECT p.id INTO v_selected_member
  FROM profiles p
  WHERE p.id = ANY(p_team_members)
  ORDER BY p.last_booked_at NULLS FIRST, random()
  LIMIT 1;
  
  RETURN v_selected_member;
END;
$$;

-- Function to check collective availability
CREATE OR REPLACE FUNCTION check_collective_availability(
  p_team_members uuid[],
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_busy_count integer;
BEGIN
  -- Check if any team member has a conflict
  SELECT COUNT(*) INTO v_busy_count
  FROM bookings b
  WHERE b.user_id = ANY(p_team_members)
    AND b.status = 'confirmed'
    AND b.scheduled_start < p_scheduled_end
    AND b.scheduled_end > p_scheduled_start;
  
  -- All members must be available (no conflicts)
  RETURN v_busy_count = 0;
END;
$$;

-- Function for GDPR cascading deletion
CREATE OR REPLACE FUNCTION delete_user_booking_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_bookings integer := 0;
  v_deleted_meetings integer := 0;
  v_result jsonb;
BEGIN
  -- Log bookings before deletion
  INSERT INTO booking_deletion_logs (booking_id, deleted_by, deletion_reason, booking_data, gdpr_deletion)
  SELECT id, p_user_id, 'GDPR deletion request', row_to_json(b)::jsonb, true
  FROM bookings b
  WHERE b.user_id = p_user_id;
  
  -- Delete bookings (will cascade to related records)
  DELETE FROM bookings WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_deleted_bookings = ROW_COUNT;
  
  -- Delete booking links
  DELETE FROM booking_links WHERE user_id = p_user_id;
  
  -- Delete meetings where user is host
  DELETE FROM meetings WHERE host_id = p_user_id;
  GET DIAGNOSTICS v_deleted_meetings = ROW_COUNT;
  
  -- Remove user from meeting participants
  DELETE FROM meeting_participants WHERE user_id = p_user_id;
  
  v_result := jsonb_build_object(
    'deleted_bookings', v_deleted_bookings,
    'deleted_meetings', v_deleted_meetings,
    'deleted_at', now()
  );
  
  RETURN v_result;
END;
$$;