

# Fix: Decline Error and Email Dump Failure

## Root Cause (Both Issues)

Both failures share a single root cause: the `generate_partner_smart_alerts()` database trigger function.

This trigger fires on **every INSERT and UPDATE** to the `applications` table. It tries to insert into `partner_smart_alerts` using four columns that do not exist on the table:

- `description` (table has `message` instead)
- `priority` (does not exist)
- `entity_type` (does not exist)
- `entity_id` (does not exist)

This causes a `column does not exist` error that rolls back the entire transaction:

- **Decline**: Updates application status to `rejected` -- trigger fires -- fails -- rollback
- **Email dump import**: Inserts new applications -- trigger fires -- fails -- rollback

The database logs confirm this:
```
ERROR: column "description" of relation "partner_smart_alerts" does not exist
```

## Fix

### Database Migration: Fix `generate_partner_smart_alerts()` function

Update the function to use the correct column names that actually exist on the `partner_smart_alerts` table:

| Trigger uses (wrong) | Table has (correct) |
|---|---|
| `description` | `message` |
| `priority` | `severity` |
| `entity_type` | stored in `metadata` |
| `entity_id` | stored in `metadata` |

The corrected function will:
1. Use `message` instead of `description`
2. Use `severity` instead of `priority`
3. Store `entity_type` and `entity_id` inside the existing `metadata` JSONB column
4. Add a safety check so it never crashes the parent transaction (wrap in exception handler)

```sql
CREATE OR REPLACE FUNCTION generate_partner_smart_alerts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_id uuid;
  v_job_title text;
  v_days_in_stage integer;
BEGIN
  SELECT j.company_id, j.title
  INTO v_company_id, v_job_title
  FROM jobs j WHERE j.id = NEW.job_id;

  IF v_company_id IS NULL THEN RETURN NEW; END IF;

  v_days_in_stage := EXTRACT(DAY FROM
    (NOW() - COALESCE(NEW.stage_updated_at, NEW.updated_at)));

  IF v_days_in_stage > 7 THEN
    INSERT INTO partner_smart_alerts (
      company_id, alert_type, title, message, severity, metadata
    ) VALUES (
      v_company_id,
      'stale_candidate',
      'Candidate awaiting action',
      format('Candidate has been in current stage for %s days', v_days_in_stage),
      CASE WHEN v_days_in_stage > 14 THEN 'high' ELSE 'medium' END,
      jsonb_build_object('entity_type','application','entity_id',NEW.id)
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'generate_partner_smart_alerts failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
```

The `EXCEPTION WHEN OTHERS` block ensures that even if unexpected issues arise in the future, this trigger will never block the primary application operation (decline, advance, import, etc.).

## No Code Changes Needed

The front-end code for both decline (`EnhancedCandidateActionDialog.tsx`) and email dump import (`ExtractedCandidatesPreview.tsx`) is correct. The error originates entirely in the database trigger. Once the migration is applied, both features will work immediately.

## Risk

Very low. This is a single function fix. The trigger's purpose (generating stale-candidate alerts) is non-critical and already fires silently. Adding the exception handler makes it resilient to any future schema drift.

