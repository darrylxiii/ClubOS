-- WhatsApp Broadcast Consent Table for GDPR compliance
CREATE TABLE public.whatsapp_broadcast_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  consent_status text NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('opted_in', 'opted_out', 'unknown')),
  consent_source text CHECK (consent_source IN ('explicit_reply', 'candidate_initiated', 'manual', 'campaign_unsubscribe')),
  consent_given_at timestamptz,
  consent_revoked_at timestamptz,
  last_campaign_sent_at timestamptz,
  campaign_send_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_phone_consent UNIQUE(phone_number)
);

-- WhatsApp Template Analytics for tracking performance
CREATE TABLE public.whatsapp_template_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  read_count integer DEFAULT 0,
  replied_count integer DEFAULT 0,
  avg_response_time_minutes integer,
  positive_sentiment_count integer DEFAULT 0,
  negative_sentiment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_template_date UNIQUE(template_id, date)
);

-- Enable RLS
ALTER TABLE public.whatsapp_broadcast_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consent table
CREATE POLICY "Authenticated users can view broadcast consent"
  ON public.whatsapp_broadcast_consent FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage broadcast consent"
  ON public.whatsapp_broadcast_consent FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for template analytics
CREATE POLICY "Authenticated users can view template analytics"
  ON public.whatsapp_template_analytics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage template analytics"
  ON public.whatsapp_template_analytics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_broadcast_consent_phone ON public.whatsapp_broadcast_consent(phone_number);
CREATE INDEX idx_broadcast_consent_status ON public.whatsapp_broadcast_consent(consent_status);
CREATE INDEX idx_broadcast_consent_candidate ON public.whatsapp_broadcast_consent(candidate_id);
CREATE INDEX idx_template_analytics_template ON public.whatsapp_template_analytics(template_id);
CREATE INDEX idx_template_analytics_date ON public.whatsapp_template_analytics(date);

-- Trigger to update updated_at
CREATE TRIGGER update_whatsapp_broadcast_consent_updated_at
  BEFORE UPDATE ON public.whatsapp_broadcast_consent
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_template_analytics_updated_at
  BEFORE UPDATE ON public.whatsapp_template_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_broadcast_consent;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_template_analytics;