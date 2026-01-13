-- Create note_mentions table for tracking @mentions in candidate notes
CREATE TABLE IF NOT EXISTS public.note_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.candidate_notes(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(note_id, mentioned_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_mentions_user ON public.note_mentions(mentioned_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_note_mentions_note ON public.note_mentions(note_id);

-- Enable RLS
ALTER TABLE public.note_mentions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see mentions where they are mentioned
CREATE POLICY "Users can view their own mentions"
  ON public.note_mentions FOR SELECT
  USING (mentioned_user_id = auth.uid());

-- Policy: Users can mark their mentions as read
CREATE POLICY "Users can update their own mentions"
  ON public.note_mentions FOR UPDATE
  USING (mentioned_user_id = auth.uid());

-- Policy: Admins/strategists/partners can create mentions
CREATE POLICY "Team members can create mentions"
  ON public.note_mentions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'strategist'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role)
  );

-- Policy: Admins can view all mentions
CREATE POLICY "Admins can view all mentions"
  ON public.note_mentions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create full-text search function for notes
CREATE OR REPLACE FUNCTION public.search_candidate_notes(
  p_candidate_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_note_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  candidate_id UUID,
  note_type TEXT,
  title TEXT,
  content TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pinned BOOLEAN,
  tags TEXT[],
  visibility TEXT,
  creator_name TEXT,
  creator_email TEXT,
  mention_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role::text INTO v_user_role
  FROM user_roles
  WHERE user_id = COALESCE(p_user_id, auth.uid())
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'strategist' THEN 2
      WHEN 'partner' THEN 3
      ELSE 4
    END
  LIMIT 1;

  RETURN QUERY
  SELECT 
    cn.id,
    cn.candidate_id,
    cn.note_type,
    cn.title,
    cn.content,
    cn.created_by,
    cn.created_at,
    cn.updated_at,
    cn.pinned,
    cn.tags,
    cn.visibility,
    p.full_name as creator_name,
    p.email as creator_email,
    COUNT(nm.id) as mention_count
  FROM candidate_notes cn
  LEFT JOIN profiles p ON p.id = cn.created_by
  LEFT JOIN note_mentions nm ON nm.note_id = cn.id
  WHERE cn.candidate_id = p_candidate_id
    AND (p_search_term IS NULL OR 
         cn.content ILIKE '%' || p_search_term || '%' OR
         cn.title ILIKE '%' || p_search_term || '%')
    AND (p_note_type IS NULL OR cn.note_type = p_note_type)
    AND (
      -- Visibility rules based on role
      (v_user_role IN ('admin', 'strategist')) OR
      (v_user_role = 'partner' AND cn.visibility IN ('partner_shared', 'general')) OR
      (v_user_role = 'user' AND cn.visibility = 'general')
    )
  GROUP BY cn.id, p.full_name, p.email
  ORDER BY cn.pinned DESC, cn.created_at DESC;
END;
$$;

-- Function to extract mentioned user IDs from note content
CREATE OR REPLACE FUNCTION public.extract_mentions_from_note(p_content TEXT)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ids UUID[] := ARRAY[]::UUID[];
  v_mention TEXT;
  v_user_id UUID;
BEGIN
  -- Extract all @[uuid] patterns from content
  FOR v_mention IN 
    SELECT unnest(regexp_matches(p_content, '@\[([a-f0-9-]{36})\]', 'g'))
  LOOP
    v_user_id := v_mention::UUID;
    IF v_user_id IS NOT NULL AND NOT (v_user_id = ANY(v_user_ids)) THEN
      v_user_ids := array_append(v_user_ids, v_user_id);
    END IF;
  END LOOP;
  
  RETURN v_user_ids;
END;
$$;

-- Trigger function to create mention records and notifications
CREATE OR REPLACE FUNCTION public.process_note_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentioned_user_id UUID;
  v_mentioned_users UUID[];
  v_candidate_name TEXT;
  v_creator_name TEXT;
BEGIN
  -- Extract mentioned user IDs from content
  v_mentioned_users := extract_mentions_from_note(NEW.content);
  
  -- Get candidate name and creator name for notifications
  SELECT full_name INTO v_candidate_name
  FROM profiles
  WHERE id = (SELECT user_id FROM candidate_profiles WHERE id = NEW.candidate_id LIMIT 1);
  
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = NEW.created_by;
  
  -- Create mention records and notifications for each mentioned user
  FOREACH v_mentioned_user_id IN ARRAY v_mentioned_users
  LOOP
    -- Insert mention record
    INSERT INTO note_mentions (note_id, mentioned_user_id, notified_at)
    VALUES (NEW.id, v_mentioned_user_id, now())
    ON CONFLICT (note_id, mentioned_user_id) DO NOTHING;
    
    -- Create in-app notification
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      category,
      action_url,
      metadata,
      is_read
    ) VALUES (
      v_mentioned_user_id,
      'You were mentioned in a note',
      COALESCE(v_creator_name, 'Someone') || ' mentioned you in a note about ' || COALESCE(v_candidate_name, 'a candidate'),
      'mention',
      'notes',
      '/candidate/' || NEW.candidate_id,
      jsonb_build_object(
        'note_id', NEW.id,
        'candidate_id', NEW.candidate_id,
        'created_by', NEW.created_by,
        'note_type', NEW.note_type
      ),
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger on candidate_notes
DROP TRIGGER IF EXISTS on_note_created_or_updated ON public.candidate_notes;
CREATE TRIGGER on_note_created_or_updated
  AFTER INSERT OR UPDATE OF content ON public.candidate_notes
  FOR EACH ROW
  EXECUTE FUNCTION process_note_mentions();