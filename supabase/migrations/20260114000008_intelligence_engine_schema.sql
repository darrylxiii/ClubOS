-- Add Intelligence Fields to crm_prospects

ALTER TABLE "public"."crm_prospects" 
ADD COLUMN IF NOT EXISTS "health_score" integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS "health_trend" text DEFAULT 'stable' CHECK (health_trend IN ('improving', 'declining', 'stable')),
ADD COLUMN IF NOT EXISTS "last_enriched_at" timestamp with time zone;

COMMENT ON COLUMN "public"."crm_prospects"."health_score" IS 'Calculated relationship health score (0-100)';
COMMENT ON COLUMN "public"."crm_prospects"."health_trend" IS 'Trend direction: improving, declining, or stable';

-- Add index for querying high-value/at-risk prospects
CREATE INDEX IF NOT EXISTS "idx_crm_prospects_health_score" ON "public"."crm_prospects" ("health_score");
