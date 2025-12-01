-- Create virtual_backgrounds table for storing custom background images
CREATE TABLE IF NOT EXISTS virtual_backgrounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE virtual_backgrounds ENABLE ROW LEVEL SECURITY;

-- Users can view their own backgrounds
CREATE POLICY "Users can view own backgrounds"
  ON virtual_backgrounds
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own backgrounds
CREATE POLICY "Users can insert own backgrounds"
  ON virtual_backgrounds
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own backgrounds
CREATE POLICY "Users can update own backgrounds"
  ON virtual_backgrounds
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own backgrounds
CREATE POLICY "Users can delete own backgrounds"
  ON virtual_backgrounds
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX virtual_backgrounds_user_id_idx ON virtual_backgrounds(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_virtual_backgrounds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER virtual_backgrounds_updated_at
  BEFORE UPDATE ON virtual_backgrounds
  FOR EACH ROW
  EXECUTE FUNCTION update_virtual_backgrounds_updated_at();
