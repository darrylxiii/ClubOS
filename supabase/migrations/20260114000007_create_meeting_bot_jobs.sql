-- Create enum for bot job status
create type meeting_bot_job_status as enum ('pending', 'provisioning', 'joining', 'recording', 'uploading', 'completed', 'failed');

-- Create the table for tracking bot jobs
create table if not exists public.meeting_bot_jobs (
    id uuid not null default gen_random_uuid(),
    meeting_id uuid references public.meetings(id) on delete cascade,
    target_url text not null,
    bot_name text default 'Scout',
    status meeting_bot_job_status not null default 'pending',
    recording_path text,
    logs jsonb default '[]'::jsonb,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    created_by uuid references auth.users(id) default auth.uid(),
    
    constraint meeting_bot_jobs_pkey primary key (id)
);

-- Enable RLS
alter table public.meeting_bot_jobs enable row level security;

-- Policy: Users can view/manage their own bot jobs
create policy "Users can view their own bot jobs"
    on public.meeting_bot_jobs for select
    using (auth.uid() = created_by);

create policy "Users can insert their own bot jobs"
    on public.meeting_bot_jobs for insert
    with check (auth.uid() = created_by);

create policy "Users can update their own bot jobs"
    on public.meeting_bot_jobs for update
    using (auth.uid() = created_by);

-- Trigger to update updated_at
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on public.meeting_bot_jobs
  for each row execute procedure moddatetime (updated_at);
