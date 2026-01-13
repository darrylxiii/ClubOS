create table "public"."crm_settings" (
  "id" uuid not null default gen_random_uuid(),
  "monthly_revenue_target" numeric not null default 100000,
  "default_currency" text not null default 'USD',
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  constraint "crm_settings_pkey" primary key ("id")
);

-- Ensure only one row can exist (Singleton Pattern)
create unique index "crm_settings_singleton_idx" on "public"."crm_settings" ((true));

-- Add RLS policies
alter table "public"."crm_settings" enable row level security;

create policy "Enable read access for authenticated users" on "public"."crm_settings"
  for select using (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on "public"."crm_settings"
  for update using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on "public"."crm_settings"
  for insert with check (auth.role() = 'authenticated');

-- Initialize default settings if not exists
insert into "public"."crm_settings" ("monthly_revenue_target", "default_currency")
values (100000, 'USD')
on conflict do nothing;
