-- Create audit_events table
create table if not exists public.audit_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  event_type text not null,
  actor_id uuid references auth.users(id),
  actor_email text,
  actor_role text,
  resource_type text,
  resource_id text,
  action text not null,
  result text not null,
  ip_address text,
  user_agent text,
  metadata jsonb default '{}'::jsonb
);

-- RLS
alter table public.audit_events enable row level security;

create policy "Admins can view all audit logs"
  on public.audit_events for select
  using (
    auth.uid() in (
      select id from public.profiles 
      where role in ('admin', 'super_admin')
    )
  );

-- Indexes
create index if not exists idx_audit_created_at on public.audit_events(created_at desc);
create index if not exists idx_audit_event_type on public.audit_events(event_type);
create index if not exists idx_audit_actor_email on public.audit_events(actor_email);

-- Insert some dummy data for demonstration
insert into public.audit_events (event_type, actor_email, actor_role, action, result, ip_address, created_at)
values 
('login', 'admin@thequantumclub.org', 'super_admin', 'user.login', 'success', '192.168.1.1', now() - interval '2 minutes'),
('data_access', 'system', 'service_role', 'backup.daily', 'success', '10.0.0.1', now() - interval '1 hour'),
('security_alert', 'unknown', null, 'login.attempt', 'failed', '45.33.22.11', now() - interval '3 hours'),
('role_change', 'admin@thequantumclub.org', 'super_admin', 'user.promote', 'success', '192.168.1.1', now() - interval '1 day');
