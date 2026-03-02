
-- Create avatar_social_targets table
CREATE TABLE public.avatar_social_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.linkedin_avatar_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'reddit', 'instagram')),
  platform_handle text,
  platform_url text,
  weekly_target integer NOT NULL DEFAULT 3,
  weekly_posts_done integer NOT NULL DEFAULT 0,
  weekly_reset_at timestamptz NOT NULL DEFAULT now(),
  responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, platform)
);

-- Enable RLS
ALTER TABLE public.avatar_social_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies: same pattern as linkedin_avatar_accounts (authenticated users can CRUD)
CREATE POLICY "Authenticated users can view social targets"
  ON public.avatar_social_targets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert social targets"
  ON public.avatar_social_targets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update social targets"
  ON public.avatar_social_targets FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete social targets"
  ON public.avatar_social_targets FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_avatar_social_targets_updated_at
  BEFORE UPDATE ON public.avatar_social_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create/update task on responsible_user_id change
CREATE OR REPLACE FUNCTION public.handle_social_target_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
  v_account_label text;
  v_platform_display text;
  v_task_title text;
  v_task_number text;
  v_next_monday timestamptz;
BEGIN
  -- Only proceed if responsible_user_id is set
  IF NEW.responsible_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if responsible_user_id didn't change on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.responsible_user_id IS NOT DISTINCT FROM NEW.responsible_user_id THEN
    RETURN NEW;
  END IF;

  -- Get account label
  SELECT label INTO v_account_label
    FROM public.linkedin_avatar_accounts WHERE id = NEW.account_id;

  -- Platform display name
  v_platform_display := CASE NEW.platform
    WHEN 'linkedin' THEN 'LinkedIn'
    WHEN 'twitter' THEN 'Twitter/X'
    WHEN 'reddit' THEN 'Reddit'
    WHEN 'instagram' THEN 'Instagram'
    ELSE NEW.platform
  END;

  -- Find the user's personal board
  SELECT id INTO v_board_id
    FROM public.task_boards
    WHERE owner_id = NEW.responsible_user_id AND visibility = 'personal'
    LIMIT 1;

  -- If no personal board found, skip task creation
  IF v_board_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build task title
  v_task_title := 'Social: Post on ' || v_platform_display || ' for ' || COALESCE(v_account_label, 'Unknown') || ' (' || NEW.weekly_posts_done || '/' || NEW.weekly_target || ')';

  -- Calculate next Monday
  v_next_monday := date_trunc('week', now() + interval '7 days');

  -- Generate task number
  v_task_number := 'SOC-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create the task
  INSERT INTO public.unified_tasks (
    title, task_type, board_id, user_id, created_by, status, priority,
    due_date, tags, task_number, description
  ) VALUES (
    v_task_title, 'social_posting', v_board_id,
    NEW.responsible_user_id, NEW.responsible_user_id,
    'pending', 'medium',
    v_next_monday,
    jsonb_build_array('social', NEW.platform, COALESCE(v_account_label, 'unknown')),
    v_task_number,
    'Weekly social posting target for ' || v_platform_display || '. Target: ' || NEW.weekly_target || ' posts/week.'
  );

  RETURN NEW;
END;
$$;

-- Trigger for task creation
CREATE TRIGGER on_social_target_responsible_change
  AFTER INSERT OR UPDATE ON public.avatar_social_targets
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_target_task();

-- Function to update task when posts are logged
CREATE OR REPLACE FUNCTION public.handle_social_post_logged()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_label text;
  v_platform_display text;
  v_task_title text;
BEGIN
  -- Only fire when weekly_posts_done changes
  IF OLD.weekly_posts_done IS NOT DISTINCT FROM NEW.weekly_posts_done THEN
    RETURN NEW;
  END IF;

  IF NEW.responsible_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT label INTO v_account_label
    FROM public.linkedin_avatar_accounts WHERE id = NEW.account_id;

  v_platform_display := CASE NEW.platform
    WHEN 'linkedin' THEN 'LinkedIn'
    WHEN 'twitter' THEN 'Twitter/X'
    WHEN 'reddit' THEN 'Reddit'
    WHEN 'instagram' THEN 'Instagram'
    ELSE NEW.platform
  END;

  v_task_title := 'Social: Post on ' || v_platform_display || ' for ' || COALESCE(v_account_label, 'Unknown') || ' (' || NEW.weekly_posts_done || '/' || NEW.weekly_target || ')';

  -- Update most recent matching task
  UPDATE public.unified_tasks
    SET title = v_task_title,
        status = CASE WHEN NEW.weekly_posts_done >= NEW.weekly_target THEN 'done' ELSE status END,
        completed_at = CASE WHEN NEW.weekly_posts_done >= NEW.weekly_target AND completed_at IS NULL THEN now() ELSE completed_at END,
        updated_at = now()
    WHERE task_type = 'social_posting'
      AND user_id = NEW.responsible_user_id
      AND title LIKE '%' || v_platform_display || '%'
      AND title LIKE '%' || COALESCE(v_account_label, 'Unknown') || '%'
      AND status != 'done';

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_social_post_logged
  AFTER UPDATE ON public.avatar_social_targets
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_post_logged();
