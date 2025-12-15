-- Ensure translations table exists
create table if not exists "public"."translations" (
    "id" uuid not null default gen_random_uuid(),
    "namespace" text not null,
    "language" text not null,
    "translations" jsonb not null default '{}'::jsonb,
    "version" integer default 1,
    "is_active" boolean default true,
    "generated_by" uuid references auth.users(id),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "reviewed_by" uuid references auth.users(id),
    "reviewed_at" timestamp with time zone,
    "generated_at" timestamp with time zone,
    primary key ("id"),
    unique ("namespace", "language", "version")
);

-- Enable RLS
alter table "public"."translations" enable row level security;

-- Policies
-- 1. Everyone can read active translations
create policy "Everyone can read active translations"
    on "public"."translations"
    for select
    using (is_active = true);

-- 2. Authenticated users (or just admins?) can insert (for seeding/generating)
-- For now, allowing authenticated users to insert to support the 'Seed' button from the frontend
create policy "Authenticated users can insert translations"
    on "public"."translations"
    for insert
    to authenticated
    with check (true);

-- 3. Authenticated users can update
create policy "Authenticated users can update translations"
    on "public"."translations"
    for update
    to authenticated
    using (true);
