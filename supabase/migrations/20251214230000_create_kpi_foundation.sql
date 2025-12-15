-- 1. Sales KPI Metrics
create table "public"."sales_kpi_metrics" (
  "id" uuid not null default gen_random_uuid(),
  "category" text not null, -- 'conversational', 'proposals', 'closing', etc.
  "kpi_name" text not null,
  "value" numeric not null default 0,
  "previous_value" numeric,
  "target_value" numeric,
  "threshold_warning" numeric,
  "threshold_critical" numeric,
  "trend_direction" text check (trend_direction in ('up', 'down', 'stable')),
  "trend_percentage" numeric,
  "period_type" text not null, -- 'daily', 'weekly', 'monthly'
  "period_start" timestamp with time zone,
  "period_end" timestamp with time zone,
  "rep_id" uuid references auth.users(id),
  "company_id" uuid, -- Optional relation to crm_companies if exists
  "breakdown" jsonb default '{}'::jsonb,
  "metadata" jsonb default '{}'::jsonb,
  "calculated_at" timestamp with time zone not null default now(),
  "created_at" timestamp with time zone not null default now(),
  constraint "sales_kpi_metrics_pkey" primary key ("id")
);

-- 2. General/Operations KPI Metrics
create table "public"."kpi_metrics" (
  "id" uuid not null default gen_random_uuid(),
  "category" text not null, -- 'workforce', 'financial', etc.
  "kpi_name" text not null,
  "value" numeric not null default 0,
  "previous_value" numeric,
  "period_type" text not null,
  "period_start" timestamp with time zone,
  "period_end" timestamp with time zone,
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  constraint "kpi_metrics_pkey" primary key ("id")
);

-- 3. Website KPI Metrics
create table "public"."web_kpi_metrics" (
  "id" uuid not null default gen_random_uuid(),
  "category" text not null,
  "kpi_name" text not null,
  "value" numeric,
  "target_value" numeric,
  "threshold_warning" numeric,
  "threshold_critical" numeric,
  "period_type" text not null, -- 'daily' usually
  "period_date" date not null,
  "trend_direction" text,
  "trend_percentage" numeric,
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  constraint "web_kpi_metrics_pkey" primary key ("id")
);

-- 4. Platform Metrics (System Health)
create table "public"."platform_metrics" (
  "id" uuid not null default gen_random_uuid(),
  "active_users_1h" integer default 0,
  "total_errors_1h" integer default 0,
  "critical_errors_1h" integer default 0,
  "avg_response_time_ms" numeric default 0,
  "db_connections" integer default 0,
  "recorded_at" timestamp with time zone not null default now(),
  constraint "platform_metrics_pkey" primary key ("id")
);

-- 5. Sales Proposals (New Table)
create table "public"."sales_proposals" (
  "id" uuid not null default gen_random_uuid(),
  "title" text not null,
  "proposal_value" numeric default 0,
  "final_value" numeric,
  "status" text not null default 'draft', -- 'draft', 'sent', 'accepted', 'rejected'
  "job_id" uuid, -- Optional linkage
  "company_id" uuid,
  "revision_count" integer default 0,
  "sent_at" timestamp with time zone,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "created_by" uuid references auth.users(id),
  constraint "sales_proposals_pkey" primary key ("id")
);

-- 6. Sales Conversations View (Virtual Table)
-- Aggregates emails and calls from crm_activities into a "conversation" view per prospect
create or replace view "public"."sales_conversations" as
select
  p.id as id,
  p.id as contact_id, -- Using prospect ID as contact ID
  p.company_name as company_name,
  'email' as channel, -- Defaulting to primary channel or derived from most recent activity
  max(a.created_at) as last_message_at,
  count(a.id) as message_count,
  (p.stage = 'qualified') as is_qualified,
  p.status,
  p.owner_id
from
  "public"."crm_prospects" p
left join
  "public"."crm_activities" a on p.id = a.prospect_id
where
  a.activity_type in ('email', 'call', 'meeting')
group by
  p.id, p.company_name, p.stage, p.status, p.owner_id;


-- 7. Indices for Performance
create index "idx_sales_kpi_metrics_category" on "public"."sales_kpi_metrics" ("category");
create index "idx_sales_kpi_metrics_period" on "public"."sales_kpi_metrics" ("period_type", "calculated_at");
create index "idx_web_kpi_metrics_date" on "public"."web_kpi_metrics" ("period_date");

-- 8. RLS Policies (Standard: Authenticated Read, Authenticated Write)
alter table "public"."sales_kpi_metrics" enable row level security;
alter table "public"."kpi_metrics" enable row level security;
alter table "public"."web_kpi_metrics" enable row level security;
alter table "public"."platform_metrics" enable row level security;
alter table "public"."sales_proposals" enable row level security;

-- Simple RLS: Allow everything for auth users for now (Internal Tool)
create policy "Allow all for authenticated" on "public"."sales_kpi_metrics" for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on "public"."kpi_metrics" for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on "public"."web_kpi_metrics" for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on "public"."platform_metrics" for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on "public"."sales_proposals" for all using (auth.role() = 'authenticated');
