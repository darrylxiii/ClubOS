-- Seed sample OKR objectives
INSERT INTO okr_objectives (id, title, description, quarter, year, owner_id, status, progress, start_date, end_date, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Accelerate Talent Acquisition', 'Reduce time-to-hire and improve candidate quality across all roles', 'Q1', 2026, null, 'on-track', 35, '2026-01-01', '2026-03-31', now()),
  ('22222222-2222-2222-2222-222222222222', 'Enhance Client Satisfaction', 'Achieve industry-leading NPS scores and retention rates', 'Q1', 2026, null, 'on-track', 45, '2026-01-01', '2026-03-31', now()),
  ('33333333-3333-3333-3333-333333333333', 'Scale Referral Program', 'Triple referral-sourced placements through community engagement', 'Q1', 2026, null, 'at-risk', 20, '2026-01-01', '2026-03-31', now())
ON CONFLICT (id) DO NOTHING;

-- Seed sample key results
INSERT INTO okr_key_results (id, objective_id, title, description, target_value, current_value, unit, status, contribution_weight, created_at)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Reduce average time-to-hire to 21 days', 'Track days from application to offer acceptance', 21, 28, 'days', 'on-track', 0.4, now()),
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Achieve 85% offer acceptance rate', 'Measure percentage of offers accepted', 85, 78, 'percent', 'on-track', 0.3, now()),
  ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Maintain candidate NPS above 70', 'Survey candidates at key touchpoints', 70, 65, 'score', 'at-risk', 0.3, now()),
  ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Achieve client NPS of 80+', 'Quarterly client satisfaction surveys', 80, 75, 'score', 'on-track', 0.4, now()),
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Reduce average response time to 4 hours', 'First response SLA tracking', 4, 6, 'hours', 'on-track', 0.3, now()),
  ('bbbb3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '95% client retention rate', 'Annual renewal and expansion tracking', 95, 92, 'percent', 'on-track', 0.3, now()),
  ('cccc1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '500 active referrers in network', 'Members who referred in last 90 days', 500, 180, 'count', 'at-risk', 0.3, now()),
  ('cccc2222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '30% of placements from referrals', 'Referral source attribution', 30, 12, 'percent', 'at-risk', 0.4, now()),
  ('cccc3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Launch referral mobile app', 'App development milestones', 100, 40, 'percent', 'on-track', 0.3, now())
ON CONFLICT (id) DO NOTHING;

-- Seed KPI lineage metadata
INSERT INTO kpi_lineage_metadata (id, kpi_name, source_tables, source_apis, transformations, refresh_rate, dependencies, consumers, created_at)
VALUES
  ('dddd1111-1111-1111-1111-111111111111', 'time_to_hire', ARRAY['applications', 'jobs', 'application_stages'], ARRAY[]::text[], '{"steps": ["Calculate days between application and offer acceptance", "Aggregate by period", "Apply rolling average"]}', 'daily', ARRAY['applications', 'jobs'], ARRAY['executive_dashboard', 'recruitment_ops'], now()),
  ('dddd2222-2222-2222-2222-222222222222', 'offer_acceptance_rate', ARRAY['applications', 'offers'], ARRAY[]::text[], '{"steps": ["Count accepted offers", "Divide by total offers extended", "Calculate percentage"]}', 'daily', ARRAY['applications'], ARRAY['executive_dashboard', 'hiring_manager_view'], now()),
  ('dddd3333-3333-3333-3333-333333333333', 'candidate_nps', ARRAY['nps_surveys', 'profiles'], ARRAY[]::text[], '{"steps": ["Filter candidate surveys", "Calculate promoters minus detractors", "Normalize to 100 scale"]}', 'weekly', ARRAY['nps_surveys'], ARRAY['experience_dashboard', 'executive_dashboard'], now()),
  ('dddd4444-4444-4444-4444-444444444444', 'client_nps', ARRAY['nps_surveys', 'companies'], ARRAY[]::text[], '{"steps": ["Filter client surveys", "Calculate promoters minus detractors", "Normalize to 100 scale"]}', 'weekly', ARRAY['nps_surveys'], ARRAY['client_success_dashboard', 'executive_dashboard'], now()),
  ('dddd5555-5555-5555-5555-555555555555', 'pipeline_velocity', ARRAY['applications', 'application_stages', 'jobs'], ARRAY[]::text[], '{"steps": ["Track stage transitions", "Calculate average time per stage", "Sum total pipeline time"]}', 'hourly', ARRAY['applications', 'application_stages'], ARRAY['ops_dashboard', 'recruiter_view'], now()),
  ('dddd6666-6666-6666-6666-666666666666', 'referral_conversion', ARRAY['referrals', 'applications', 'placements'], ARRAY[]::text[], '{"steps": ["Match referrals to applications", "Track to placement", "Calculate conversion rate"]}', 'daily', ARRAY['referrals', 'applications'], ARRAY['referral_dashboard', 'growth_metrics'], now())
ON CONFLICT (id) DO NOTHING;

-- Seed KPI-OKR links
INSERT INTO kpi_okr_links (id, kpi_name, key_result_id, contribution_weight, created_at)
VALUES
  ('eeee1111-1111-1111-1111-111111111111', 'time_to_hire', 'aaaa1111-1111-1111-1111-111111111111', 1.0, now()),
  ('eeee2222-2222-2222-2222-222222222222', 'offer_acceptance_rate', 'aaaa2222-2222-2222-2222-222222222222', 1.0, now()),
  ('eeee3333-3333-3333-3333-333333333333', 'candidate_nps', 'aaaa3333-3333-3333-3333-333333333333', 1.0, now()),
  ('eeee4444-4444-4444-4444-444444444444', 'client_nps', 'bbbb1111-1111-1111-1111-111111111111', 1.0, now()),
  ('eeee5555-5555-5555-5555-555555555555', 'referral_conversion', 'cccc2222-2222-2222-2222-222222222222', 1.0, now())
ON CONFLICT (id) DO NOTHING;