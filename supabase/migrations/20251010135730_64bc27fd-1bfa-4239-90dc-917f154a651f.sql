-- Create table for temporary profile share links
CREATE TABLE public.profile_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.profile_share_links ENABLE ROW LEVEL SECURITY;

-- Users can create their own share links
CREATE POLICY "Users can create their own share links"
  ON public.profile_share_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own share links
CREATE POLICY "Users can view their own share links"
  ON public.profile_share_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own share links
CREATE POLICY "Users can delete their own share links"
  ON public.profile_share_links
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Anyone can view valid share links (for token lookup)
CREATE POLICY "Anyone can view valid share links"
  ON public.profile_share_links
  FOR SELECT
  TO anon, authenticated
  USING (expires_at > NOW());

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(16), 'base64');
    new_token := replace(replace(replace(new_token, '/', '_'), '+', '-'), '=', '');
    
    SELECT EXISTS(SELECT 1 FROM public.profile_share_links WHERE token = new_token) INTO token_exists;
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;

-- Function to track share link views
CREATE OR REPLACE FUNCTION public.track_share_link_view(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_user_id UUID;
BEGIN
  UPDATE public.profile_share_links
  SET view_count = view_count + 1,
      last_viewed_at = NOW()
  WHERE token = _token
    AND expires_at > NOW()
  RETURNING user_id INTO link_user_id;
  
  RETURN link_user_id;
END;
$$;

-- Index for faster token lookup
CREATE INDEX idx_profile_share_links_token ON public.profile_share_links(token);
CREATE INDEX idx_profile_share_links_expires ON public.profile_share_links(expires_at);