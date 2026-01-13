-- Ensure RLS is enabled
ALTER TABLE public.booking_availability_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own settings" ON public.booking_availability_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.booking_availability_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.booking_availability_settings;
DROP POLICY IF EXISTS "Public can view settings for booking links" ON public.booking_availability_settings;

-- Recreate RLS Policies
CREATE POLICY "Users can view their own settings"
  ON public.booking_availability_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.booking_availability_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.booking_availability_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view settings for booking links"
  ON public.booking_availability_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_links
      WHERE booking_links.user_id = booking_availability_settings.user_id
      AND booking_links.is_active = true
    )
  );

-- Populate defaults for users with booking links
INSERT INTO public.booking_availability_settings (user_id)
SELECT DISTINCT user_id
FROM public.booking_links
WHERE user_id NOT IN (SELECT user_id FROM public.booking_availability_settings)
ON CONFLICT (user_id) DO NOTHING;