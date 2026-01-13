-- Create Agent Matches Table
-- This table stores candidates found by the Headhunter Agent for specific jobs
create table if not exists "public"."agent_matches" (
  "id" uuid not null default gen_random_uuid(),
  "job_id" uuid not null references "public"."jobs"("id") on delete cascade,
  "candidate_id" uuid references "public"."people"("id") on delete set null, -- Optional, might be a raw match
  "match_score" numeric not null check (match_score >= 0 and match_score <= 1),
  "match_reasoning" text, -- Why the agent picked this person
  "status" text not null default 'pending_review', -- 'pending_review', 'approved', 'rejected', 'contacted'
  "metadata" jsonb default '{}'::jsonb, -- Store retrieved context/graph facts here
  "created_at" timestamp with time zone not null default now(),
  constraint "agent_matches_pkey" primary key ("id")
);

-- Index for fast lookup by job
create index if not exists "idx_agent_matches_job" on "public"."agent_matches" ("job_id");
create index if not exists "idx_agent_matches_status" on "public"."agent_matches" ("status");

-- Enable RLS
alter table "public"."agent_matches" enable row level security;

-- Policies
create policy "Allow all for authenticated" on "public"."agent_matches" for all using (auth.role() = 'authenticated');
