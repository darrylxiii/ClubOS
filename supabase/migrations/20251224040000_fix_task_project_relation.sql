-- Add project_id to unified_tasks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unified_tasks' AND column_name = 'project_id') THEN
        ALTER TABLE "public"."unified_tasks" ADD COLUMN "project_id" uuid REFERENCES "public"."marketplace_projects"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS "unified_tasks_project_id_idx" ON "public"."unified_tasks"("project_id");

-- Force schema reload
NOTIFY pgrst, 'reload schema';
