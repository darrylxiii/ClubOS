-- Connects Subscriptions for monthly allowances
CREATE TABLE IF NOT EXISTS public.connects_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro', 'enterprise')),
  monthly_connects INT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Freelancer Teams for agency accounts
CREATE TABLE IF NOT EXISTS public.freelancer_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.freelancer_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES freelancer_teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  revenue_share_percentage NUMERIC(5,2) DEFAULT 100,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- Add boost columns to marketplace_projects if not exist
ALTER TABLE public.marketplace_projects 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS boost_level INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.connects_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions" ON public.connects_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions" ON public.connects_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active teams" ON public.freelancer_teams
  FOR SELECT USING (is_active = true);

CREATE POLICY "Team owners can manage teams" ON public.freelancer_teams
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Team members can view their teams" ON public.freelancer_team_members
  FOR SELECT USING (auth.uid() = member_id OR EXISTS (
    SELECT 1 FROM freelancer_teams WHERE id = team_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Team owners can manage members" ON public.freelancer_team_members
  FOR ALL USING (EXISTS (
    SELECT 1 FROM freelancer_teams WHERE id = team_id AND owner_id = auth.uid()
  ));