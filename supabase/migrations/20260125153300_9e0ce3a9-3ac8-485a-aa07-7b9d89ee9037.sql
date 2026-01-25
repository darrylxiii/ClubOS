-- Phase 1: No-Show Prediction & Prevention

-- No-show prediction model and scores
CREATE TABLE booking_no_show_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  prediction_factors JSONB DEFAULT '{}',
  intervention_triggered BOOLEAN DEFAULT false,
  intervention_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historical no-show patterns for ML
CREATE TABLE booking_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_email_domain TEXT NOT NULL UNIQUE,
  total_bookings INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  avg_lead_time_hours NUMERIC,
  common_booking_hours INTEGER[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_no_show_booking ON booking_no_show_predictions(booking_id);
CREATE INDEX idx_no_show_risk_level ON booking_no_show_predictions(risk_level);
CREATE INDEX idx_behavior_domain ON booking_behavior_patterns(guest_email_domain);

-- Enable RLS
ALTER TABLE booking_no_show_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_behavior_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_no_show_predictions
CREATE POLICY "Users can view predictions for their bookings"
ON booking_no_show_predictions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN booking_links bl ON b.booking_link_id = bl.id
    WHERE b.id = booking_no_show_predictions.booking_id
    AND bl.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage predictions"
ON booking_no_show_predictions FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for booking_behavior_patterns (read-only for authenticated, write for service)
CREATE POLICY "Authenticated users can view behavior patterns"
ON booking_behavior_patterns FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage behavior patterns"
ON booking_behavior_patterns FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update behavior patterns after booking completion
CREATE OR REPLACE FUNCTION update_booking_behavior_pattern()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
  v_lead_time_hours NUMERIC;
  v_is_no_show BOOLEAN;
BEGIN
  -- Extract domain from guest email
  v_domain := split_part(NEW.guest_email, '@', 2);
  
  -- Calculate lead time in hours
  v_lead_time_hours := EXTRACT(EPOCH FROM (NEW.scheduled_start - NEW.created_at)) / 3600;
  
  -- Check if this is a no-show (status = 'no_show' or similar)
  v_is_no_show := NEW.status = 'no_show';
  
  -- Upsert behavior pattern
  INSERT INTO booking_behavior_patterns (
    guest_email_domain,
    total_bookings,
    no_show_count,
    cancellation_count,
    avg_lead_time_hours,
    updated_at
  ) VALUES (
    v_domain,
    1,
    CASE WHEN v_is_no_show THEN 1 ELSE 0 END,
    CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
    v_lead_time_hours,
    NOW()
  )
  ON CONFLICT (guest_email_domain) DO UPDATE SET
    total_bookings = booking_behavior_patterns.total_bookings + 1,
    no_show_count = booking_behavior_patterns.no_show_count + 
      CASE WHEN v_is_no_show THEN 1 ELSE 0 END,
    cancellation_count = booking_behavior_patterns.cancellation_count + 
      CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
    avg_lead_time_hours = (
      (booking_behavior_patterns.avg_lead_time_hours * booking_behavior_patterns.total_bookings + v_lead_time_hours) / 
      (booking_behavior_patterns.total_bookings + 1)
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Trigger to update patterns when booking status changes
CREATE TRIGGER trigger_update_behavior_pattern
AFTER UPDATE OF status ON bookings
FOR EACH ROW
WHEN (NEW.status IN ('completed', 'no_show', 'cancelled') AND OLD.status != NEW.status)
EXECUTE FUNCTION update_booking_behavior_pattern();