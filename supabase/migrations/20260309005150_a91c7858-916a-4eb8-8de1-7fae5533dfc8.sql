
-- Server-side atomic view count increment for meeting_dossiers
CREATE OR REPLACE FUNCTION public.increment_dossier_view_count(dossier_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE meeting_dossiers
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = dossier_id;
$$;

-- Server-side atomic view count increment for dossier_shares
CREATE OR REPLACE FUNCTION public.increment_dossier_share_view_count(share_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE dossier_shares
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = share_id;
$$;
