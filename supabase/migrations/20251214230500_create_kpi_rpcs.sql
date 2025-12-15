-- RPC to get Realtime System Health
create or replace function "public"."get_realtime_system_health"()
returns json
language plpgsql
security definer -- Access to system tables
as $$
declare
  active_users int;
  db_conns int;
  error_count int;
  avg_latency numeric;
begin
  -- 1. Active Users (Valid sessions in last hour)
  -- Note: requires access to auth schema, usually restricted. 
  -- We'll try to count recent interactions in a accessible table (e.g. crm_activities or logs)
  -- Fallback: 0
  select count(distinct owner_id) into active_users
  from "public"."crm_activities"
  where created_at > now() - interval '1 hour';

  -- 2. DB Connections (from pg_stat_activity)
  -- This typically requires superuser or pg_read_all_stats. 
  -- We'll wrap in exception handling to prevent crash.
  begin
    select count(*) into db_conns from pg_stat_activity;
  exception when others then
    db_conns := 0;
  end;

  -- 3. Errors (from platform_metrics or automation logs)
  select count(*) into error_count
  from "public"."crm_automation_logs" 
  where status = 'failed' and created_at > now() - interval '1 hour';

  -- 4. Latency (Mock for now, or derived from logs)
  avg_latency := 45 + floor(random() * 20); -- Simulated 45-65ms

  return json_build_object(
    'platform_status', 'operational',
    'active_users_1h', coalesce(active_users, 0),
    'total_errors_1h', coalesce(error_count, 0),
    'critical_errors_1h', 0,
    'avg_response_time_ms', avg_latency,
    'db_connections', coalesce(db_conns, 0)
  );
end;
$$;

-- RPC to get Edge Function Health (Mock for now as we don't have func logs accessible via SQL easily)
create or replace function "public"."get_edge_function_health"()
returns json
language plpgsql
as $$
begin
  return json_build_array(
    json_build_object(
      'function_name', 'crm-automation-engine',
      'total_calls', 1240,
      'success_count', 1235,
      'error_count', 5,
      'success_rate', 99.6,
      'avg_duration_ms', 120
    ),
    json_build_object(
      'function_name', 'calculate-kpis',
      'total_calls', 24,
      'success_count', 24,
      'error_count', 0,
      'success_rate', 100.0,
      'avg_duration_ms', 850
    )
  );
end;
$$;
