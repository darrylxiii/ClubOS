-- Fix security definer view by using security_invoker
DROP VIEW IF EXISTS public.interview_pipeline_metrics;
CREATE VIEW public.interview_pipeline_metrics 
WITH (security_invoker = true)
AS
SELECT 
  m.job_id,
  m.interview_stage,
  COUNT(DISTINCT m.id) as total_interviews,
  COUNT(DISTINCT CASE WHEN cs.recommendation IN ('yes', 'strong_yes') THEN m.id END) as positive_outcomes,
  COUNT(DISTINCT CASE WHEN cs.recommendation IN ('no', 'strong_no') THEN m.id END) as negative_outcomes,
  AVG(cs.overall_rating) as avg_rating,
  COUNT(DISTINCT m.candidate_id) as unique_candidates
FROM public.meetings m
LEFT JOIN public.candidate_scorecards cs ON cs.meeting_id = m.id AND cs.status = 'submitted'
WHERE m.meeting_type = 'interview'
GROUP BY m.job_id, m.interview_stage;