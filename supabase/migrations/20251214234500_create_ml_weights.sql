-- ML Feature Weights (The "Brain")
create table "public"."ml_feature_weights" (
  "feature_name" text not null, -- e.g. 'velocity_score', 'verified_email', 'source:linkedin'
  "weight_score" numeric not null, -- The coefficient (e.g. 1.25 for +25% impact)
  "confidence_score" numeric default 0, -- How sure are we?
  "last_updated_at" timestamp with time zone default now(),
  "metadata" jsonb default '{}'::jsonb, -- Store "Why?" e.g. "Based on 50 won deals"
  primary key ("feature_name")
);

-- Seed initial heuristic weights (Cold Start)
insert into "public"."ml_feature_weights" ("feature_name", "weight_score", "metadata") values
('base_bias', 20, '{"note": "Starting probability"}'),
('verified_email', 10, '{"note": "Hardcoded heuristic"}'),
('velocity_hot', 30, '{"note": "< 24h reply"}'),
('velocity_warm', 10, '{"note": "< 72h reply"}'),
('velocity_stagnant', -20, '{"note": "> 7 days no activity"}'),
('sentiment_positive', 15, '{"note": "Happy AI sentiment"}'),
('sentiment_negative', -20, '{"note": "Angry AI sentiment"}'),
('meeting_booked', 40, '{"note": "High intent signal"}');

-- RLS
alter table "public"."ml_feature_weights" enable row level security;
grant select on "public"."ml_feature_weights" to authenticated;
grant select on "public"."ml_feature_weights" to service_role;
grant all on "public"."ml_feature_weights" to service_role; -- Teacher needs write access
