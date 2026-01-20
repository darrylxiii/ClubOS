-- Create task_activity_log table
CREATE TABLE IF NOT EXISTS "public"."task_activity_log" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "task_id" uuid REFERENCES "public"."unified_tasks"("id") ON DELETE CASCADE NOT NULL,
    "user_id" uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "action_type" text NOT NULL, -- e.g., 'status_change', 'comment_added', 'assignee_added'
    "details" jsonb DEFAULT '{}'::jsonb, -- Store flexible details like { "from": "pending", "to": "in_progress" }
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS "task_activity_log_task_id_idx" ON "public"."task_activity_log"("task_id");

-- Enable RLS
ALTER TABLE "public"."task_activity_log" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view activity for tasks they have access to" 
ON "public"."task_activity_log" 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "public"."unified_tasks" t
    WHERE t.id = task_activity_log.task_id
    -- Add your specific task access logic here if needed, generic for now
  )
);

CREATE POLICY "Users can create activity logs" 
ON "public"."task_activity_log" 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
