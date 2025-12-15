-- Add ML fields to crm_prospects
alter table "public"."crm_prospects" 
add column "predicted_win_probability" numeric check (predicted_win_probability >= 0 and predicted_win_probability <= 100),
add column "velocity_score" numeric default 0, -- Interactions per week (normalized)
add column "last_interaction_delta_hours" numeric default 0; -- Hours since last activity

-- Index for querying high probability deals
create index "idx_crm_prospects_win_prob" on "public"."crm_prospects" ("predicted_win_probability" desc);
