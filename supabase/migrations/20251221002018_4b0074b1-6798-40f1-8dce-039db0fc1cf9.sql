-- Add quality tracking columns to translations table
ALTER TABLE public.translations 
ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS translation_provider TEXT DEFAULT NULL;

-- Create index for quality status queries
CREATE INDEX IF NOT EXISTS idx_translations_quality_status ON public.translations(quality_status);

-- Create index for provider queries
CREATE INDEX IF NOT EXISTS idx_translations_provider ON public.translations(translation_provider);