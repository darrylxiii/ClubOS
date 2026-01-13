-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Add appearance columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'background_enabled') THEN
    ALTER TABLE public.user_preferences ADD COLUMN background_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'background_type') THEN
    ALTER TABLE public.user_preferences ADD COLUMN background_type text DEFAULT 'video';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'background_value') THEN
    ALTER TABLE public.user_preferences ADD COLUMN background_value text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'background_blur_enabled') THEN
    ALTER TABLE public.user_preferences ADD COLUMN background_blur_enabled boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'background_blur_intensity') THEN
    ALTER TABLE public.user_preferences ADD COLUMN background_blur_intensity integer DEFAULT 24;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'overlay_color') THEN
    ALTER TABLE public.user_preferences ADD COLUMN overlay_color text DEFAULT 'hsl(var(--background))';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'overlay_opacity') THEN
    ALTER TABLE public.user_preferences ADD COLUMN overlay_opacity integer DEFAULT 60;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'apply_to_all_pages') THEN
    ALTER TABLE public.user_preferences ADD COLUMN apply_to_all_pages boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'accent_color') THEN
    ALTER TABLE public.user_preferences ADD COLUMN accent_color text;
  END IF;
END $$;

-- Create appearance_presets table
CREATE TABLE IF NOT EXISTS public.appearance_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  thumbnail_url text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appearance_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Anyone can view active presets" ON public.appearance_presets;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for appearance_presets
CREATE POLICY "Anyone can view active presets"
  ON public.appearance_presets FOR SELECT
  USING (is_active = true);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_appearance_presets_category ON public.appearance_presets(category);
CREATE INDEX IF NOT EXISTS idx_appearance_presets_active ON public.appearance_presets(is_active);

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;

CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_preferences_updated_at();

-- Insert presets
INSERT INTO public.appearance_presets (category, name, image_url, display_order) VALUES
  ('landscape', 'Mountain Sunrise', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', 1),
  ('landscape', 'Ocean Waves', 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80', 2),
  ('landscape', 'Forest Path', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80', 3),
  ('abstract', 'Purple Gradient', 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80', 4),
  ('abstract', 'Blue Waves', 'https://images.unsplash.com/photo-1557672199-6074de232fff?w=1920&q=80', 5),
  ('gradient', 'Sunset Gradient', 'https://images.unsplash.com/photo-1557672175-d0f177e8e2d0?w=1920&q=80', 6)
ON CONFLICT DO NOTHING;