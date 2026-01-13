-- Add parent_task_id for subtasks
ALTER TABLE "public"."unified_tasks"
ADD COLUMN "parent_task_id" uuid NULL REFERENCES "public"."unified_tasks"("id") ON DELETE CASCADE;

-- Create index for parent_task_id
CREATE INDEX "unified_tasks_parent_task_id_idx" ON "public"."unified_tasks"("parent_task_id");

-- Create task_comments table
CREATE TABLE "public"."task_comments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "task_id" uuid NOT NULL REFERENCES "public"."unified_tasks"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Add indexes for task_comments
CREATE INDEX "task_comments_task_id_idx" ON "public"."task_comments"("task_id");
CREATE INDEX "task_comments_user_id_idx" ON "public"."task_comments"("user_id");

-- Enable RLS on task_comments
ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;

-- Add policies for task_comments (Open for now based on app pattern, can restrict later)
CREATE POLICY "Enable read access for authenticated users" ON "public"."task_comments"
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON "public"."task_comments"
AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for users who created the comment" ON "public"."task_comments"
AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Enable delete access for users who created the comment" ON "public"."task_comments"
AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
