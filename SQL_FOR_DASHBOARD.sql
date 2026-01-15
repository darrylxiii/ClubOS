-- Copy and Run this in your Supabase Dashboard SQL Editor
-- Link: https://supabase.com/dashboard/project/dpjucecmoyfzrduhlctt/sql

-- 1. Backup Verification Logs
create table if not exists public.backup_verification_logs (
    id uuid primary key default uuid_generate_v4(),
    timestamp timestamptz not null default now(),
    backup_id text not null,
    verification_status text check (verification_status in ('success', 'failed', 'partial')),
    tables_verified integer not null default 0,
    total_tables integer not null default 0,
    verification_duration_ms integer,
    issues text[] default array[]::text[],
    tier_results jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- 2. PITR Test Markers (for verifying recovery)
create table if not exists public.pitr_test_markers (
    id uuid primary key default uuid_generate_v4(),
    test_id text not null,
    marker_value text not null,
    created_at timestamptz default now()
);

-- 3. PITR Test Logs
create table if not exists public.pitr_test_logs (
    id uuid primary key default uuid_generate_v4(),
    test_id text not null,
    timestamp timestamptz not null default now(),
    target_recovery_time timestamptz,
    test_status text check (test_status in ('success', 'failed')),
    recovery_accuracy float default 0,
    duration_seconds float,
    data_loss_detected boolean default false,
    notes text[] default array[]::text[],
    created_at timestamptz default now()
);

-- 4. Platform Alerts (Centralized alerting)
create table if not exists public.platform_alerts (
    id uuid primary key default uuid_generate_v4(),
    alert_type text not null,
    severity text check (severity in ('info', 'warning', 'error', 'critical')),
    message text not null,
    metadata jsonb default '{}'::jsonb,
    acknowledged boolean default false,
    acknowledged_at timestamptz,
    acknowledged_by uuid references auth.users(id),
    created_at timestamptz default now()
);

-- 5. Enable RLS
alter table public.backup_verification_logs enable row level security;
alter table public.pitr_test_logs enable row level security;
alter table public.platform_alerts enable row level security;

-- 6. RLS Policies (Allow Authenticated Users to Read/Write for Dashboard usage)
create policy "Allow all for authenticated users" on public.backup_verification_logs for all to authenticated using (true);
create policy "Allow all for authenticated users" on public.pitr_test_logs for all to authenticated using (true);
create policy "Allow all for authenticated users" on public.platform_alerts for all to authenticated using (true);
create policy "Allow all for authenticated users" on public.pitr_test_markers for all to authenticated using (true);
