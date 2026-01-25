-- =====================================================
-- Guest Permissions & Time Proposals System
-- =====================================================

-- 1. Create booking_guests table for individual guest tracking with permissions
CREATE TABLE public.booking_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  access_token UUID DEFAULT gen_random_uuid() NOT NULL,
  
  -- Permissions delegated by booker (capped by host settings)
  can_cancel BOOLEAN DEFAULT false,
  can_reschedule BOOLEAN DEFAULT false,
  can_propose_times BOOLEAN DEFAULT false,
  can_add_attendees BOOLEAN DEFAULT false,
  
  -- Tracking
  email_sent_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(booking_id, email)
);

-- Indexes for fast lookups
CREATE INDEX idx_booking_guests_booking_id ON booking_guests(booking_id);
CREATE INDEX idx_booking_guests_access_token ON booking_guests(access_token);
CREATE INDEX idx_booking_guests_email ON booking_guests(email);

-- 2. Create booking_time_proposals table for alternative time suggestions
CREATE TABLE public.booking_time_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  
  proposed_by_email TEXT NOT NULL,
  proposed_by_name TEXT,
  proposed_by_type TEXT NOT NULL CHECK (proposed_by_type IN ('booker', 'guest')),
  
  proposed_start TIMESTAMPTZ NOT NULL,
  proposed_end TIMESTAMPTZ NOT NULL,
  message TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  responded_at TIMESTAMPTZ,
  response_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours')
);

CREATE INDEX idx_proposals_booking_id ON booking_time_proposals(booking_id);
CREATE INDEX idx_proposals_status ON booking_time_proposals(status);

-- 3. Add guest_permissions to booking_links (host-level control)
ALTER TABLE public.booking_links
ADD COLUMN IF NOT EXISTS guest_permissions JSONB DEFAULT '{
  "allow_guest_cancel": false,
  "allow_guest_reschedule": false,
  "allow_guest_propose_times": true,
  "allow_guest_add_attendees": false,
  "booker_can_delegate": true
}'::jsonb;

COMMENT ON COLUMN booking_links.guest_permissions IS 
  'Host-controlled permissions: what guests/bookers can do with this booking type';

-- 4. Add delegated_permissions to bookings (booker-level control for their guests)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS delegated_permissions JSONB DEFAULT '{
  "can_cancel": false,
  "can_reschedule": false,
  "can_propose_times": true,
  "can_add_attendees": false
}'::jsonb;

COMMENT ON COLUMN bookings.delegated_permissions IS 
  'Permissions the booker grants to additional guests (capped by host settings)';

-- 5. Add cancelled_by tracking to bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancelled_by_email TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by_type TEXT CHECK (cancelled_by_type IN ('host', 'booker', 'guest'));

-- 6. Enable RLS
ALTER TABLE booking_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_time_proposals ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for booking_guests

-- Hosts can view their booking guests
CREATE POLICY "Hosts can view their booking guests" ON booking_guests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN booking_links bl ON b.booking_link_id = bl.id
      WHERE b.id = booking_guests.booking_id
      AND bl.user_id = auth.uid()
    )
  );

-- Hosts can manage their booking guests
CREATE POLICY "Hosts can manage their booking guests" ON booking_guests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN booking_links bl ON b.booking_link_id = bl.id
      WHERE b.id = booking_guests.booking_id
      AND bl.user_id = auth.uid()
    )
  );

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role can manage booking guests" ON booking_guests
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. RLS Policies for booking_time_proposals

-- Hosts can view proposals for their bookings
CREATE POLICY "Hosts can view proposals for their bookings" ON booking_time_proposals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN booking_links bl ON b.booking_link_id = bl.id
      WHERE b.id = booking_time_proposals.booking_id
      AND bl.user_id = auth.uid()
    )
  );

-- Hosts can manage proposals
CREATE POLICY "Hosts can manage proposals" ON booking_time_proposals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN booking_links bl ON b.booking_link_id = bl.id
      WHERE b.id = booking_time_proposals.booking_id
      AND bl.user_id = auth.uid()
    )
  );

-- Allow service role full access
CREATE POLICY "Service role can manage proposals" ON booking_time_proposals
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 9. Enable realtime for guest management
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_time_proposals;