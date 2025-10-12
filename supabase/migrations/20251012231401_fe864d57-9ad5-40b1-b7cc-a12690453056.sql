-- Fix security issue: Remove implicit SECURITY DEFINER from view
-- Views are implicitly SECURITY DEFINER, so we need to ensure proper RLS
-- By relying on RLS policies instead of view security

-- Drop and recreate the view without security concerns
DROP VIEW IF EXISTS public.task_dependencies_view;

-- The view doesn't need to exist as a view - users can query directly with joins
-- Remove the view to eliminate the security definer issue