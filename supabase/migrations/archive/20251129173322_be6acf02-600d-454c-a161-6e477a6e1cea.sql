-- ==========================================
-- LIVEHUB COMPREHENSIVE DATABASE SCHEMA
-- Community Platform Features
-- ==========================================

-- 1. USER ROLES & PERMISSIONS
-- ==========================================

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Add role to live_server_members if not exists
ALTER TABLE public.live_server_members
ADD COLUMN IF NOT EXISTS role app_role NOT NULL DEFAULT 'user';

-- Channel permissions table
CREATE TABLE IF NOT EXISTS public.live_channel_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES live_channels(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT true,
    can_join BOOLEAN NOT NULL DEFAULT true,
    can_speak BOOLEAN NOT NULL DEFAULT true,
    can_video BOOLEAN NOT NULL DEFAULT true,
    can_screen_share BOOLEAN NOT NULL DEFAULT false,
    can_manage_messages BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (channel_id, role)
);

-- Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'moderator' THEN 2
      ELSE 3
    END
  LIMIT 1
$$;

-- 2. DIRECT MESSAGES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.dm_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_two UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ,
    UNIQUE (participant_one, participant_two),
    CHECK (participant_one < participant_two)
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 3. USER PROFILES & PRESENCE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_profiles_extended (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    bio TEXT,
    status_message TEXT,
    custom_status TEXT,
    status_emoji TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'dark',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_details JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    UNIQUE (user_id, activity_type)
);

-- 4. NOTIFICATIONS SYSTEM
-- ==========================================

DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM (
        'mention',
        'reply',
        'dm',
        'call_invite',
        'channel_invite',
        'server_invite',
        'role_change',
        'achievement'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, notification_type)
);

-- 5. SEARCH INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_live_channel_messages_content_fts ON live_channel_messages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_dm_messages_content_fts ON dm_messages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_participants ON dm_conversations(participant_one, participant_two);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_type ON user_activity(user_id, activity_type);

-- 6. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_channel_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- User roles policies
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;
CREATE POLICY "Users can view all roles" ON user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Channel permissions policies
DROP POLICY IF EXISTS "Members can view channel permissions" ON live_channel_permissions;
CREATE POLICY "Members can view channel permissions" ON live_channel_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage channel permissions" ON live_channel_permissions;
CREATE POLICY "Admins can manage channel permissions" ON live_channel_permissions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- DM conversations policies
DROP POLICY IF EXISTS "Users can view their DM conversations" ON dm_conversations;
CREATE POLICY "Users can view their DM conversations" ON dm_conversations 
    FOR SELECT USING (auth.uid() = participant_one OR auth.uid() = participant_two);
    
DROP POLICY IF EXISTS "Users can create DM conversations" ON dm_conversations;
CREATE POLICY "Users can create DM conversations" ON dm_conversations 
    FOR INSERT WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

-- DM messages policies
DROP POLICY IF EXISTS "Users can view their DM messages" ON dm_messages;
CREATE POLICY "Users can view their DM messages" ON dm_messages 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM dm_conversations 
            WHERE id = conversation_id 
            AND (participant_one = auth.uid() OR participant_two = auth.uid())
        )
    );
    
DROP POLICY IF EXISTS "Users can send DM messages" ON dm_messages;
CREATE POLICY "Users can send DM messages" ON dm_messages 
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
    
DROP POLICY IF EXISTS "Users can update their own messages" ON dm_messages;
CREATE POLICY "Users can update their own messages" ON dm_messages 
    FOR UPDATE USING (auth.uid() = sender_id);

-- User profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON user_profiles_extended;
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles_extended FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles_extended;
CREATE POLICY "Users can update their own profile" ON user_profiles_extended FOR ALL USING (auth.uid() = id);

-- User activity policies
DROP POLICY IF EXISTS "Users can view all activity" ON user_activity;
CREATE POLICY "Users can view all activity" ON user_activity FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own activity" ON user_activity;
CREATE POLICY "Users can manage their own activity" ON user_activity FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can manage their notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their notification preferences" ON notification_preferences 
    FOR ALL USING (auth.uid() = user_id);

-- 7. REALTIME PUBLICATIONS
-- ==========================================

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE dm_conversations;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_activity;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION update_dm_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dm_conversations
    SET last_message_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dm_conversation ON dm_messages;
CREATE TRIGGER trigger_update_dm_conversation
    AFTER INSERT ON dm_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_dm_conversation_timestamp();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dm_conversations_updated_at ON dm_conversations;
CREATE TRIGGER update_dm_conversations_updated_at BEFORE UPDATE ON dm_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_extended_updated_at ON user_profiles_extended;
CREATE TRIGGER update_user_profiles_extended_updated_at BEFORE UPDATE ON user_profiles_extended
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();