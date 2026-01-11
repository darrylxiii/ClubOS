-- Create Interview Sessions Table
-- Stores live interview data, logs, and AI-generated alerts
create table if not exists "public"."interview_sessions" (
  "id" uuid not null default gen_random_uuid(),
  "job_id" uuid not null references "public"."jobs"("id") on delete cascade,
  "candidate_id" uuid references "public"."people"("id") on delete set null,
  "started_at" timestamp with time zone not null default now(),
  "ended_at" timestamp with time zone,
  "transcript_log" jsonb default '[]'::jsonb, -- Array of { speaker: "me"|"candidate", text: "...", timestamp: 123 }
  "flags" jsonb default '[]'::jsonb, -- Array of { type: "alert"|"suggestion", message: "...", context: "..." }
  "status" text default 'active', -- 'active', 'completed'
  "created_at" timestamp with time zone not null default now(),
  constraint "interview_sessions_pkey" primary key ("id")
);

-- Index for finding active sessions
create index if not exists "idx_interview_sessions_active" on "public"."interview_sessions" ("status");
create index if not exists "idx_interview_sessions_candidate" on "public"."interview_sessions" ("candidate_id");

-- Enable RLS
alter table "public"."interview_sessions" enable row level security;

-- Policies (Allow all for authenticated for MVP)
create policy "Allow all for authenticated" on "public"."interview_sessions" for all using (auth.role() = 'authenticated');
