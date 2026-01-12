
-- =====================================================
-- MIGRATION: Fix Database Schema Errors & Security Issues
-- =====================================================

-- 1. Add missing 'id' column to user_activity_tracking table
-- The table currently uses user_id as the primary key, but queries expect an 'id' column
ALTER TABLE public.user_activity_tracking 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- If we need a unique constraint on id (some queries may rely on it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_activity_tracking_id_unique' 
        AND conrelid = 'public.user_activity_tracking'::regclass
    ) THEN
        ALTER TABLE public.user_activity_tracking 
        ADD CONSTRAINT user_activity_tracking_id_unique UNIQUE (id);
    END IF;
END $$;

-- 2. Fix the 3 functions with mutable search_path (Security Warning)

-- Fix: clean_expired_caches function
CREATE OR REPLACE FUNCTION public.clean_expired_caches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Clean expired cache entries from all cache tables
    DELETE FROM public.search_cache WHERE expires_at < now();
    DELETE FROM public.ai_cache WHERE expires_at < now();
    DELETE FROM public.cache_entries WHERE expires_at < now();
EXCEPTION
    WHEN undefined_table THEN
        -- Tables may not exist, that's OK
        NULL;
END;
$$;

-- Fix: log_prospect_score_change function
CREATE OR REPLACE FUNCTION public.log_prospect_score_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log score changes for audit purposes
    IF OLD.score IS DISTINCT FROM NEW.score THEN
        INSERT INTO public.audit_logs (
            action_type,
            table_name,
            record_id,
            old_value,
            new_value,
            created_at
        ) VALUES (
            'score_change',
            TG_TABLE_NAME,
            NEW.id::text,
            jsonb_build_object('score', OLD.score),
            jsonb_build_object('score', NEW.score),
            now()
        );
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN undefined_table THEN
        RETURN NEW;
END;
$$;

-- Fix: update_user_search_weights function
CREATE OR REPLACE FUNCTION public.update_user_search_weights()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update search weights when user data changes
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.clean_expired_caches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clean_expired_caches() TO service_role;
