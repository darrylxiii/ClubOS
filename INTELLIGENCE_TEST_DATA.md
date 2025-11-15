# Intelligence Test Data Management

## Overview
Isolated test data system for intelligence extraction flow. All test data is marked with `is_test_data: true` flag for easy identification and removal.

## Quick Commands

### 1. Seed Test Data
```bash
curl -X POST https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/seed-test-intelligence-data \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**What it creates:**
- 3 test stakeholders (CTO, VP Engineering, Head of Talent)
- 3 test interactions (meeting, email, phone call)
- Realistic business intelligence content
- All marked with `is_test_data: true`

### 2. Cleanup Test Data
```bash
curl -X POST https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/cleanup-test-intelligence-data \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**What it removes:**
- All interactions where `is_test_data = true`
- All stakeholders where `is_test_data = true`
- Orphaned insights and ML features (cascade delete)

## Database Schema Changes

Added `is_test_data` boolean column to:
- `company_interactions`
- `company_stakeholders`

This allows easy filtering and removal of test data without affecting production records.

## Full Test Flow

### Step 1: Seed Test Data
Run the seed function above. It will return interaction IDs.

### Step 2: Extract Insights (for each interaction)
```bash
curl -X POST https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/extract-interaction-insights \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"interaction_id": "INTERACTION_ID_FROM_STEP_1"}'
```

### Step 3: Calculate Stakeholder Influence
```bash
curl -X POST https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/calculate-stakeholder-influence \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company_id": "YOUR_COMPANY_ID"}'
```

### Step 4: Generate Intelligence Report
```bash
curl -X POST https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/generate-company-intelligence-report \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"company_id": "YOUR_COMPANY_ID"}'
```

### Step 5: View in Dashboard
Navigate to `/ml-dashboard` or company intelligence tab to see results.

### Step 6: Cleanup When Done
Run the cleanup function above to remove all test data.

## Safety Features

✅ **Isolated**: All test data marked with `is_test_data: true`
✅ **Reversible**: One command removes all test data
✅ **Safe**: Never touches production data (where `is_test_data IS NULL` or `false`)
✅ **Cascading**: Related records automatically cleaned up

## Checking Test Data

```sql
-- Count test interactions
SELECT COUNT(*) FROM company_interactions WHERE is_test_data = true;

-- Count test stakeholders
SELECT COUNT(*) FROM company_stakeholders WHERE is_test_data = true;

-- View test interactions
SELECT id, interaction_type, channel, occurred_at 
FROM company_interactions 
WHERE is_test_data = true;
```

## Migration Required

Run this migration to add the `is_test_data` columns:

```sql
ALTER TABLE company_interactions 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

ALTER TABLE company_stakeholders 
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_interactions_test_data 
ON company_interactions(is_test_data);

CREATE INDEX IF NOT EXISTS idx_stakeholders_test_data 
ON company_stakeholders(is_test_data);
```
