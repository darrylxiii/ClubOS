-- Add project_id to unified_tasks
ALTER TABLE "public"."unified_tasks"
ADD COLUMN "project_id" uuid NULL REFERENCES "public"."marketplace_projects"("id") ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX "unified_tasks_project_id_idx" ON "public"."unified_tasks"("project_id");
