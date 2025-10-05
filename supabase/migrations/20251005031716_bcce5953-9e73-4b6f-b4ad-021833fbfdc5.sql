-- Activity Feed / Pulse Events Table
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('interview_scheduled', 'job_applied', 'offer_received', 'profile_updated', 'job_published', 'company_milestone', 'profile_view', 'connection_made')),
  event_data JSONB DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'connections', 'private')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profile Views Tracking
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewed_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

-- AI Conversations Table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('career_advisor', 'email_generator', 'match_explainer', 'copilot')),
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Copilot Tips
CREATE TABLE IF NOT EXISTS public.ai_copilot_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_type TEXT NOT NULL,
  tip_content TEXT NOT NULL,
  context_page TEXT,
  is_dismissed BOOLEAN DEFAULT false,
  shown_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_tips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_feed
CREATE POLICY "Users can view public activity" ON public.activity_feed
  FOR SELECT USING (visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can create their own activity" ON public.activity_feed
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for profile_views
CREATE POLICY "Users can view their own profile views" ON public.profile_views
  FOR SELECT USING (viewed_user_id = auth.uid());

CREATE POLICY "Anyone can record profile views" ON public.profile_views
  FOR INSERT WITH CHECK (true);

-- RLS Policies for ai_conversations
CREATE POLICY "Users can manage their own AI conversations" ON public.ai_conversations
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for ai_copilot_tips
CREATE POLICY "Users can manage their own copilot tips" ON public.ai_copilot_tips
  FOR ALL USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX idx_profile_views_viewed_user ON public.profile_views(viewed_user_id, viewed_at DESC);
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_views;