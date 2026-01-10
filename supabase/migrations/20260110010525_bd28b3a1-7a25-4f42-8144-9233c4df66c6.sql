-- Fix remaining SECURITY DEFINER views

-- Fix employee_pipeline_value view
DROP VIEW IF EXISTS public.employee_earnings_summary CASCADE;
DROP VIEW IF EXISTS public.employee_pipeline_value CASCADE;

-- Recreate employee_pipeline_value with SECURITY INVOKER
CREATE VIEW public.employee_pipeline_value
WITH (security_invoker = true)
AS
WITH employee_applications AS (
    SELECT COALESCE(sc.user_id, a.sourced_by) AS employee_id,
        a.id AS application_id,
        a.candidate_id,
        a.job_id,
        j.company_id,
        a.status,
        a.current_stage_index AS stage,
        a.created_at AS application_date,
        j.title AS job_title,
        c.name AS company_name,
        a.candidate_full_name,
        COALESCE(NULLIF(j.job_fee_fixed, (0)::numeric),
            CASE
                WHEN (COALESCE(j.job_fee_percentage, (0)::numeric) > (0)::numeric) THEN ((j.job_fee_percentage / 100.0) * (COALESCE(j.salary_min, 75000))::numeric)
                ELSE NULL::numeric
            END, NULLIF(c.placement_fee_fixed, (0)::numeric),
            CASE
                WHEN (COALESCE(c.placement_fee_percentage, (0)::numeric) > (0)::numeric) THEN ((c.placement_fee_percentage / 100.0) * (COALESCE(j.salary_min, 75000))::numeric)
                ELSE NULL::numeric
            END, (15000)::numeric) AS potential_fee
    FROM (((applications a
        LEFT JOIN sourcing_credits sc ON ((sc.application_id = a.id)))
        LEFT JOIN jobs j ON ((j.id = a.job_id)))
        LEFT JOIN companies c ON ((c.id = j.company_id)))
    WHERE ((a.status <> ALL (ARRAY['rejected'::text, 'withdrawn'::text])) AND ((sc.user_id IS NOT NULL) OR (a.sourced_by IS NOT NULL)))
), stage_probabilities AS (
    SELECT 0 AS stage, 0.10 AS probability, 'Applied'::text AS stage_name
    UNION ALL SELECT 1, 0.25, 'Screening'::text
    UNION ALL SELECT 2, 0.50, 'Interview'::text
    UNION ALL SELECT 3, 0.80, 'Offer'::text
    UNION ALL SELECT 4, 1.00, 'Hired'::text
)
SELECT ea.employee_id,
    ea.application_id,
    ea.candidate_id,
    ea.job_id,
    ea.company_id,
    ea.status,
    ea.stage,
    COALESCE(sp.stage_name, 'Applied'::text) AS stage_name,
    ea.application_date,
    ea.job_title,
    ea.company_name,
    ea.candidate_full_name,
    ea.potential_fee,
    COALESCE(sp.probability, 0.10) AS probability,
    (ea.potential_fee * COALESCE(sp.probability, 0.10)) AS weighted_value
FROM (employee_applications ea
    LEFT JOIN stage_probabilities sp ON ((sp.stage = ea.stage)))
WHERE (ea.employee_id IS NOT NULL);

-- Recreate employee_earnings_summary with SECURITY INVOKER
CREATE VIEW public.employee_earnings_summary
WITH (security_invoker = true)
AS
SELECT employee_id,
    count(DISTINCT application_id) AS total_applications,
    count(DISTINCT CASE WHEN (status = 'hired'::text) THEN application_id ELSE NULL::uuid END) AS total_placements,
    COALESCE(sum(potential_fee), (0)::numeric) AS raw_pipeline_value,
    COALESCE(sum(weighted_value), (0)::numeric) AS weighted_pipeline_value,
    COALESCE(sum(CASE WHEN (status = 'hired'::text) THEN potential_fee ELSE (0)::numeric END), (0)::numeric) AS realized_revenue,
    count(CASE WHEN (stage = 0) THEN 1 ELSE NULL::integer END) AS stage_0_count,
    count(CASE WHEN (stage = 1) THEN 1 ELSE NULL::integer END) AS stage_1_count,
    count(CASE WHEN (stage = 2) THEN 1 ELSE NULL::integer END) AS stage_2_count,
    count(CASE WHEN (stage = 3) THEN 1 ELSE NULL::integer END) AS stage_3_count,
    count(CASE WHEN ((stage >= 4) OR (status = 'hired'::text)) THEN 1 ELSE NULL::integer END) AS stage_4_count,
    COALESCE(sum(CASE WHEN (stage = 0) THEN weighted_value ELSE (0)::numeric END), (0)::numeric) AS stage_0_value,
    COALESCE(sum(CASE WHEN (stage = 1) THEN weighted_value ELSE (0)::numeric END), (0)::numeric) AS stage_1_value,
    COALESCE(sum(CASE WHEN (stage = 2) THEN weighted_value ELSE (0)::numeric END), (0)::numeric) AS stage_2_value,
    COALESCE(sum(CASE WHEN (stage = 3) THEN weighted_value ELSE (0)::numeric END), (0)::numeric) AS stage_3_value,
    COALESCE(sum(CASE WHEN ((stage >= 4) OR (status = 'hired'::text)) THEN weighted_value ELSE (0)::numeric END), (0)::numeric) AS stage_4_value
FROM employee_pipeline_value
GROUP BY employee_id;