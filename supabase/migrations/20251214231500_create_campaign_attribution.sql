-- Campaign Performance View (Attribution Engine)
create or replace view "public"."campaign_performance" as
select
  c.id as campaign_id,
  c.name as campaign_name,
  c.source,
  count(p.id) as total_leads,
  count(p.id) filter (where p.stage = 'qualified') as qualified_leads,
  count(p.id) filter (where p.stage = 'won') as won_deals,
  COALESCE(sum(p.deal_value) filter (where p.stage = 'won'), 0) as total_revenue,
  COALESCE(sum(p.deal_value) filter (where p.stage not in ('won', 'lost', 'closed_lost')), 0) as pipeline_value,
  max(p.updated_at) as last_activity
from
  "public"."crm_campaigns" c
left join
  "public"."crm_prospects" p on c.id = p.campaign_id
group by
  c.id, c.name, c.source;

-- RLS (Allow authenticated to view)
-- Views verify against underlying tables, but we can't Add Policy to a View directly in standard PostgREST usage easily without `security_invoker`.
-- However, for simplicity here, we ensure permissions are granted.
grant select on "public"."campaign_performance" to authenticated;
grant select on "public"."campaign_performance" to service_role;
