-- Project Messages table for real-time communication
CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.marketplace_projects(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.freelance_contracts(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create
DROP POLICY IF EXISTS "Users can view their own messages" ON public.project_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.project_messages;
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.project_messages;

CREATE POLICY "Users can view their own messages"
ON public.project_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
ON public.project_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark messages as read"
ON public.project_messages
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_messages_project ON public.project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_contract ON public.project_messages(contract_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_participants ON public.project_messages(sender_id, recipient_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;

-- Connects transactions table
CREATE TABLE IF NOT EXISTS public.connects_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INT NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.connects_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own connect transactions" ON public.connects_transactions;
DROP POLICY IF EXISTS "Users can insert connect transactions" ON public.connects_transactions;

CREATE POLICY "Users can view their own connect transactions"
ON public.connects_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert connect transactions"
ON public.connects_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_connects_transactions_user ON public.connects_transactions(user_id);

-- Freelancer badges table
CREATE TABLE IF NOT EXISTS public.freelancer_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.freelancer_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view badges" ON public.freelancer_badges;
DROP POLICY IF EXISTS "Users can manage their badges" ON public.freelancer_badges;

CREATE POLICY "Anyone can view badges"
ON public.freelancer_badges
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their badges"
ON public.freelancer_badges
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_freelancer_badges_user ON public.freelancer_badges(user_id);

-- Add package pricing columns to freelancer_gigs
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS basic_description TEXT;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS basic_delivery_days INT DEFAULT 7;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS basic_revisions INT DEFAULT 1;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS basic_features JSONB DEFAULT '[]';
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS standard_price NUMERIC(10,2);
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS standard_description TEXT;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS standard_delivery_days INT DEFAULT 5;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS standard_revisions INT DEFAULT 2;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS standard_features JSONB DEFAULT '[]';
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS premium_price NUMERIC(10,2);
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS premium_description TEXT;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS premium_delivery_days INT DEFAULT 3;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS premium_revisions INT DEFAULT 5;
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS premium_features JSONB DEFAULT '[]';
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]';
ALTER TABLE public.freelancer_gigs ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]';