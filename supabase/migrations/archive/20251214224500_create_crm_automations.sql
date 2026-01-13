create table "public"."crm_automations" (
  "id" uuid not null default gen_random_uuid(),
  "name" text not null,
  "description" text,
  "trigger_type" text not null, -- 'stage_change', 'no_activity', 'score_threshold'
  "trigger_config" jsonb not null default '{}'::jsonb,
  "actions" jsonb[] not null default '{}'::jsonb[],
  "is_active" boolean not null default false,
  "owner_id" uuid references auth.users(id),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "last_run_at" timestamp with time zone,
  "run_count" integer not null default 0,
  constraint "crm_automations_pkey" primary key ("id")
);

create table "public"."crm_automation_logs" (
  "id" uuid not null default gen_random_uuid(),
  "automation_id" uuid references "public"."crm_automations"("id") on delete cascade,
  "status" text not null, -- 'success', 'failed', 'running'
  "triggered_by_record_id" uuid,
  "details" jsonb,
  "created_at" timestamp with time zone not null default now(),
  constraint "crm_automation_logs_pkey" primary key ("id")
);

-- Add indexes
create index "crm_automation_logs_automation_id_idx" on "public"."crm_automation_logs" ("automation_id");
create index "crm_automations_trigger_type_idx" on "public"."crm_automations" ("trigger_type");

-- Add RLS policies
alter table "public"."crm_automations" enable row level security;
alter table "public"."crm_automation_logs" enable row level security;

create policy "Enable read access for authenticated users" on "public"."crm_automations"
  for select using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on "public"."crm_automations"
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on "public"."crm_automations"
  for update using (auth.role() = 'authenticated');

create policy "Enable delete access for authenticated users" on "public"."crm_automations"
  for delete using (auth.role() = 'authenticated');

create policy "Enable read access for authenticated users" on "public"."crm_automation_logs"
  for select using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on "public"."crm_automation_logs"
  for insert with check (auth.role() = 'authenticated');
